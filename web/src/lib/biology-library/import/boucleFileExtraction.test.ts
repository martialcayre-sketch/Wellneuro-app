import { describe, expect, it, vi } from 'vitest';

import { ATTENTE_FILE_VIDE_MS, boucleFileExtraction, INTERVALLE_FANTOMES_MS, type DependancesBoucle } from './boucleFileExtraction';
import type { IssueTraitement } from './fileExtraction';

// La boucle du processus de fond, jouée sur une horloge simulée : `attendre`
// avance l'horloge, `traiter` aussi quand on lui donne une durée. Aucune base,
// aucun fournisseur.

type Banc = {
  deps: DependancesBoucle;
  horloge: { t: number };
  journal: { log: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
};

function banc(opts: {
  tours: number;
  traiter?: (n: number, horloge: { t: number }) => Promise<IssueTraitement>;
  reconcilier?: () => Promise<number>;
  signaler?: () => Promise<unknown>;
  arretPendantLeTour?: number;
}): Banc {
  const horloge = { t: 0 };
  let tour = 0;
  let arret = false;
  const journal = { log: vi.fn(), error: vi.fn() };
  const deps: DependancesBoucle = {
    estArrete: () => arret || tour >= opts.tours,
    maintenant: () => horloge.t,
    attendre: vi.fn(async (ms: number) => {
      horloge.t += ms;
    }),
    reconcilier: vi.fn(opts.reconcilier ?? (async () => 0)),
    signaler: vi.fn(opts.signaler ?? (async () => true)),
    traiter: vi.fn(async () => {
      tour += 1;
      if (opts.arretPendantLeTour === tour) arret = true;
      return opts.traiter ? opts.traiter(tour, horloge) : { issue: 'vide' as const };
    }),
    journal,
  };
  return { deps, horloge, journal };
}

const LU: IssueTraitement = { issue: 'lu', tentative: 1, statut: 'extrait', termine: true };

describe('boucleFileExtraction', () => {
  it('le premier tour balaie les fantômes et signale la vie, puis réclame ; la file vide, il attend 2 s', async () => {
    const { deps, journal } = banc({ tours: 1 });
    await boucleFileExtraction(deps);
    expect(deps.reconcilier).toHaveBeenCalledTimes(1);
    expect(deps.signaler).toHaveBeenCalledTimes(1);
    expect(deps.traiter).toHaveBeenCalledTimes(1);
    expect(deps.attendre).not.toHaveBeenCalled(); // arrêté après ce tour : il rend la main sans attendre
    expect(journal.log.mock.calls.map(c => c[0])).toEqual(['[bio-ingest file] démarré', '[bio-ingest file] arrêté']);
  });

  it('sur file vide, chaque tour attend 2 s ; le balayage revient toutes les minutes, pas à chaque tour', async () => {
    // 61 tours à 2 s : t = 0, 2, …, 120 s → balayages à 0, 60 et 120 s.
    const { deps } = banc({ tours: 61 });
    await boucleFileExtraction(deps);
    expect(deps.attendre).toHaveBeenCalledTimes(60);
    expect(vi.mocked(deps.attendre).mock.calls.every(([ms]) => ms === ATTENTE_FILE_VIDE_MS)).toBe(true);
    expect(deps.reconcilier).toHaveBeenCalledTimes(3);
    expect(deps.signaler).toHaveBeenCalledTimes(3);
  });

  it('une file pleine s’enchaîne sans attente, et l’issue est journalisée sans identifiant', async () => {
    const { deps, journal } = banc({ tours: 3, traiter: async () => LU });
    await boucleFileExtraction(deps);
    expect(deps.attendre).not.toHaveBeenCalled();
    expect(journal.log).toHaveBeenCalledWith(`[bio-ingest file] ${JSON.stringify(LU)}`);
  });

  it('une lecture longue retarde le balayage jusqu’à la fin du tour ; une file pleine rapide ne balaie qu’une fois par minute', async () => {
    // Tours de 10 s sans attente : t = 0, 10, …, 110 s → balayages à 0 et 60 s.
    const rapide = banc({
      tours: 12,
      traiter: async (_n, horloge) => {
        horloge.t += 10_000;
        return LU;
      },
    });
    await boucleFileExtraction(rapide.deps);
    expect(rapide.deps.reconcilier).toHaveBeenCalledTimes(2);
    // Le tour 1 dure 6 min (réservation) : un seul balayage pendant, le suivant au tour 2.
    const longue = banc({
      tours: 2,
      traiter: async (n, horloge) => {
        if (n === 1) horloge.t += 6 * 60_000;
        return LU;
      },
    });
    await boucleFileExtraction(longue.deps);
    expect(longue.deps.reconcilier).toHaveBeenCalledTimes(2);
    expect(INTERVALLE_FANTOMES_MS).toBe(60_000);
  });

  it('des fantômes clos sont comptés au journal', async () => {
    const { deps, journal } = banc({ tours: 1, reconcilier: async () => 2 });
    await boucleFileExtraction(deps);
    expect(journal.log).toHaveBeenCalledWith('[bio-ingest file] fantômes clos : 2');
  });

  it('un balayage qui lève ne signale PAS la vie, est journalisé, et la boucle continue', async () => {
    const { deps, journal } = banc({
      tours: 2,
      reconcilier: async () => {
        throw Object.assign(new Error('base coupée'), { code: 'P1001' });
      },
    });
    await boucleFileExtraction(deps);
    expect(deps.signaler).not.toHaveBeenCalled();
    expect(deps.traiter).toHaveBeenCalledTimes(2);
    expect(journal.error.mock.calls[0][0]).toBe('[bio-ingest file] balayage des fantômes :');
  });

  it('un tour qui lève est journalisé, la boucle attend 2 s puis réclame à nouveau', async () => {
    const { deps, journal } = banc({
      tours: 2,
      traiter: async n => {
        if (n === 1) throw new Error('réclamation impossible');
        return LU;
      },
    });
    await boucleFileExtraction(deps);
    expect(journal.error.mock.calls[0][0]).toBe('[bio-ingest file] tour interrompu :');
    expect(deps.attendre).toHaveBeenCalledTimes(1);
    expect(deps.traiter).toHaveBeenCalledTimes(2);
  });

  it('l’arrêt demandé pendant un tour : le tour se termine, rien n’est plus réclamé, aucune attente', async () => {
    const { deps, journal } = banc({ tours: 10, arretPendantLeTour: 2 });
    await boucleFileExtraction(deps);
    expect(deps.traiter).toHaveBeenCalledTimes(2);
    expect(deps.attendre).toHaveBeenCalledTimes(1); // après le tour 1 seulement
    expect(journal.log).toHaveBeenLastCalledWith('[bio-ingest file] arrêté');
  });
});
