// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CarteFil, TypeCarteFil } from '@/lib/fil/cartes';
import { FilDuJour } from './FilDuJour';

// Le Fil est l'accueil praticien depuis SP-FIL LOT-01 et n'avait aucun test :
// ses quatre états de rendu (chargement, indisponible, vide, liste) partagent
// le même `data-testid`, si bien que l'E2E existant passait aussi sur une
// erreur. On les distingue ici par leur contenu, jamais par leur testid.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const carte = (partiel: Partial<CarteFil> = {}): CarteFil => ({
  type: 'assignation_en_retard',
  idPatient: 'PAT_SEED_01',
  patient: 'Sophie Nicola',
  titre: 'Questionnaire en retard',
  pourquoi: 'Échéance dépassée depuis 2 jours',
  date: '2026-07-17T10:00:00.000Z',
  href: '/dashboard/patients/PAT_SEED_01',
  actionLabel: 'Ouvrir la fiche',
  cle: 'assignation_en_retard:ASG_1',
  ...partiel,
});

// Le composant lit deux endpoints : le Fil et la Météo (badge inline). Par
// défaut, la Météo répond « rien à afficher » ; les tests qui veulent un badge
// stubent explicitement `/api/praticien/meteo-adhesion`.
function stubFetch(implementationFil: () => Promise<unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) =>
      url.includes('meteo-adhesion')
        ? ({ ok: true, json: async () => ({ ok: true, determinees: [], nbIndeterminees: 0 }) } as unknown as Response)
        : ({ ok: true, json: implementationFil } as unknown as Response),
    ),
  );
}

describe('FilDuJour — les quatre états de rendu', () => {
  beforeEach(() => vi.clearAllMocks());

  it('affiche un squelette tant que la lecture est en vol, sans rien affirmer', () => {
    // Promesse jamais résolue : l'état de chargement reste observable.
    stubFetch(() => new Promise(() => {}));
    render(<FilDuJour />);
    expect(screen.getByTestId('fil-du-jour')).toBeTruthy();
    // Ni « rien à signaler », ni « indisponible » : on n'affirme rien en vol.
    expect(screen.queryByText(/Rien n.appelle votre attention/i)).toBeNull();
    expect(screen.queryByText(/momentanément indisponible/i)).toBeNull();
  });

  it('un échec réseau est annoncé comme une indisponibilité, jamais comme un fil vide', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('réseau');
      }),
    );
    render(<FilDuJour />);
    await waitFor(() => expect(screen.getByText(/momentanément indisponible/i)).toBeTruthy());
    // La confusion à éviter : « rien à traiter » alors qu'on n'a rien pu lire.
    expect(screen.queryByText(/Rien n.appelle votre attention/i)).toBeNull();
  });

  it('une réponse `unavailable` est traitée comme une indisponibilité', async () => {
    stubFetch(async () => ({ cartes: [], unavailable: true }));
    render(<FilDuJour />);
    await waitFor(() => expect(screen.getByText(/momentanément indisponible/i)).toBeTruthy());
  });

  it('un fil réellement vide dit pourquoi il l’est', async () => {
    stubFetch(async () => ({ cartes: [] }));
    render(<FilDuJour />);
    await waitFor(() => expect(screen.getByText(/Rien n.appelle votre attention/i)).toBeTruthy());
    expect(screen.queryByText(/momentanément indisponible/i)).toBeNull();
  });

  it('chaque carte porte son type, son « pourquoi maintenant » et une action', async () => {
    stubFetch(async () => ({ cartes: [carte()] }));
    render(<FilDuJour />);
    await waitFor(() => expect(screen.getByText('Sophie Nicola')).toBeTruthy());
    expect(screen.getByText('En retard')).toBeTruthy();
    expect(screen.getByText('Échéance dépassée depuis 2 jours')).toBeTruthy();
    const lien = screen.getByRole('link', { name: /Ouvrir la fiche/ });
    expect(lien.getAttribute('href')).toBe('/dashboard/patients/PAT_SEED_01');
  });

  it('le type est écrit en toutes lettres à côté de l’icône, jamais porté par elle seule', async () => {
    stubFetch(async () => ({
      cartes: [
        carte({ type: 'signalement_trust', titre: 'Signalement à traiter', cle: 'signalement_trust:SIG_1' }),
        carte({ type: 'jalon_j21', titre: 'Point d’étape J21 renseigné — décision attendue', cle: 'jalon_j21:CHK_1' }),
        carte({ type: 'reprise', titre: 'Suivi interrompu', cle: 'reprise:PAT_SEED_01:x' }),
      ],
    }));
    render(<FilDuJour />);
    await waitFor(() => expect(screen.getByText('Signalement')).toBeTruthy());
    expect(screen.getByText('Point d’étape')).toBeTruthy();
    expect(screen.getByText('Reprise')).toBeTruthy();
  });
});

describe('FilDuJour — timeline et hiérarchie (maquette Spirale)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('seule la première carte porte le marqueur « Maintenant » et l’action primaire', async () => {
    stubFetch(async () => ({
      cartes: [
        carte({ cle: 'assignation_en_retard:ASG_1', titre: 'Première' }),
        carte({ cle: 'assignation_en_retard:ASG_2', titre: 'Seconde' }),
      ],
    }));
    render(<FilDuJour />);
    await waitFor(() => expect(screen.getByText('Première')).toBeTruthy());
    expect(screen.getAllByText('Maintenant')).toHaveLength(1);
    const liens = screen.getAllByRole('link', { name: /Ouvrir la fiche/ });
    expect(liens[0].className).toContain('bg-primary');
    expect(liens[1].className).not.toContain('bg-primary');
    // Cible de 44 px pour les deux formes (PRA-6, constat à l'écran : 36 px).
    for (const lien of liens) {
      expect(lien.className).toContain('min-h-11');
      expect(lien.className).not.toContain('min-h-9');
    }
  });

  it('l’heure s’affiche pour un événement du jour, « — » pour une carte sans date', async () => {
    const ceMatin = new Date();
    ceMatin.setHours(9, 30, 0, 0);
    stubFetch(async () => ({
      cartes: [
        carte({ cle: 'assignation_en_retard:ASG_1', date: ceMatin.toISOString() }),
        carte({ cle: 'assignation_en_retard:ASG_2', titre: 'Sans date', date: null }),
      ],
    }));
    render(<FilDuJour />);
    await waitFor(() => expect(screen.getByText('09:30')).toBeTruthy());
    expect(screen.getByText('—')).toBeTruthy();
  });

  it('l’en-tête résume le fil par type — jamais un « N cartes » brut', async () => {
    stubFetch(async () => ({
      cartes: [
        carte({
          type: 'synthese_a_valider',
          cle: 'synthese_a_valider:agregat:PAT_SEED_01:2026-07-14',
          titre: '3 relectures en attente',
          nbElements: 3,
        }),
        carte({ cle: 'assignation_en_retard:ASG_1' }),
        carte({ cle: 'assignation_en_retard:ASG_2', titre: 'Autre' }),
      ],
    }));
    render(<FilDuJour />);
    await waitFor(() => expect(screen.getByText('3 relectures · 2 retards')).toBeTruthy());
    expect(screen.queryByText(/3 cartes/)).toBeNull();
  });

  it('affiche le badge d’adhésion inline pour un patient fragile, sourcé sur la Météo', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.includes('meteo-adhesion')
          ? ({
              json: async () => ({
                ok: true,
                determinees: [
                  { idPatient: 'PAT_SEED_01', patient: 'Sophie Nicola', etat: 'fragile', pointEtapeSource: 'J14', dateSource: null },
                ],
                nbIndeterminees: 0,
              }),
            } as unknown as Response)
          : ({ ok: true, json: async () => ({ cartes: [carte()] }) } as unknown as Response),
      ),
    );
    render(<FilDuJour />);
    await waitFor(() => expect(screen.getByText(/Adhésion : fragile/i)).toBeTruthy());
  });

  it('sans Météo disponible, aucune carte ne porte de badge d’adhésion', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.includes('meteo-adhesion')
          ? ({ ok: true, json: async () => ({ ok: false, determinees: [], nbIndeterminees: 0, unavailable: true }) } as unknown as Response)
          : ({ ok: true, json: async () => ({ cartes: [carte()] }) } as unknown as Response),
      ),
    );
    render(<FilDuJour />);
    await waitFor(() => expect(screen.getByText('Questionnaire en retard')).toBeTruthy());
    expect(screen.queryByText(/Adhésion :/i)).toBeNull();
  });
});

// G1 : le geste de refus. « Refusable », pas « supprimable » — l'annulation
// fait partie du garde-fou, pas du confort.
describe('FilDuJour — écarter une carte (G1)', () => {
  beforeEach(() => vi.clearAllMocks());

  /** Le GET rend le Fil, le POST accepte le refus. */
  function stubFilEtRefus(refusOk = true) {
    const appels: { url: string; body?: unknown }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, options?: { method?: string; body?: string }) => {
        appels.push({ url, body: options?.body ? JSON.parse(options.body) : undefined });
        if (options?.method === 'POST') {
          return {
            ok: refusOk,
            json: async () =>
              refusOk
                ? { ok: true, carteCle: 'assignation_en_retard:ASG_1', refusee: true, inchange: false }
                : { ok: false, reason: 'exception', error: 'Erreur technique.' },
          } as unknown as Response;
        }
        return {
          ok: true,
          json: async () => ({ cartes: [carte({ cle: 'assignation_en_retard:ASG_1' })] }),
        } as unknown as Response;
      }),
    );
    return appels;
  }

  it('écarter envoie le refus au serveur, avec la clé de la carte', async () => {
    const appels = stubFilEtRefus();
    render(<FilDuJour />);

    const bouton = await screen.findByRole('button', { name: /Écarter cette carte/ });
    fireEvent.click(bouton);

    await waitFor(() => expect(screen.getByText(/Carte écartée/)).toBeTruthy());
    const refus = appels.find(a => a.url === '/api/praticien/fil/refus');
    expect(refus?.body).toMatchObject({
      idPatient: 'PAT_SEED_01',
      carteCle: 'assignation_en_retard:ASG_1',
      refusee: true,
    });
  });

  it('une carte écartée reste annulable sans quitter l’écran', async () => {
    const appels = stubFilEtRefus();
    render(<FilDuJour />);

    fireEvent.click(await screen.findByRole('button', { name: /Écarter cette carte/ }));
    const annuler = await screen.findByRole('button', { name: 'Annuler' });
    fireEvent.click(annuler);

    await waitFor(() => expect(screen.getByRole('button', { name: /Écarter cette carte/ })).toBeTruthy());
    expect(screen.queryByText(/Carte écartée/)).toBeNull();
    // L'annulation passe par le serveur : elle ne se contente pas de réafficher.
    const decisions = appels.filter(a => a.url === '/api/praticien/fil/refus');
    expect(decisions.map(a => (a.body as { refusee: boolean }).refusee)).toEqual([true, false]);
  });

  it('si le serveur refuse l’écriture, la carte reste affichée et l’échec est dit', async () => {
    stubFilEtRefus(false);
    render(<FilDuJour />);

    fireEvent.click(await screen.findByRole('button', { name: /Écarter cette carte/ }));

    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/Erreur technique/));
    // Le praticien ne doit pas croire avoir écarté une carte qui reviendra.
    expect(screen.getByRole('button', { name: /Écarter cette carte/ })).toBeTruthy();
    expect(screen.queryByText(/Carte écartée/)).toBeNull();
  });
});

// La TRACE d'une lecture — troisième issue d'une carte, à côté de « reste » et
// « s'en va ». Elle n'existe que le jour de sa lecture ; le lendemain la carte
// est partie sans rien laisser, comme une carte écartée.
describe('FilDuJour — la trace d’une carte lue, et « Remettre »', () => {
  beforeEach(() => vi.clearAllMocks());

  const lue = (partiel: Partial<CarteFil> = {}): CarteFil =>
    carte({
      type: 'geste_objectif',
      idPatient: 'PAT_SEED_03',
      patient: 'Michel Dogné',
      titre: 'Votre patient s’est prononcé sur son objectif',
      cle: 'geste_objectif:G1',
      ...partiel,
    });

  /** Le GET rend `{ cartes, lues }` ; le POST de lecture accepte ou refuse. */
  function stubFilEtLecture(
    reponses: { cartes: CarteFil[]; lues: CarteFil[] }[],
    lectureOk = true,
  ) {
    const appels: { url: string; body?: unknown }[] = [];
    let tour = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, options?: { method?: string; body?: string }) => {
        appels.push({ url, body: options?.body ? JSON.parse(options.body) : undefined });
        if (url.includes('meteo-adhesion')) {
          return { ok: true, json: async () => ({ ok: true, determinees: [], nbIndeterminees: 0 }) } as unknown as Response;
        }
        if (options?.method === 'POST') {
          return {
            ok: lectureOk,
            json: async () =>
              lectureOk
                ? { ok: true, typeCarte: 'geste_objectif', lue: false, inchange: false }
                : { ok: false, reason: 'exception', error: 'Erreur technique.' },
          } as unknown as Response;
        }
        const reponse = reponses[Math.min(tour, reponses.length - 1)];
        tour += 1;
        return { ok: true, json: async () => reponse } as unknown as Response;
      }),
    );
    return appels;
  }

  it('une carte lue laisse une trace — « Lu sur la fiche », jamais « écartée »', async () => {
    // Le mot compte : « écartée » dirait que le praticien a REFUSÉ ce qu'il
    // venait de lire. Les deux sorties se ressemblent à l'écran et n'ont pas le
    // même sens dans le dossier.
    stubFilEtLecture([{ cartes: [], lues: [lue()] }]);
    render(<FilDuJour />);
    await waitFor(() => expect(screen.getByText(/Lu sur la fiche/)).toBeTruthy());
    expect(screen.getByText(/Lu sur la fiche — Réponse du patient, Michel Dogné/)).toBeTruthy();
    expect(screen.queryByText(/Carte écartée/)).toBeNull();
  });

  it('DEUX CARTES DU MÊME DOSSIER NE FONT QU’UNE TRACE, et aucun décompte', async () => {
    stubFilEtLecture([
      { cartes: [], lues: [lue({ cle: 'geste_objectif:G1' }), lue({ cle: 'geste_objectif:G2' })] },
    ]);
    render(<FilDuJour />);
    await waitFor(() => expect(screen.getAllByText(/Lu sur la fiche/)).toHaveLength(1));
    expect(screen.getAllByRole('button', { name: /Remettre au Fil/ })).toHaveLength(1);
    expect(screen.queryByText(/2 /)).toBeNull();
  });

  it('UN FIL SANS CARTE MAIS AVEC UNE TRACE n’affiche pas l’état vide générique', async () => {
    // Sinon le seul « Remettre » de la journée serait inatteignable, et l'écran
    // dirait quelque chose de rassurant pendant qu'une parole a disparu.
    stubFilEtLecture([{ cartes: [], lues: [lue()] }]);
    render(<FilDuJour />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Remettre au Fil/ })).toBeTruthy());
    expect(screen.queryByText(/Le Fil se remplit à mesure/)).toBeNull();
    expect(screen.getByText(/Rien n.appelle plus votre attention aujourd.hui/)).toBeTruthy();
  });

  it('« Remettre » annule la lecture du COUPLE (dossier, type), puis relit le Fil', async () => {
    const appels = stubFilEtLecture([
      { cartes: [], lues: [lue()] },
      { cartes: [lue()], lues: [] },
    ]);
    render(<FilDuJour />);

    fireEvent.click(await screen.findByRole('button', { name: /Remettre au Fil/ }));

    await waitFor(() => expect(screen.getByText('Votre patient s’est prononcé sur son objectif')).toBeTruthy());
    const lecture = appels.find(a => a.url === '/api/praticien/fil/lecture');
    expect(lecture?.body).toEqual({
      idPatient: 'PAT_SEED_03',
      typeCarte: 'geste_objectif',
      lue: false,
    });
    // La carte est revenue par une RELECTURE du serveur, pas par une
    // reconstitution locale : le client ne sait pas ordonner le Fil.
    expect(appels.filter(a => a.url === '/api/praticien/fil')).toHaveLength(2);
    expect(screen.queryByText(/Lu sur la fiche/)).toBeNull();
  });

  it('si le serveur refuse, la trace reste et l’échec est dit', async () => {
    stubFilEtLecture([{ cartes: [], lues: [lue()] }], false);
    render(<FilDuJour />);

    fireEvent.click(await screen.findByRole('button', { name: /Remettre au Fil/ }));

    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/Erreur technique/));
    // Le praticien ne doit pas croire avoir remis une carte qui ne reviendra pas.
    expect(screen.getByRole('button', { name: /Remettre au Fil/ })).toBeTruthy();
  });

  it('sans aucune lecture, le Fil ne montre aucune trace', async () => {
    stubFilEtLecture([{ cartes: [carte()], lues: [] }]);
    render(<FilDuJour />);
    await waitFor(() => expect(screen.getByText('Questionnaire en retard')).toBeTruthy());
    expect(screen.queryByText(/Lu sur la fiche/)).toBeNull();
  });
});

// ── LE RAPPEL PATIENT, DEPUIS LA CARTE QUI CONSTATE LE RETARD ──────────────
//
// La route existait sans appelant : le mécanisme, ses refus et ses bancs, et
// rien pour le déclencher. Ces bancs tiennent le geste ET ce qu'il affiche —
// un refus de cadence n'est pas une panne, c'est une réponse, et la perdre
// retirerait la seule chose que ces refus apportent : la raison.
describe('FilDuJour — relancer un questionnaire en retard ([[D-562]] §6)', () => {
  beforeEach(() => vi.clearAllMocks());

  /** Le Fil, la Météo, et la relance — trois routes, trois réponses. */
  function stubAvecRelance(relance: () => Promise<unknown>) {
    const poste = vi.fn(async (url: string, options?: { method?: string }) => {
      if (url.includes('meteo-adhesion')) {
        return { json: async () => ({ ok: true, determinees: [], nbIndeterminees: 0 }) } as unknown as Response;
      }
      if (url.includes('assignations/relance')) {
        expect(options?.method).toBe('POST');
        return { json: relance } as unknown as Response;
      }
      return {
        ok: true,
        json: async () => ({
          ok: true,
          cartes: [carte({ idAssignation: 'ASG_1' })],
          refusees: [],
          lues: [],
        }),
      } as unknown as Response;
    });
    vi.stubGlobal('fetch', poste);
    return poste;
  }

  it('poste la relance sur l’assignation de la carte, et dit la nouvelle date', async () => {
    const poste = stubAvecRelance(async () => ({ ok: true, statut: 'Envoye', questionnaires: 1, nouvelleDateLimite: '2026-12-20' }));
    render(<FilDuJour />);

    const bouton = await screen.findByRole('button', { name: /Relancer le patient/i });
    fireEvent.click(bouton);

    await waitFor(() => expect(screen.getByText('Relance envoyée. Nouvelle date limite : 20/12/2026.')).toBeTruthy());
    const appel = poste.mock.calls.find(([url]) => String(url).includes('assignations/relance'));
    expect(JSON.parse(String((appel?.[1] as { body?: string })?.body))).toEqual({ idAssignation: 'ASG_1' });
  });

  // [[D-399]] : un e-mail couvre les questionnaires rappelables du dossier. Le
  // dire, sans quoi le refus de cadence des autres cartes paraîtrait inexpliqué.
  it('dit qu’une relance groupée couvre plusieurs envois', async () => {
    stubAvecRelance(async () => ({ ok: true, statut: 'Envoye', questionnaires: 3, nouvelleDateLimite: '2026-12-20' }));
    render(<FilDuJour />);

    fireEvent.click(await screen.findByRole('button', { name: /Relancer le patient/i }));

    await waitFor(() =>
      expect(screen.getByText('Relance envoyée. Elle couvre les 3 envois échus de ce dossier ; nouvelle date limite : 20/12/2026.')).toBeTruthy(),
    );
  });

  // [[D-404]] : la route rend 200 avec le statut de la trace. Un rappel en
  // échec ou sans messagerie n'est pas « envoyé » — textes validés mot pour mot.
  it('dit qu’une relance en échec n’est pas partie, et que rien n’a changé', async () => {
    stubAvecRelance(async () => ({ ok: true, statut: 'Erreur', questionnaires: 3 }));
    render(<FilDuJour />);

    fireEvent.click(await screen.findByRole('button', { name: /Relancer le patient/i }));

    await waitFor(() =>
      expect(screen.getByText('Relance non partie : l’envoi a échoué. Rien n’a changé ; vous pouvez réessayer.')).toBeTruthy());
    expect(screen.queryByText(/Relance envoyée/)).toBeNull();
  });

  it('dit qu’une relance n’est pas partie quand l’envoi d’e-mails n’est pas configuré', async () => {
    stubAvecRelance(async () => ({ ok: true, statut: 'Non_envoye', questionnaires: 1 }));
    render(<FilDuJour />);

    fireEvent.click(await screen.findByRole('button', { name: /Relancer le patient/i }));

    await waitFor(() =>
      expect(screen.getByText('Relance non partie : l’envoi d’e-mails n’est pas configuré. Rien n’a changé.')).toBeTruthy());
    expect(screen.queryByText(/Relance envoyée/)).toBeNull();
  });

  // LE MESSAGE DU SERVEUR EST AFFICHÉ TEL QUEL : « un rappel est déjà parti il y
  // a moins de 3 jours » se lit ; « Rappel impossible » n'apprendrait rien.
  it('affiche le refus du serveur tel quel, sans le traduire en panne', async () => {
    stubAvecRelance(async () => ({
      ok: false,
      reason: 'cadence',
      error: 'Un rappel est déjà parti il y a moins de 3 jours.',
    }));
    render(<FilDuJour />);

    fireEvent.click(await screen.findByRole('button', { name: /Relancer le patient/i }));

    await waitFor(() =>
      expect(screen.getByText('Un rappel est déjà parti il y a moins de 3 jours.')).toBeTruthy());
  });

  // Les autres cartes n'ont pas d'assignation à rappeler, et le bouton ne doit
  // pas apparaître au seul motif qu'une carte est en retard d'autre chose.
  it('aucune autre carte ne porte le bouton', async () => {
    stubFetch(async () => ({
      ok: true,
      cartes: [carte({ type: 'synthese_a_valider', idAssignation: undefined })],
      refusees: [],
      lues: [],
    }));
    render(<FilDuJour />);

    await screen.findByText('Questionnaire en retard');
    expect(screen.queryByRole('button', { name: /Relancer le patient/i })).toBeNull();
  });

  // [[D-562]] §3 : plus de « Débloquer » d'abord — la nouvelle date rouvre
  // l'envoi. Un clic relance, et seule la route de relance est appelée.
  it('ne propose plus « Débloquer » : un clic relance directement', async () => {
    const poste = stubAvecRelance(async () => ({ ok: true, statut: 'Envoye', questionnaires: 1, nouvelleDateLimite: '2026-12-20' }));
    render(<FilDuJour />);

    const bouton = await screen.findByRole('button', { name: /Relancer le patient/i });
    expect(bouton.textContent).toBe('Relancer');
    expect(screen.queryByRole('button', { name: /Débloquer/i })).toBeNull();
    fireEvent.click(bouton);

    await waitFor(() => expect(screen.getByText('Relance envoyée. Nouvelle date limite : 20/12/2026.')).toBeTruthy());
    expect(poste.mock.calls.some(([, options]) => (options as { method?: string } | undefined)?.method === 'PATCH')).toBe(false);
  });

  it('dit qu’une relance sans réponse du serveur n’a pas eu lieu', async () => {
    stubAvecRelance(async () => { throw new Error('réseau'); });
    render(<FilDuJour />);

    fireEvent.click(await screen.findByRole('button', { name: /Relancer le patient/i }));

    await waitFor(() => expect(screen.getByText('Relance impossible : le serveur n’a pas répondu.')).toBeTruthy());
  });
});

describe('FilDuJour — compte rendu biologique à lire (D-268, BP-10)', () => {
  beforeEach(() => vi.clearAllMocks());

  const aLire = carte({
    type: 'import_biologique_a_lire',
    titre: 'Compte rendu biologique à lire',
    pourquoi: 'Résultats entrés au dossier le 6 octobre : aucune lecture n’est consignée.',
    href: '/dashboard/patients/PAT_SEED_01?onglet=biologie&compteRendu=cr_1',
    actionLabel: 'Ouvrir la biologie',
    cle: 'import_biologique_a_lire:imp_1',
  });

  it('la carte mène à la biologie et ne s’écarte pas (§5)', async () => {
    stubFetch(async () => ({ cartes: [aLire, carte()] }));
    render(<FilDuJour />);
    await waitFor(() => expect(screen.getByText('Compte rendu biologique à lire')).toBeTruthy());
    expect(screen.getByText('Biologie à lire')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Ouvrir la biologie/ }).getAttribute('href')).toBe(
      '/dashboard/patients/PAT_SEED_01?onglet=biologie&compteRendu=cr_1',
    );
    // Une seule carte écartable : celle du retard, pas celle de la biologie.
    const ecarter = screen.getAllByRole('button', { name: /^Écarter cette carte/ });
    expect(ecarter).toHaveLength(1);
    expect(ecarter[0].getAttribute('aria-label')).toMatch(/Questionnaire en retard/);
  });

  it('L’ÉCHEC SE VOIT (§6), même dans un Fil vide qui ne dit plus « rien »', async () => {
    stubFetch(async () => ({ cartes: [], lecturesBiologieIndisponibles: true }));
    render(<FilDuJour />);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/comptes rendus biologiques à lire n.ont pas pu être vérifiés/));
    expect(screen.queryByText(/Rien n.appelle votre attention/i)).toBeNull();
  });

  it('l’échec se voit aussi au-dessus d’un Fil qui a des cartes', async () => {
    stubFetch(async () => ({ cartes: [carte()], lecturesBiologieIndisponibles: true }));
    render(<FilDuJour />);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/n.ont pas pu être vérifiés/));
    expect(screen.getByText('Questionnaire en retard')).toBeTruthy();
  });
});

describe('FilDuJour — compte rendu transmis par le patient (D-269 §7)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('la carte mène au compte rendu et ne s’écarte pas', async () => {
    const transmis = carte({
      type: 'compte_rendu_transmis',
      titre: 'Compte rendu transmis par le patient',
      pourquoi: 'Transmis le 7 octobre : aucune lecture n’est lancée.',
      href: '/dashboard/patients/PAT_SEED_01?onglet=biologie&compteRendu=cr_patient',
      actionLabel: 'Ouvrir le compte rendu',
      cle: 'compte_rendu_transmis:cr_patient',
    });
    stubFetch(async () => ({ cartes: [transmis, carte()] }));
    render(<FilDuJour />);
    await waitFor(() => expect(screen.getByText('Compte rendu transmis par le patient')).toBeTruthy());
    expect(screen.getByText('Transmis')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Ouvrir le compte rendu/ }).getAttribute('href')).toBe(
      '/dashboard/patients/PAT_SEED_01?onglet=biologie&compteRendu=cr_patient',
    );
    const ecarter = screen.getAllByRole('button', { name: /^Écarter cette carte/ });
    expect(ecarter).toHaveLength(1);
    expect(ecarter[0].getAttribute('aria-label')).toMatch(/Questionnaire en retard/);
  });
});

describe('FilDuJour — signal de sécurité à évaluer (D-275 §3)', () => {
  beforeEach(() => vi.clearAllMocks());

  const signal = carte({
    type: 'signal_securite',
    titre: 'Signal de sécurité à évaluer',
    pourquoi: 'Anamnèse : 1 signal d’alerte non adressé. Priorité et protocole restent suspendus.',
    href: '/dashboard/patients/PAT_SEED_01?onglet=cockpit&phase=decision',
    actionLabel: 'Évaluer',
    cle: 'signal_securite:PAT_SEED_01',
  });

  it('la carte se nomme « Sécurité », mène à la phase Décision et ne s’écarte pas', async () => {
    stubFetch(async () => ({ cartes: [signal, carte()] }));
    render(<FilDuJour />);
    await waitFor(() => expect(screen.getByText('Signal de sécurité à évaluer')).toBeTruthy());
    expect(screen.getByText('Sécurité')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Évaluer/ }).getAttribute('href')).toBe(
      '/dashboard/patients/PAT_SEED_01?onglet=cockpit&phase=decision',
    );
    const ecarter = screen.getAllByRole('button', { name: /^Écarter cette carte/ });
    expect(ecarter).toHaveLength(1);
    expect(ecarter[0].getAttribute('aria-label')).toMatch(/Questionnaire en retard/);
  });

  it('L’ÉCHEC DU CALCUL SE VOIT, même dans un Fil vide qui ne dit plus « rien »', async () => {
    stubFetch(async () => ({ cartes: [], signauxSecuriteIndisponibles: true }));
    render(<FilDuJour />);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/signaux de sécurité de vos dossiers n.ont pas pu être vérifiés/));
    expect(screen.queryByText(/Rien n.appelle votre attention/i)).toBeNull();
  });

  it('les deux échecs se disent ensemble', async () => {
    stubFetch(async () => ({ cartes: [carte()], signauxSecuriteIndisponibles: true, lecturesBiologieIndisponibles: true }));
    render(<FilDuJour />);
    await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(2));
  });
});

// PRA-2b (Q9 b, T-18 de [[D-488]]) : une Météo illisible se dit sur la carte,
// d'un badge neutre qui ne qualifie pas l'adhésion.
describe('FilDuJour — Météo d’adhésion indisponible (T-18)', () => {
  beforeEach(() => vi.clearAllMocks());

  const T18 = "Météo d'adhésion indisponible";

  it('une réponse `unavailable` pose le badge sur la carte, sans badge d’adhésion', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.includes('meteo-adhesion')
          ? ({ ok: true, json: async () => ({ ok: false, determinees: [], nbIndeterminees: 0, unavailable: true }) } as unknown as Response)
          : ({ ok: true, json: async () => ({ cartes: [carte()] }) } as unknown as Response),
      ),
    );
    render(<FilDuJour />);
    await waitFor(() => expect(screen.getByText(T18)).toBeTruthy());
    expect(screen.queryByText(/Adhésion :/i)).toBeNull();
  });

  it('un échec réseau de la Météo pose le badge, le Fil reste servi', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('meteo-adhesion')) throw new Error('réseau');
        return { ok: true, json: async () => ({ cartes: [carte()] }) } as unknown as Response;
      }),
    );
    render(<FilDuJour />);
    await waitFor(() => expect(screen.getByText(T18)).toBeTruthy());
    expect(screen.getByText('Questionnaire en retard')).toBeTruthy();
  });

  it('une Météo lue, même sans patient déterminé, ne pose aucun badge', async () => {
    stubFetch(async () => ({ cartes: [carte()] }));
    render(<FilDuJour />);
    await waitFor(() => expect(screen.getByText('Questionnaire en retard')).toBeTruthy());
    expect(screen.queryByText(T18)).toBeNull();
  });
});

// PRA-2b : l'habillage change l'action principale de chaque carte (lien ou
// bouton plein), jamais sa cible. Un type oublié ici fait échouer la
// vérification de types : la liste est exhaustive par construction.
describe('FilDuJour — la cible de chaque carte ne change pas, type par type', () => {
  beforeEach(() => vi.clearAllMocks());

  const TYPES: Record<TypeCarteFil, true> = {
    signal_securite: true,
    consultation_prevue: true,
    signalement_trust: true,
    synthese_a_valider: true,
    synthese_a_generer: true,
    synthese_non_servie: true,
    jalon_j21: true,
    t0_a_confirmer: true,
    biologie_arbitree: true,
    import_biologique_a_lire: true,
    compte_rendu_transmis: true,
    assignation_en_retard: true,
    sans_avancee: true,
    reprise: true,
    geste_objectif: true,
  };

  it.each(Object.keys(TYPES) as TypeCarteFil[])('%s : le lien d’action mène à `carte.href`', async type => {
    const href = `/dashboard/cible-${type}?idPatient=PAT_SEED_01`;
    stubFetch(async () => ({
      cartes: [carte({ type, cle: `${type}:X`, href, actionLabel: `Ouvrir ${type}` })],
    }));
    render(<FilDuJour />);
    const lien = await screen.findByRole('link', { name: `Ouvrir ${type} →` });
    expect(lien.getAttribute('href')).toBe(href);
  });
});

// PRA-2 décor ([[D-481]] §1 bis, question 20261128-0838-d : Q1 A, Q2) : le
// germe se pose sur le Fil réellement vide seulement — ni sur l'indisponibilité,
// ni sous une alerte de calcul, ni quand une trace lue occupe la zone, ni sur
// un Fil qui porte des cartes.
describe('FilDuJour — ornement d’état vide', () => {
  const ORNEMENT = '[data-lien-decor="etat-vide"]';
  beforeEach(() => vi.clearAllMocks());

  it('pose le germe sur le Fil réellement vide', async () => {
    stubFetch(async () => ({ cartes: [] }));
    const { container } = render(<FilDuJour />);
    await screen.findByText(/Rien n.appelle votre attention/i);
    const ornements = container.querySelectorAll(ORNEMENT);
    expect(ornements).toHaveLength(1);
    expect(ornements[0].getAttribute('data-element')).toBe('nutrition-sprout');
    expect(ornements[0].getAttribute('aria-hidden')).toBe('true');
    expect(ornements[0].className).toContain('print:!hidden');
    expect(ornements[0].className).toContain('max-w-full');
  });

  it('aucun germe sur l’indisponibilité', async () => {
    stubFetch(async () => ({ cartes: [], unavailable: true }));
    const { container } = render(<FilDuJour />);
    await screen.findByText(/momentanément indisponible/i);
    expect(container.querySelector(ORNEMENT)).toBeNull();
  });

  it('aucun germe sous une alerte de calcul', async () => {
    stubFetch(async () => ({ cartes: [], lecturesBiologieIndisponibles: true }));
    const { container } = render(<FilDuJour />);
    await screen.findByText('Aucune autre carte ne vous attend pour le moment.');
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(container.querySelector(ORNEMENT)).toBeNull();
  });

  it('aucun germe quand une trace lue occupe la zone, ni sur un Fil qui porte des cartes', async () => {
    stubFetch(async () => ({ cartes: [], lues: [carte({ type: 'geste_objectif', cle: 'geste_objectif:G1' })] }));
    const trace = render(<FilDuJour />);
    await screen.findByText(/Rien n.appelle plus votre attention aujourd.hui/);
    expect(trace.container.querySelector(ORNEMENT)).toBeNull();
    trace.unmount();

    stubFetch(async () => ({ cartes: [carte()] }));
    const plein = render(<FilDuJour />);
    await screen.findByText('Échéance dépassée depuis 2 jours');
    expect(plein.container.querySelector(ORNEMENT)).toBeNull();
  });
});
