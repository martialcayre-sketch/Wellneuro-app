// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ObjectifNegociePanel } from './ObjectifNegociePanel';

const fetchMock = vi.fn();

const json = (payload: unknown, ok = true) => ({ ok, json: async () => payload });

const ANCRAGE_VIDE = {
  consultationValidee: false,
  motifPrincipal: null,
  objectifPrioritaire: null,
  attentes: [],
};

const DOSSIER_VIDE = {
  ok: true,
  objectifs: [],
  trajectoires: [],
  ancrage: ANCRAGE_VIDE,
  ratifications: {},
  amendements: [],
  reponsesJalon: [],
  // Alliance 6.0-B (`D-161`) : l'état de fin de chaque tête, et le nombre de
  // têtes ACTIVES — c'est lui, et non `objectifs.length`, qui dit s'il y a
  // discordance. Un dossier vide n'a aucune tête active.
  fins: {},
  tetesActives: 0,
  lignesFin: [],
  // `F2` : les gestes de ratification avec LEUR version. Sans eux, une
  // contestation posée sur une version reformulée depuis disparaît du cockpit.
  lignesRatification: [],
  // L'ÉTAPE ATTENDUE : aucune par défaut, le motif étant dit plutôt que tu.
  jalonDu: { statut: 'aucune' as const, motif: 'Aucun cycle n’est confirmé pour ce dossier.' },
};

const FIN_OUVERTE = {
  etat: 'ouverte' as const,
  motif: null,
  voixManquante: null,
  refusee: false,
  attestee: false,
  remplaceParRacineId: null,
};

const ligne = (partiel: Record<string, unknown> = {}) => ({
  id: 'OBJ_1',
  enoncePatient: 'Je voudrais dormir sans me réveiller à trois heures.',
  reformulationPraticien: null,
  priorite: null,
  nonTraiteMotif: null,
  nonTraiteDepuisLe: null,
  negocieLe: null,
  creeLe: '2026-08-20T09:00:00.000Z',
  supersedesObjectifId: null,
  sourcePropositionId: null,
  ...partiel,
});

/** Réponse par défaut du moteur de proposition : ouvert, mais rien à citer. */
const PROPOSITIONS_VIDES = { ok: true, propositions: [], disposees: [], caduques: [] };

const fragment = (nature: string, texte: string, extra: Record<string, unknown> = {}) => ({
  texte,
  source: { nature, ...extra },
});

const proposition = (partiel: Record<string, unknown> = {}) => ({
  id: 'PROP_1',
  fragments: [
    fragment('regle_signee', 'Explorer le sommeil', { regle: 'PRIO-SOM-01', shaPerimetre: 'a'.repeat(64) }),
    fragment('anamnese', 'Je me réveille à trois heures toutes les nuits.', {
      champ: 'motif_principal',
      dateConsultation: '2026-08-20T09:00:00.000Z',
    }),
  ],
  assembleeLe: '2026-08-25T09:00:00.000Z',
  creeLe: '2026-08-25T09:00:00.000Z',
  disposition: null,
  ...partiel,
});

/** Route les appels comme le ferait le serveur, sans supposer leur ordre. */
function router(
  surcharges: {
    dossier?: unknown;
    dossierOk?: boolean;
    post?: unknown;
    postOk?: boolean;
    propositions?: unknown;
    propositionsStatut?: number;
    postPropositions?: unknown;
    postPropositionsOk?: boolean;
    matiere?: unknown;
    matiereOk?: boolean;
    postMatiere?: unknown;
    postMatiereOk?: boolean;
  } = {},
) {
  return (url: string, options?: { method?: string }) => {
    // `D-167` — la route de matière et de proposition. Déclarée AVANT les
    // autres branches : son chemin commence par `/api/praticien/objectifs`, et
    // la branche générique l'avalerait.
    if (url.startsWith('/api/praticien/objectifs/proposition-priorite')) {
      if (options?.method === 'POST') {
        return Promise.resolve(
          json(surcharges.postMatiere ?? { ok: true, etat: 'aucune' }, surcharges.postMatiereOk ?? true),
        );
      }
      return Promise.resolve(
        json(surcharges.matiere ?? { ok: true, etat: 'sources_manquantes', manque: ['depot_patient'] }, surcharges.matiereOk ?? true),
      );
    }
    if (options?.method === 'POST' && url.startsWith('/api/praticien/propositions-objectif')) {
      return Promise.resolve(
        json(surcharges.postPropositions ?? { ok: true, disposition: { id: 'DIS_1' } }, surcharges.postPropositionsOk ?? true),
      );
    }
    if (options?.method === 'POST') {
      return Promise.resolve(json(surcharges.post ?? { ok: true, objectif: ligne() }, surcharges.postOk ?? true));
    }
    if (url.startsWith('/api/praticien/propositions-objectif')) {
      const statut = surcharges.propositionsStatut ?? 200;
      return Promise.resolve({
        ok: statut === 200,
        status: statut,
        json: async () => surcharges.propositions ?? PROPOSITIONS_VIDES,
      });
    }
    if (url.startsWith('/api/praticien/objectifs')) {
      return Promise.resolve(json(surcharges.dossier ?? DOSSIER_VIDE, surcharges.dossierOk ?? true));
    }
    return Promise.resolve(json({}, false));
  };
}

async function attendreLeDossier() {
  render(<ObjectifNegociePanel idPatient="PAT_SEED_03" />);
  await waitFor(() => expect(screen.getByText(/Ce que le patient a écrit à l’anamnèse/)).toBeTruthy());
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ObjectifNegociePanel (Alliance 6.0-A LOT-02)', () => {
  it('ne tire le dossier qu’une fois : le GET journalise, une boucle gonflerait le journal', async () => {
    fetchMock.mockImplementation(router());
    await attendreLeDossier();
    // Laisse passer d'éventuels re-rendus avant de compter.
    await new Promise((resoudre) => setTimeout(resoudre, 20));
    const lectures = fetchMock.mock.calls.filter(([, options]) => options?.method !== 'POST');

    // DEUX RESSOURCES, UNE LECTURE CHACUNE — et c'est ce qu'il faut compter
    // depuis le LOT-03. Le panneau lit le dossier ET les propositions ; les
    // DEUX routes journalisent l'accès (G-TRUST-04), si bien qu'une boucle sur
    // l'une ou l'autre gonflerait le journal. Compter le total dirait « 2 » et
    // laisserait passer deux tirages de la même route.
    const parRoute = new Map<string, number>();
    for (const [url] of lectures) {
      const route = String(url).split('?')[0];
      parRoute.set(route, (parRoute.get(route) ?? 0) + 1);
    }
    // TROIS ROUTES DEPUIS `D-167`, UNE LECTURE CHACUNE. La troisième sert la
    // matière de pré-remplissage ; elle lit le dossier et journalise comme les
    // deux autres. Ce qui est compté reste « une lecture par route » — l'ajout
    // d'une ressource n'affaiblit pas l'assertion, une boucle sur n'importe
    // laquelle des trois la fait toujours rougir.
    expect([...parRoute.entries()].sort()).toEqual([
      ['/api/praticien/objectifs', 1],
      ['/api/praticien/objectifs/proposition-priorite', 1],
      ['/api/praticien/propositions-objectif', 1],
    ]);
  });

  // ── Trois absences, trois libellés distincts (DC-24) ──────────────────────

  it('sans consultation validée, le dit — et ne parle pas de champ vide', async () => {
    fetchMock.mockImplementation(router());
    await attendreLeDossier();
    expect(screen.getByText(/Aucune consultation validée dans ce dossier/)).toBeTruthy();
    expect(screen.queryByText(/Non renseigné à l’anamnèse/)).toBeNull();
  });

  it('avec une consultation validée, distingue le champ non renseigné', async () => {
    fetchMock.mockImplementation(
      router({
        dossier: {
          ...DOSSIER_VIDE,
          ancrage: {
            consultationValidee: true,
            motifPrincipal: 'Fatigue persistante depuis six mois.',
            objectifPrioritaire: null,
            attentes: [],
          },
        },
      }),
    );
    await attendreLeDossier();
    expect(screen.getByText('Fatigue persistante depuis six mois.')).toBeTruthy();
    expect(screen.getByText('Non renseigné à l’anamnèse.')).toBeTruthy();
    expect(screen.getByText('Non renseignées à l’anamnèse.')).toBeTruthy();
    expect(screen.queryByText(/Aucune consultation validée/)).toBeNull();
  });

  it('une erreur de lecture n’affiche JAMAIS une liste vide', async () => {
    fetchMock.mockImplementation(
      router({ dossier: { ok: false, reason: 'exception', error: 'Erreur technique.' }, dossierOk: false }),
    );
    render(<ObjectifNegociePanel idPatient="PAT_SEED_03" />);

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByRole('alert').textContent).toMatch(/pas une absence d’objectif/);
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeTruthy();
    expect(screen.queryByText(/Aucun objectif négocié pour ce dossier/)).toBeNull();
    // Et l'absence d'ancrage n'est pas non plus affirmée.
    expect(screen.queryByText(/Aucune consultation validée/)).toBeNull();
  });

  // ── Le matériau d'ancrage ne pré-remplit rien ─────────────────────────────

  it('affiche le matériau d’anamnèse À CÔTÉ de la saisie, jamais dedans', async () => {
    fetchMock.mockImplementation(
      router({
        dossier: {
          ...DOSSIER_VIDE,
          ancrage: {
            consultationValidee: true,
            motifPrincipal: 'Fatigue persistante depuis six mois.',
            objectifPrioritaire: 'Retrouver de l’énergie le matin.',
            attentes: ['Améliorer le sommeil'],
          },
        },
      }),
    );
    await attendreLeDossier();

    expect(screen.getByText('Retrouver de l’énergie le matin.')).toBeTruthy();
    // Le champ de saisie est VIDE : pré-remplir attribuerait durablement au
    // patient, comme objectif négocié, une phrase dite à une autre question.
    const champ = screen.getByLabelText(/Ce que le patient demande/) as HTMLTextAreaElement;
    expect(champ.value).toBe('');
  });

  // ── La priorité ne s'ordonne pas ──────────────────────────────────────────

  it('la priorité est un champ texte libre — ni liste déroulante, ni badge ordonné', async () => {
    fetchMock.mockImplementation(router());
    await attendreLeDossier();
    const champ = screen.getByLabelText(/Priorité \(libellé libre\)/);
    expect(champ.tagName).toBe('INPUT');
    expect(champ.getAttribute('type')).toBe('text');
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  // ── Trajectoire ───────────────────────────────────────────────────────────

  it('affiche la trajectoire complète : chaque révision, rien d’écrasé', async () => {
    fetchMock.mockImplementation(
      router({
        dossier: {
          ...DOSSIER_VIDE,
          objectifs: [ligne({ id: 'OBJ_2', supersedesObjectifId: 'OBJ_1' })],
          trajectoires: [
            {
              idObjectif: 'OBJ_2',
              lignes: [
                ligne({
                  id: 'OBJ_2',
                  supersedesObjectifId: 'OBJ_1',
                  reformulationPraticien: 'Sommeil fragmenté en seconde partie de nuit.',
                  creeLe: '2026-08-21T09:00:00.000Z',
                }),
                ligne({ id: 'OBJ_1', priorite: 'Premier plan' }),
              ],
            },
          ],
          ratifications: { OBJ_2: 'en_attente' },
          amendements: [],
          reponsesJalon: [],
        },
      }),
    );
    await attendreLeDossier();

    expect(screen.getByText(/Sommeil fragmenté en seconde partie de nuit/)).toBeTruthy();
    expect(screen.getByText('Versions antérieures (1)')).toBeTruthy();
    // La version supplantée reste lisible, avec ce qu'elle portait.
    expect(screen.getByText(/Priorité : Premier plan/)).toBeTruthy();
  });

  it('quand deux versions courantes coexistent, les affiche toutes et le dit', async () => {
    fetchMock.mockImplementation(
      router({
        dossier: {
          ...DOSSIER_VIDE,
          objectifs: [ligne({ id: 'OBJ_3' }), ligne({ id: 'OBJ_2' })],
          trajectoires: [
            { idObjectif: 'OBJ_3', lignes: [ligne({ id: 'OBJ_3', priorite: 'Version A' })] },
            { idObjectif: 'OBJ_2', lignes: [ligne({ id: 'OBJ_2', priorite: 'Version B' })] },
          ],
          ratifications: { OBJ_3: 'en_attente', OBJ_2: 'en_attente' },
          amendements: [],
          reponsesJalon: [],
          fins: { OBJ_3: FIN_OUVERTE, OBJ_2: FIN_OUVERTE },
          tetesActives: 2,
        },
      }),
    );
    await attendreLeDossier();

    expect(screen.getByRole('status').textContent).toMatch(/2 versions courantes coexistent/);
    expect(screen.getByText(/Priorité : Version A/)).toBeTruthy();
    expect(screen.getByText(/Priorité : Version B/)).toBeTruthy();
  });

  it('DEUX TÊTES : le départage est OFFERT, et il dit ce qu’il coûte au patient', async () => {
    // Avant `D-161`, l'écran constatait la discordance sans rien pouvoir en
    // faire : `supersedes_objectif_id` étant à parent unique, aucun ajout ne
    // ramenait deux têtes à une. Le geste existe désormais, et l'écran doit
    // dire POURQUOI il presse — le patient est bloqué tant qu'il n'est pas posé.
    fetchMock.mockImplementation(
      router({
        dossier: {
          ...DOSSIER_VIDE,
          objectifs: [ligne({ id: 'OBJ_3' }), ligne({ id: 'OBJ_2' })],
          trajectoires: [
            { idObjectif: 'OBJ_3', lignes: [ligne({ id: 'OBJ_3', priorite: 'Version A' })] },
            { idObjectif: 'OBJ_2', lignes: [ligne({ id: 'OBJ_2', priorite: 'Version B' })] },
          ],
          ratifications: { OBJ_3: 'en_attente', OBJ_2: 'en_attente' },
          fins: { OBJ_3: FIN_OUVERTE, OBJ_2: FIN_OUVERTE },
          tetesActives: 2,
        },
      }),
    );
    await attendreLeDossier();

    const statut = screen.getByRole('status');
    expect(statut.textContent).toMatch(/ne peut ni ratifier, ni contester/);
    // RIEN N'EST EFFACÉ, et l'écran le dit : la chaîne écartée reste lisible.
    expect(statut.textContent).toMatch(/n’efface rien/);
    expect(screen.getAllByRole('button', { name: /Poursuivre celle-ci/ })).toHaveLength(2);
  });

  it('UNE CHAÎNE CLOSE ne rouvre pas le départage — elle ne concurrence plus', async () => {
    // Deux têtes, mais une seule ACTIVE : ce n'est pas une discordance, c'est un
    // dossier qui porte une histoire. Compter les têtes ferait passer l'une pour
    // l'autre.
    fetchMock.mockImplementation(
      router({
        dossier: {
          ...DOSSIER_VIDE,
          objectifs: [ligne({ id: 'OBJ_3' }), ligne({ id: 'OBJ_2' })],
          trajectoires: [
            { idObjectif: 'OBJ_3', lignes: [ligne({ id: 'OBJ_3', priorite: 'Version A' })] },
            { idObjectif: 'OBJ_2', lignes: [ligne({ id: 'OBJ_2', priorite: 'Version B' })] },
          ],
          ratifications: { OBJ_3: 'en_attente', OBJ_2: 'en_attente' },
          fins: { OBJ_3: FIN_OUVERTE, OBJ_2: { ...FIN_OUVERTE, etat: 'close', motif: 'atteint' } },
          tetesActives: 1,
        },
      }),
    );
    await attendreLeDossier();

    expect(screen.queryByRole('button', { name: /Poursuivre celle-ci/ })).toBeNull();
    expect(screen.queryByText(/versions courantes coexistent/)).toBeNull();
  });

  // ── Ratification ──────────────────────────────────────────────────────────

  it('« en attente » se dit « pas encore proposé au patient », jamais « non ratifié »', async () => {
    fetchMock.mockImplementation(
      router({
        dossier: {
          ...DOSSIER_VIDE,
          objectifs: [ligne()],
          trajectoires: [{ idObjectif: 'OBJ_1', lignes: [ligne()] }],
          ratifications: { OBJ_1: 'en_attente' },
          amendements: [],
          reponsesJalon: [],
        },
      }),
    );
    await attendreLeDossier();

    expect(screen.getByText(/Aucune réponse du patient enregistrée/)).toBeTruthy();
    // Le geste patient n'existe pas avant le LOT-06 : « non ratifié »
    // porterait un jugement sur quelqu'un à qui rien n'a été demandé.
    expect(document.body.textContent).not.toContain('Non ratifié');
    expect(document.body.textContent).not.toContain('non ratifié');
  });

  it('rend les deux autres gestes tels que le serveur les donne', async () => {
    fetchMock.mockImplementation(
      router({
        dossier: {
          ...DOSSIER_VIDE,
          objectifs: [ligne()],
          trajectoires: [{ idObjectif: 'OBJ_1', lignes: [ligne()] }],
          ratifications: { OBJ_1: 'conteste' },
          amendements: [],
          reponsesJalon: [],
        },
      }),
    );
    await attendreLeDossier();
    expect(screen.getByText(/Contesté par le patient/)).toBeTruthy();
  });

  // ── Écriture ──────────────────────────────────────────────────────────────

  it('le formulaire cède la place dès qu’un objectif courant existe', async () => {
    fetchMock.mockImplementation(
      router({
        dossier: {
          ...DOSSIER_VIDE,
          objectifs: [ligne()],
          trajectoires: [{ idObjectif: 'OBJ_1', lignes: [ligne()] }],
          ratifications: { OBJ_1: 'en_attente' },
          amendements: [],
          reponsesJalon: [],
        },
      }),
    );
    await attendreLeDossier();

    // Un objectif existe : plus de saisie vierge affichée sous la carte.
    expect(screen.queryByLabelText(/Ce que le patient demande/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Enregistrer l’objectif' })).toBeNull();

    // Le geste de reformulation rouvre le formulaire ; l'annuler le referme.
    fireEvent.click(screen.getByRole('button', { name: 'Reformuler cette version' }));
    expect(screen.getByLabelText(/Votre reformulation/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Annuler la reformulation' }));
    expect(screen.queryByLabelText(/Votre reformulation/)).toBeNull();
  });

  // AUCUN CHAMP DE CE PANNEAU NE PROPOSE UNE PHRASE À IMITER. Le champ
  // `enoncePatient` porte le texte dont `D-094` dit « verbatim, jamais
  // paraphrasé » ; il a porté jusqu'au 2026-09-10 un exemple clinique entre
  // guillemets, seul des quatre champs à ne pas donner une consigne. Le banc
  // vise la FORME — un libellé indicatif entre guillemets français — plutôt
  // que la phrase retirée, pour qu'un autre exemple ne puisse pas la remplacer
  // sur ce champ ni sur un autre.
  it('AUCUN CHAMP NE SUGGÈRE UN EXEMPLE : les invites sont des consignes, pas des phrases citées', async () => {
    fetchMock.mockImplementation(router());
    await attendreLeDossier();

    const enonce = screen.getByLabelText(/Ce que le patient demande/);
    expect(enonce.getAttribute('placeholder')).toBe('Ses mots, tels qu’il les a dits…');

    for (const champ of screen.getAllByRole('textbox')) {
      expect(champ.getAttribute('placeholder') ?? '').not.toMatch(/[«»]/);
    }
  });

  it('poste le contrat exact de la route, sans jamais transmettre de date d’enregistrement', async () => {
    fetchMock.mockImplementation(router());
    await attendreLeDossier();

    fireEvent.change(screen.getByLabelText(/Ce que le patient demande/), {
      target: { value: 'Je voudrais dormir sans me réveiller à trois heures.' },
    });
    fireEvent.change(screen.getByLabelText(/Votre reformulation/), {
      target: { value: 'Sommeil fragmenté en seconde partie de nuit.' },
    });
    fireEvent.change(screen.getByLabelText(/Priorité \(libellé libre\)/), {
      target: { value: 'Premier plan' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer l’objectif' }));

    await waitFor(() => {
      expect(fetchMock.mock.calls.find(([, options]) => options?.method === 'POST')).toBeTruthy();
    });
    const [url, options] = fetchMock.mock.calls.find(([, options]) => options?.method === 'POST')!;
    expect(url).toBe('/api/praticien/objectifs');
    const charge = JSON.parse(options.body as string);
    expect(charge.idPatient).toBe('PAT_SEED_03');
    expect(charge.enoncePatient).toBe('Je voudrais dormir sans me réveiller à trois heures.');
    expect(charge.priorite).toBe('Premier plan');
    expect(charge.supersedesObjectifId).toBeNull();
    // La date d'enregistrement est posée par la BASE.
    expect(Object.keys(charge)).not.toContain('creeLe');
  });

  it('une reformulation ne renvoie PAS l’énoncé : le serveur le recopie de la cible', async () => {
    fetchMock.mockImplementation(
      router({
        dossier: {
          ...DOSSIER_VIDE,
          objectifs: [ligne()],
          trajectoires: [{ idObjectif: 'OBJ_1', lignes: [ligne()] }],
          ratifications: { OBJ_1: 'en_attente' },
          amendements: [],
          reponsesJalon: [],
        },
      }),
    );
    await attendreLeDossier();

    fireEvent.click(screen.getByRole('button', { name: 'Reformuler cette version' }));
    expect(screen.queryByLabelText(/Ce que le patient demande/)).toBeNull();

    fireEvent.change(screen.getByLabelText(/Votre reformulation/), {
      target: { value: 'Sommeil fragmenté en seconde partie de nuit.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la reformulation' }));

    await waitFor(() => {
      expect(fetchMock.mock.calls.find(([, options]) => options?.method === 'POST')).toBeTruthy();
    });
    const [, options] = fetchMock.mock.calls.find(([, options]) => options?.method === 'POST')!;
    const charge = JSON.parse(options.body as string);
    expect(charge.supersedesObjectifId).toBe('OBJ_1');
    expect(Object.keys(charge)).not.toContain('enoncePatient');
  });

  it('affiche tel quel le refus du serveur (le 400 « non traité incomplet » fait foi)', async () => {
    fetchMock.mockImplementation(
      router({
        post: {
          ok: false,
          reason: 'non_traite_incomplet',
          error:
            'Un « non traité pour l’instant » porte un motif ET une date : renseignez les deux, ou aucun.',
        },
        postOk: false,
      }),
    );
    await attendreLeDossier();

    fireEvent.change(screen.getByLabelText(/Ce que le patient demande/), { target: { value: 'Dormir mieux.' } });
    fireEvent.change(screen.getByLabelText(/Ce qui n’est pas traité/), {
      target: { value: 'La question digestive attendra.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer l’objectif' }));

    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/motif ET une date/));
  });

  it('affiche tel quel le refus d’un dossier clos (le 409 fait foi)', async () => {
    fetchMock.mockImplementation(
      router({
        post: {
          ok: false,
          reason: 'dossier_cloture',
          error:
            'Le suivi de ce dossier est clôturé : aucun questionnaire ne peut être assigné, aucun document de suivi envoyé. Rouvrez le suivi pour reprendre.',
        },
        postOk: false,
      }),
    );
    await attendreLeDossier();

    fireEvent.change(screen.getByLabelText(/Ce que le patient demande/), { target: { value: 'Dormir mieux.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer l’objectif' }));

    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/Rouvrez le suivi/));
  });
});

// ── Les propositions (Alliance 6.0-B, LOT-03) ───────────────────────────────

describe('ObjectifNegociePanel — propositions (Alliance 6.0-B LOT-03)', () => {
  it('le bloc est ABSENT quand la fonctionnalité est fermée, jamais « aucune proposition »', async () => {
    // `503` = drapeau éteint ou dossier hors du périmètre de repli. Une liste
    // vide se lirait « la machine n'a rien trouvé à proposer sur ce dossier »,
    // c'est-à-dire un constat sur le patient (`DC-24`).
    fetchMock.mockImplementation(router({ propositionsStatut: 503 }));
    await attendreLeDossier();

    expect(screen.queryByLabelText('Propositions d’objectif')).toBeNull();
    expect(screen.queryByText(/Ce que Wellneuro peut citer/)).toBeNull();
    // Et le reste du panneau, lui, est bien là : la fermeture d'un bloc n'a
    // pas emporté la surface.
    expect(screen.getByText(/Ce que le patient a écrit à l’anamnèse/)).toBeTruthy();
  });

  // CE BANC ENCODAIT LA PHRASE FAUSSE. Il exigeait « sans épisode confirmé, il
  // n'a rien de signé à citer » sur une réponse qui ne dit RIEN de l'épisode :
  // il verrouillait une cause que l'écran n'avait pas vérifiée, et il l'aurait
  // défendue contre sa correction. Réécrit sur son intention — le bloc s'affiche
  // et NOMME une raison —, en éprouvant que la raison suit ce que le serveur dit.
  it('ouverte et sans ligne, le bloc s’affiche et n’affirme AUCUNE cause non dite', async () => {
    fetchMock.mockImplementation(router());
    await attendreLeDossier();

    await waitFor(() => expect(screen.getByLabelText('Propositions d’objectif')).toBeTruthy());
    // Le serveur du mock ne sert pas `pourquoiVide` : l'écran doit alors se
    // taire sur la cause, jamais retomber sur l'ancienne phrase.
    expect(screen.getByText('Aucune proposition à afficher.')).toBeTruthy();
    expect(screen.queryByText(/sans épisode confirmé/)).toBeNull();
  });

  it.each([
    ['episode_non_confirme', /aucun n’est confirmé sur ce dossier/],
    ['referentiel_non_signe', /Le référentiel signé n’est pas disponible/],
    ['rien_retenu', /aucune règle publiée ne s’applique à ce dossier/],
  ])('quand le serveur dit « %s », l’écran dit CELA et rien d’autre', async (raison, attendu) => {
    fetchMock.mockImplementation(
      router({
        propositions: {
          ok: true, propositions: [], disposees: [], caduques: [], pourquoiVide: raison,
        },
      }),
    );
    await attendreLeDossier();

    await waitFor(() => expect(screen.getByText(attendu)).toBeTruthy());
    // LES TROIS BRANCHES S'EXCLUENT. Sans cette assertion, une phrase qui les
    // concaténerait passerait les trois cas.
    const autres = [
      /aucun n’est confirmé sur ce dossier/,
      /Le référentiel signé n’est pas disponible/,
      /aucune règle publiée ne s’applique à ce dossier/,
    ].filter((motif) => motif.source !== attendu.source);
    for (const motif of autres) expect(screen.queryByText(motif)).toBeNull();
  });

  // ── `D-167` — les trois champs arrivent remplis ───────────────────────────

  const MATIERE = {
    ok: true,
    etat: 'aucune',
    matiere: {
      enonce: { texte: 'Je voudrais dormir sans me réveiller à trois heures.', idDepot: 'DEP_1' },
      reformulation: { texte: 'Sommeil fragmenté en seconde partie de nuit.', idSynthese: 'SYN_1' },
    },
  };
  const MATIERE_PROPOSEE = {
    ok: true,
    etat: 'proposee',
    matiere: MATIERE.matiere,
    proposition: {
      texte: 'Retrouver un sommeil continu',
      rang: 1,
      creeLe: '2026-09-11T00:00:00.000Z',
      idSynthese: 'SYN_1',
      idDepot: 'DEP_1',
      versionConsigne: 'priorite-v1',
    },
  };

  it('l’énoncé et la reformulation arrivent PRÉ-REMPLIS par citation, sans aucun appel', async () => {
    fetchMock.mockImplementation(router({ matiere: MATIERE }));
    await attendreLeDossier();

    await waitFor(() => {
      const champ = screen.getByLabelText(/Ce que le patient demande/) as HTMLTextAreaElement;
      expect(champ.value).toBe('Je voudrais dormir sans me réveiller à trois heures.');
    });
    const reformulation = screen.getByLabelText(/Votre reformulation/) as HTMLTextAreaElement;
    expect(reformulation.value).toBe('Sommeil fragmenté en seconde partie de nuit.');

    // AUCUN POST : les citations ne coûtent rien, seul le bouton appelle.
    expect(fetchMock.mock.calls.filter(([, o]) => o?.method === 'POST')).toEqual([]);
  });

  it('la priorité proposée arrive MARQUÉE', async () => {
    fetchMock.mockImplementation(router({ matiere: MATIERE_PROPOSEE }));
    await attendreLeDossier();

    await waitFor(() => {
      const champ = screen.getByLabelText(/Priorité/) as HTMLInputElement;
      expect(champ.value).toBe('Retrouver un sommeil continu');
    });
    expect(screen.getByText(/Proposé par la machine, à valider/)).toBeTruthy();
  });

  it('LA MARQUE TOMBE AU PREMIER CARACTÈRE MODIFIÉ, pas à l’enregistrement', async () => {
    fetchMock.mockImplementation(router({ matiere: MATIERE_PROPOSEE }));
    await attendreLeDossier();

    const champ = await waitFor(() => {
      const trouve = screen.getByLabelText(/Priorité/) as HTMLInputElement;
      expect(trouve.value).toBe('Retrouver un sommeil continu');
      return trouve;
    });
    expect(screen.getByText(/Proposé par la machine/)).toBeTruthy();

    fireEvent.change(champ, { target: { value: 'Retrouver un sommeil continu.' } });
    await waitFor(() => expect(screen.queryByText(/Proposé par la machine/)).toBeNull());
  });

  it('le pré-remplissage N’ÉCRASE PAS une saisie commencée AVANT son arrivée', async () => {
    // LE BANC DOIT TAPER AVANT, PAS APRÈS — et c'est une mutation qui l'a
    // montré. Une première rédaction tapait une fois la matière arrivée : elle
    // passait même avec un `setEnonce(matiere.enonce.texte)` inconditionnel,
    // l'effet ne se rejouant pas sur une frappe. Le risque réel est l'inverse :
    // le praticien écrit pendant que la lecture est en vol, et ses mots
    // disparaissent sous ses doigts quand elle atterrit.
    // `resoudre!` PLUTÔT QU'UNE VARIABLE NULLABLE : l'exécuteur d'une Promise
    // court SYNCHRONEMENT, mais TypeScript ne le sait pas et réduit la variable
    // à `null` au point d'appel.
    let libere!: () => void;
    const enVol = new Promise<void>((resoudre) => {
      libere = resoudre;
    });
    fetchMock.mockImplementation((url: string, options?: { method?: string }) => {
      if (url.startsWith('/api/praticien/objectifs/proposition-priorite') && options?.method !== 'POST') {
        return enVol.then(() => json(MATIERE, true));
      }
      return router()(url, options);
    });
    await attendreLeDossier();

    const champ = screen.getByLabelText(/Ce que le patient demande/) as HTMLTextAreaElement;
    expect(champ.value).toBe('');
    fireEvent.change(champ, { target: { value: 'Ce que j’ai entendu en consultation' } });

    libere();
    await new Promise((resoudre) => setTimeout(resoudre, 30));
    expect(champ.value).toBe('Ce que j’ai entendu en consultation');
  });

  it('NOMME ce qui manque au lieu de griser un bouton sans raison', async () => {
    fetchMock.mockImplementation(
      router({ matiere: { ok: true, etat: 'sources_manquantes', manque: ['depot_patient'] } }),
    );
    await attendreLeDossier();

    await waitFor(() =>
      expect(screen.getByText(/le patient n’a pas encore écrit ce qui compte pour lui/)).toBeTruthy(),
    );
    expect(screen.queryByText('Proposer une priorité')).toBeNull();
  });

  it('« une autre » remplace le champ ET la marque revient', async () => {
    fetchMock.mockImplementation(
      router({
        matiere: MATIERE_PROPOSEE,
        postMatiere: {
          ...MATIERE_PROPOSEE,
          proposition: { ...MATIERE_PROPOSEE.proposition, texte: 'Dormir sans réveil prolongé', rang: 2 },
        },
      }),
    );
    await attendreLeDossier();

    const bouton = await waitFor(() => screen.getByText('Une autre'));
    fireEvent.click(bouton);

    await waitFor(() => {
      const champ = screen.getByLabelText(/Priorité/) as HTMLInputElement;
      expect(champ.value).toBe('Dormir sans réveil prolongé');
    });
    expect(screen.getByText(/Proposé par la machine/)).toBeTruthy();
  });

  it('un échec de proposition SE DIT, avec de quoi réessayer', async () => {
    fetchMock.mockImplementation(
      router({
        matiere: MATIERE,
        postMatiere: { ok: false, reason: 'proposition_trop_longue', error: 'La proposition dépassait 200 caractères : elle a été refusée plutôt que coupée.' },
        postMatiereOk: false,
      }),
    );
    await attendreLeDossier();

    const bouton = await waitFor(() => screen.getByText('Proposer une priorité'));
    fireEvent.click(bouton);

    await waitFor(() => expect(screen.getByText(/refusée plutôt que coupée/)).toBeTruthy());
    expect(screen.getByText('Réessayer')).toBeTruthy();
  });

  it('affiche chaque fragment AVEC sa provenance — jamais une phrase nue', async () => {
    fetchMock.mockImplementation(
      router({ propositions: { ok: true, propositions: [proposition()], disposees: [], caduques: [] } }),
    );
    await attendreLeDossier();

    await waitFor(() => expect(screen.getByText(/Explorer le sommeil/)).toBeTruthy());
    // La règle signée montre son SHA EN ENTIER : tronqué, il ne prouverait rien
    // tout en donnant l'apparence d'une preuve.
    expect(screen.getByText(new RegExp(`périmètre ${'a'.repeat(64)}`))).toBeTruthy();
    expect(screen.getByText(/Motif principal — mots du patient à l’anamnèse/)).toBeTruthy();
  });

  it('« Reprendre » n’est offert QUE sur un verbatim d’anamnèse', async () => {
    fetchMock.mockImplementation(
      router({ propositions: { ok: true, propositions: [proposition()], disposees: [], caduques: [] } }),
    );
    await attendreLeDossier();
    await waitFor(() => expect(screen.getByText(/Explorer le sommeil/)).toBeTruthy());

    // La proposition porte DEUX fragments ; un seul est une parole du patient.
    expect(screen.getAllByRole('button', { name: 'Reprendre cette phrase' })).toHaveLength(1);
    // Et le fragment de règle dit pourquoi il ne l'est pas — plutôt qu'un
    // bouton grisé, qui laisserait croire à une permission manquante.
    // Dit UNE FOIS sous la liste, plus sous chaque fragment (audit 2026-09-02).
    expect(screen.getByText(/ne sont pas des paroles du patient/)).toBeTruthy();
  });

  it('une reprise DÉSIGNE le fragment et ne transmet jamais l’énoncé', async () => {
    fetchMock.mockImplementation(
      router({ propositions: { ok: true, propositions: [proposition()], disposees: [], caduques: [] } }),
    );
    await attendreLeDossier();
    await waitFor(() => expect(screen.getByText(/Explorer le sommeil/)).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Reprendre cette phrase' }));
    // La citation s'affiche, et le champ de saisie libre a disparu : un champ
    // modifiable laisserait croire que la saisie compte, alors que le serveur
    // recopie le fragment.
    expect(screen.getByText(/Cette phrase devient l’énoncé du patient telle quelle/)).toBeTruthy();
    expect(screen.queryByLabelText(/Ce que le patient demande/)).toBeNull();

    fireEvent.change(screen.getByLabelText(/Votre reformulation/), {
      target: { value: 'Sommeil fragmenté en seconde partie de nuit.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer l’objectif' }));

    await waitFor(() => {
      const envoi = fetchMock.mock.calls.find(
        ([url, options]) =>
          options?.method === 'POST' && String(url).startsWith('/api/praticien/objectifs'),
      );
      expect(envoi).toBeTruthy();
      const charge = JSON.parse(envoi![1].body as string);
      expect(charge.sourcePropositionId).toBe('PROP_1');
      expect(charge.sourceFragmentIndex).toBe(1);
      // L'ÉCRAN DÉSIGNE, IL NE DICTE PAS.
      expect(charge.enoncePatient).toBeUndefined();
      // Ce qui appartient au praticien, lui, part bien.
      expect(charge.reformulationPraticien).toBe('Sommeil fragmenté en seconde partie de nuit.');
    });
  });

  it('un écart transmet le motif, et le refus du serveur s’affiche tel quel', async () => {
    fetchMock.mockImplementation(
      router({
        propositions: { ok: true, propositions: [proposition()], disposees: [], caduques: [] },
        postPropositions: {
          ok: false,
          reason: 'motif_absent',
          error: 'Écarter une proposition demande un motif : c’est lui qui dit ce qu’il fallait changer.',
        },
        postPropositionsOk: false,
      }),
    );
    await attendreLeDossier();
    await waitFor(() => expect(screen.getByText(/Explorer le sommeil/)).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Écarter cette proposition' }));
    fireEvent.click(screen.getByRole('button', { name: 'Écarter avec ce motif' }));

    await waitFor(() =>
      expect(screen.getByText(/demande un motif/)).toBeTruthy(),
    );
    const envoi = fetchMock.mock.calls.find(
      ([url, options]) =>
        options?.method === 'POST' && String(url).startsWith('/api/praticien/propositions-objectif'),
    );
    expect(JSON.parse(envoi![1].body as string)).toMatchObject({
      action: 'ecarter',
      idProposition: 'PROP_1',
    });
  });

  it('une proposition caduque s’affiche comme périmée, et ne se reprend pas', async () => {
    fetchMock.mockImplementation(
      router({
        propositions: {
          ok: true,
          propositions: [],
          disposees: [],
          caduques: [proposition({ id: 'PROP_VIEILLE' })],
        },
      }),
    );
    await attendreLeDossier();

    await waitFor(() => expect(screen.getByText(/Périmées/)).toBeTruthy());
    // CADUQUE N'EST PAS « REFUSÉE » : personne ne l'a écartée.
    expect(screen.getByText(/Les données du dossier ont changé depuis leur assemblage/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Reprendre cette phrase' })).toBeNull();
  });

  it('« Déjà tranchées » montre la provenance, jamais une phrase nue', async () => {
    // M4, relevé en revue. Le premier fragment d'un assemblage est TOUJOURS
    // celui de la règle signée : « Reprise — Explorer le sommeil » présentait
    // au praticien, comme ce qu'il avait repris, une phrase que la MACHINE
    // avait produite, et sans sa source.
    fetchMock.mockImplementation(
      router({
        propositions: {
          ok: true,
          propositions: [],
          disposees: [proposition({ id: 'PROP_REPRISE', disposition: 'reprise' })],
          caduques: [],
        },
      }),
    );
    await attendreLeDossier();

    await waitFor(() => expect(screen.getByText(/Déjà tranchées/)).toBeTruthy());
    expect(screen.getByText(/Reprise —/)).toBeTruthy();
    expect(screen.getByText(new RegExp(`périmètre ${'a'.repeat(64)}`))).toBeTruthy();
  });

  it('reprendre puis reformuler N’EMPILE PAS les deux modes', async () => {
    // M3, relevé en revue. Les deux états coexistants donnaient un écran
    // contradictoire — titre « Reformuler », corps « citation retenue » — et un
    // corps portant les deux références, que le serveur refusait avec un
    // message décrivant tout autre chose.
    fetchMock.mockImplementation(
      router({
        dossier: {
          ok: true,
          objectifs: [ligne()],
          trajectoires: [{ idObjectif: 'OBJ_1', lignes: [ligne()] }],
          ancrage: ANCRAGE_VIDE,
          ratifications: { OBJ_1: 'en_attente' },
          amendements: [],
          reponsesJalon: [],
        },
        propositions: { ok: true, propositions: [proposition()], disposees: [], caduques: [] },
      }),
    );
    await attendreLeDossier();
    await waitFor(() => expect(screen.getByText(/Explorer le sommeil/)).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Reprendre cette phrase' }));
    expect(screen.getByText(/Cette phrase devient l’énoncé du patient/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Reformuler cette version' }));
    // La citation a été relâchée : un seul mode à la fois.
    expect(screen.queryByText(/Cette phrase devient l’énoncé du patient/)).toBeNull();
    expect(screen.getByText(/L’énoncé du patient est repris tel quel de la version précédente/)).toBeTruthy();
  });

  it('un second clic REND la citation — le bouton annonce un interrupteur', async () => {
    fetchMock.mockImplementation(
      router({ propositions: { ok: true, propositions: [proposition()], disposees: [], caduques: [] } }),
    );
    await attendreLeDossier();
    await waitFor(() => expect(screen.getByText(/Explorer le sommeil/)).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Reprendre cette phrase' }));
    fireEvent.click(screen.getByRole('button', { name: 'Citation retenue' }));
    expect(screen.queryByText(/Cette phrase devient l’énoncé du patient/)).toBeNull();
    expect(screen.getByLabelText(/Ce que le patient demande/)).toBeTruthy();
  });

  it('une lecture en échec ne laisse pas une liste périmée cliquable', async () => {
    // M6, relevé en revue : l'alerte « la lecture a échoué » coexistait avec
    // des boutons actifs sur une proposition peut-être déjà tranchée.
    fetchMock.mockImplementation(
      router({ propositions: { ok: true, propositions: [proposition()], disposees: [], caduques: [] } }),
    );
    const { rerender } = render(<ObjectifNegociePanel idPatient="PAT_SEED_03" signalAssemblage={0} />);
    await waitFor(() => expect(screen.getByText(/Explorer le sommeil/)).toBeTruthy());

    fetchMock.mockImplementation(router({ propositions: {}, propositionsStatut: 500 }));
    rerender(<ObjectifNegociePanel idPatient="PAT_SEED_03" signalAssemblage={1} />);

    await waitFor(() => expect(screen.getByText(/la lecture a échoué/)).toBeTruthy());
    expect(screen.queryByRole('button', { name: 'Reprendre cette phrase' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Écarter cette proposition' })).toBeNull();
  });

  it('relit les propositions quand la section clinique vient d’assembler', async () => {
    // Sans ce signal, le panneau lirait la table AVANT que l'assemblage y ait
    // écrit, et n'afficherait rien jusqu'au rechargement de page.
    fetchMock.mockImplementation(router());
    const { rerender } = render(<ObjectifNegociePanel idPatient="PAT_SEED_03" signalAssemblage={0} />);
    await waitFor(() => expect(screen.getByText(/Ce que le patient a écrit à l’anamnèse/)).toBeTruthy());

    const avant = fetchMock.mock.calls.filter(([url]) =>
      String(url).startsWith('/api/praticien/propositions-objectif'),
    ).length;

    rerender(<ObjectifNegociePanel idPatient="PAT_SEED_03" signalAssemblage={1} />);
    await waitFor(() => {
      const apres = fetchMock.mock.calls.filter(([url]) =>
        String(url).startsWith('/api/praticien/propositions-objectif'),
      ).length;
      expect(apres).toBe(avant + 1);
    });
  });
});

// ── LES MOTS DU PATIENT AU COCKPIT (Alliance 6.0-B LOT-04, D-110) ───────────

describe('ObjectifNegociePanel — « le dire autrement »', () => {
  const AMENDEMENT = {
    id: 'AME_1',
    idObjectif: 'OBJ_1',
    texte: 'Ce que je veux, c’est tenir debout jusqu’au dîner.',
    creeLe: '2026-08-25T12:00:00.000Z',
  };

  const dossierAvecAmendement = (partiel: Record<string, unknown> = {}) => ({
    ok: true,
    objectifs: [ligne()],
    trajectoires: [{ idObjectif: 'OBJ_1', lignes: [ligne()] }],
    ancrage: ANCRAGE_VIDE,
    ratifications: { OBJ_1: 'dit_autrement' },
    amendements: [AMENDEMENT],
    reponsesJalon: [],
    ...partiel,
  });

  it('affiche le texte du patient sous sa version, et le dit sans le juger', async () => {
    fetchMock.mockImplementation(router({ dossier: dossierAvecAmendement() }));
    await attendreLeDossier();

    await waitFor(() => expect(screen.getByText(/tenir debout jusqu’au dîner/)).toBeTruthy());
    expect(document.body.textContent).toContain('Le patient l’a dit autrement');
    // NI « refusé », NI « contesté » : il a proposé, il n'a pas dit non.
    expect(document.body.textContent).toContain('son texte ci-dessous');
    expect(document.body.textContent).not.toContain('Contesté par le patient');
  });

  it('un amendement d’une AUTRE chaîne ne s’affiche pas sous celle-ci', async () => {
    fetchMock.mockImplementation(
      router({
        dossier: dossierAvecAmendement({
          amendements: [{ ...AMENDEMENT, idObjectif: 'OBJ_AILLEURS' }],
          ratifications: { OBJ_1: 'en_attente' },
        }),
      }),
    );
    await attendreLeDossier();
    expect(document.body.textContent).not.toContain('tenir debout jusqu’au dîner');
  });

  it('un amendement écrit sur une version ANTÉRIEURE reste visible sur sa chaîne', async () => {
    // Sa parole n'a pas cessé de concerner cet objectif parce qu'une version
    // s'est intercalée.
    fetchMock.mockImplementation(
      router({
        dossier: dossierAvecAmendement({
          objectifs: [ligne({ id: 'OBJ_2', supersedesObjectifId: 'OBJ_1' })],
          trajectoires: [
            {
              idObjectif: 'OBJ_2',
              lignes: [ligne({ id: 'OBJ_2', supersedesObjectifId: 'OBJ_1' }), ligne()],
            },
          ],
          ratifications: { OBJ_2: 'en_attente' },
        }),
      }),
    );
    await attendreLeDossier();
    await waitFor(() => expect(screen.getByText(/tenir debout jusqu’au dîner/)).toBeTruthy());
  });

  it('POSTE L’IDENTIFIANT, JAMAIS LE TEXTE — l’écran désigne, le serveur recopie', async () => {
    fetchMock.mockImplementation(router({ dossier: dossierAvecAmendement() }));
    await attendreLeDossier();

    await waitFor(() => expect(screen.getByText('En faire l’énoncé du patient')).toBeTruthy());
    fireEvent.click(screen.getByText('En faire l’énoncé du patient'));
    fireEvent.click(screen.getByText('Enregistrer avec les mots du patient'));

    await waitFor(() => {
      const envoi = fetchMock.mock.calls.find((appel) => appel[1]?.method === 'POST');
      expect(envoi).toBeTruthy();
      const corps = JSON.parse(envoi![1].body);
      expect(corps.amendementCiteId).toBe('AME_1');
      // La révision est portée : sans elle, une seconde tête de chaîne naîtrait.
      expect(corps.supersedesObjectifId).toBe('OBJ_1');
      // Le texte du patient ne transite PAS par l'écran.
      expect(corps).not.toHaveProperty('enoncePatient');
      expect(JSON.stringify(corps)).not.toContain('tenir debout');
    });
  });

  it('la citation s’affiche, elle ne s’édite pas', async () => {
    fetchMock.mockImplementation(router({ dossier: dossierAvecAmendement() }));
    await attendreLeDossier();

    fireEvent.click(await screen.findByText('En faire l’énoncé du patient'));
    await waitFor(() => expect(screen.getByText('Intégrer les mots du patient')).toBeTruthy());
    // Aucune zone de saisie pour l'énoncé : la retoucher ferait passer un texte
    // réécrit pour « ce que le patient demande ».
    expect(screen.queryByLabelText(/Ce que le patient demande, dans ses mots/)).toBeNull();
  });

  it('reprendre un fragment de proposition RELÂCHE la citation d’amendement', async () => {
    // Nettoyage SYMÉTRIQUE : les trois origines d'énoncé s'excluent, et l'écran
    // ne doit jamais afficher un titre que le corps envoyé contredit.
    fetchMock.mockImplementation(
      router({
        dossier: dossierAvecAmendement(),
        propositions: { ok: true, propositions: [proposition()], disposees: [], caduques: [] },
      }),
    );
    await attendreLeDossier();

    fireEvent.click(await screen.findByText('En faire l’énoncé du patient'));
    await waitFor(() => expect(screen.getByText('Intégrer les mots du patient')).toBeTruthy());

    fireEvent.click(screen.getByText('Reprendre cette phrase'));
    await waitFor(() => expect(screen.queryByText('Intégrer les mots du patient')).toBeNull());
    expect(screen.getByText('Reprendre une proposition')).toBeTruthy();
  });

  it('un second clic REND la citation — le bouton annonce `aria-pressed`', async () => {
    fetchMock.mockImplementation(router({ dossier: dossierAvecAmendement() }));
    await attendreLeDossier();

    const bouton = await screen.findByText('En faire l’énoncé du patient');
    fireEvent.click(bouton);
    await waitFor(() =>
      expect(screen.getByText('Ces mots deviennent l’énoncé').getAttribute('aria-pressed')).toBe('true'),
    );

    fireEvent.click(screen.getByText('Ces mots deviennent l’énoncé'));
    await waitFor(() => expect(screen.queryByText('Intégrer les mots du patient')).toBeNull());
  });

  it('ne compte ni ne gradue les mots du patient', async () => {
    fetchMock.mockImplementation(router({ dossier: dossierAvecAmendement() }));
    await attendreLeDossier();
    await waitFor(() => expect(screen.getByText(/tenir debout jusqu’au dîner/)).toBeTruthy());

    const rendu = (document.body.textContent ?? '').toLowerCase();
    for (const interdit of ['score', 'moyenne', 'taux', '1 amendement', 'écart de']) {
      expect(rendu).not.toContain(interdit);
    }
  });
});

// ── OÙ LE PATIENT EN ÉTAIT (6.0-B, LOT-05) ───────────────────────────────────

describe('ObjectifNegociePanel — le récit d’étape', () => {
  const ETAPE = {
    id: 'REP_1',
    idObjectif: 'OBJ_1',
    jalon: 'J21',
    texte: 'Je tiens trois soirs sur sept. Le week-end, ça repart.',
    eva: 6,
    creeLe: '2026-08-26T12:00:00.000Z',
  };

  const dossierAvecEtapes = (reponsesJalon: unknown[]) => ({
    ok: true,
    objectifs: [ligne()],
    trajectoires: [{ idObjectif: 'OBJ_1', lignes: [ligne()] }],
    ancrage: ANCRAGE_VIDE,
    ratifications: { OBJ_1: 'ratifie' },
    amendements: [],
    reponsesJalon,
  });

  it('rend le récit sous sa version, avec son jalon et son EVA brute', async () => {
    fetchMock.mockImplementation(router({ dossier: dossierAvecEtapes([ETAPE]) }));
    await attendreLeDossier();

    await waitFor(() => expect(screen.getByText(/trois soirs sur sept/)).toBeTruthy());
    const rendu = document.body.textContent ?? '';
    expect(rendu).toContain('Où le patient en était');
    expect(rendu).toContain('J21');
    expect(rendu).toContain('Échelle du patient : 6 sur 10');
  });

  it('AFFICHE LE ZÉRO du patient — une vérité JavaScript l’aurait effacé', async () => {
    fetchMock.mockImplementation(router({ dossier: dossierAvecEtapes([{ ...ETAPE, eva: 0 }]) }));
    await attendreLeDossier();

    await waitFor(() => expect(screen.getByText(/trois soirs sur sept/)).toBeTruthy());
    expect(document.body.textContent).toContain('Échelle du patient : 0 sur 10');
  });

  it('sans EVA, AUCUNE échelle n’est rendue — ni zéro, ni tiret (DC-24)', async () => {
    fetchMock.mockImplementation(router({ dossier: dossierAvecEtapes([{ ...ETAPE, eva: null }]) }));
    await attendreLeDossier();

    await waitFor(() => expect(screen.getByText(/trois soirs sur sept/)).toBeTruthy());
    expect(document.body.textContent).not.toContain('Échelle du patient');
  });

  it('un récit d’une AUTRE chaîne ne s’affiche pas sous celle-ci', async () => {
    fetchMock.mockImplementation(
      router({ dossier: dossierAvecEtapes([{ ...ETAPE, idObjectif: 'OBJ_AILLEURS' }]) }),
    );
    await attendreLeDossier();

    await waitFor(() => expect(document.body.textContent).toContain('Objectif'));
    expect(document.body.textContent).not.toContain('Où le patient en était');
  });

  it('L’ORDRE SERVI EST L’ORDRE RENDU — jamais un tri par EVA', async () => {
    // Trier par valeur transformerait un récit en classement, et ferait lire
    // une progression là où il n'y a qu'une chronologie.
    const plusRecent = { ...ETAPE, id: 'REP_2', jalon: 'J42', eva: 2, texte: 'Ça s’est dégradé.' };
    fetchMock.mockImplementation(router({ dossier: dossierAvecEtapes([plusRecent, ETAPE]) }));
    await attendreLeDossier();

    await waitFor(() => expect(screen.getByText(/dégradé/)).toBeTruthy());
    const rendu = document.body.textContent ?? '';
    expect(rendu.indexOf('Ça s’est dégradé.')).toBeLessThan(rendu.indexOf('trois soirs sur sept'));
  });

  it('ne calcule rien et ne qualifie rien', async () => {
    fetchMock.mockImplementation(
      router({
        dossier: dossierAvecEtapes([
          ETAPE,
          { ...ETAPE, id: 'REP_2', jalon: 'J42', eva: 2, texte: 'Moins bien ce mois-ci.' },
        ]),
      }),
    );
    await attendreLeDossier();
    await waitFor(() => expect(screen.getByText(/trois soirs sur sept/)).toBeTruthy());

    const rendu = (document.body.textContent ?? '').toLowerCase();
    for (const interdit of [
      'moyenne',
      'tendance',
      'progression',
      'évolution',
      'score',
      'taux',
      'sur 3 étapes',
    ]) {
      expect(rendu).not.toContain(interdit);
    }
  });

  // ── La date d'accord ne voyage pas ────────────────────────────────────────

  describe('LA DATE D’ACCORD A QUITTÉ LE FORMULAIRE (D-161 §11)', () => {
    const dossierAvecObjectif = {
      ...DOSSIER_VIDE,
      objectifs: [ligne({ id: 'OBJ_1' })],
      trajectoires: [{ idObjectif: 'OBJ_1', lignes: [ligne({ id: 'OBJ_1' })] }],
      ratifications: { OBJ_1: 'en_attente' as const },
      fins: { OBJ_1: FIN_OUVERTE },
      tetesActives: 1,
    };

    it('le champ n’existe plus — le défaut est clos par RETRAIT, pas par vidage', async () => {
      // C'était un fait de CHAÎNE rangé dans une colonne de VERSION : perdable
      // à la révision, et falsifiable parce que le formulaire n'est jamais
      // démonté. Le vidage fermait le symptôme ; le retrait ferme la cause.
      fetchMock.mockImplementation(router({ dossier: dossierAvecObjectif }));
      await attendreLeDossier();
      fireEvent.click(screen.getByRole('button', { name: /Reformuler cette version/ }));
      expect(document.getElementById('objectif-negocie-le')).toBeNull();
    });

    it('LE GESTE D’ATTESTATION LE REMPLACE, et dit que la parole vient du praticien', async () => {
      fetchMock.mockImplementation(router({ dossier: dossierAvecObjectif }));
      await attendreLeDossier();
      expect(screen.getByText(/Accord conclu en consultation, le/)).toBeTruthy();
      // `D-161` §4 : le patient doit savoir laquelle des deux formes il lit.
      expect(document.body.textContent).toMatch(/l’accord vient de vous, pas de lui/);
      expect(document.body.textContent).toMatch(/c’est sa réponse qui s’affichera/);
    });

    it('les quatre autres champs se vident toujours à la bascule de mode', async () => {
      // Le vidage reste nécessaire pour eux : « reformuler → annuler → reprendre
      // une proposition » ne repose aucun de ces champs.
      fetchMock.mockImplementation(router({
        dossier: dossierAvecObjectif,
        propositions: { ok: true, propositions: [proposition()], disposees: [], caduques: [] },
      }));
      await attendreLeDossier();

      fireEvent.click(screen.getByRole('button', { name: /Reformuler cette version/ }));
      fireEvent.change(document.getElementById('objectif-priorite') as HTMLInputElement, {
        target: { value: 'Le sommeil d’abord' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Annuler la reformulation/ }));
      fireEvent.click(screen.getByRole('button', { name: 'Reprendre cette phrase' }));

      expect((document.getElementById('objectif-priorite') as HTMLInputElement).value).toBe('');
    });
  });


  // ── Renvoyer le courrier ──────────────────────────────────────────────────

  describe('RENVOYER LE COURRIER D’UN OBJECTIF DÉJÀ ÉCRIT', () => {
    const dossierEnAttente = {
      ...DOSSIER_VIDE,
      objectifs: [ligne({ id: 'OBJ_1' })],
      trajectoires: [{ idObjectif: 'OBJ_1', lignes: [ligne({ id: 'OBJ_1' })] }],
      ratifications: { OBJ_1: 'en_attente' as const },
      fins: { OBJ_1: FIN_OUVERTE },
      tetesActives: 1,
    };

    it('le geste est OFFERT quand le patient ne s’est pas encore prononcé', async () => {
      fetchMock.mockImplementation(router({ dossier: dossierEnAttente }));
      await attendreLeDossier();

      const bouton = screen.getByRole('button', { name: /Renvoyer le courrier au patient/ });
      expect(bouton).toBeTruthy();
      // ET IL DIT CE QU'IL NE FAIT PAS : aucune version créée. C'est ce qui le
      // distingue du contournement « réviser pour déclencher un envoi ».
      expect(screen.getByText(/aucune version n’est créée/)).toBeTruthy();
    });

    it('le geste DISPARAÎT dès que le patient s’est prononcé — le relancer dirait qu’on ne l’a pas lu', async () => {
      for (const etat of ['ratifie', 'conteste', 'dit_autrement'] as const) {
        cleanup();
        fetchMock.mockImplementation(
          router({ dossier: { ...dossierEnAttente, ratifications: { OBJ_1: etat } } }),
        );
        await attendreLeDossier();
        expect(
          screen.queryByRole('button', { name: /Renvoyer le courrier au patient/ }),
          etat,
        ).toBeNull();
      }
    });

    it('le geste DISPARAÎT sur une chaîne close — elle n’attend plus de réponse', async () => {
      fetchMock.mockImplementation(
        router({
          dossier: {
            ...dossierEnAttente,
            fins: { OBJ_1: { ...FIN_OUVERTE, etat: 'close', motif: 'atteint' } },
            tetesActives: 0,
          },
        }),
      );
      await attendreLeDossier();
      expect(screen.queryByRole('button', { name: /Renvoyer le courrier au patient/ })).toBeNull();
    });

    it('un refus de CADENCE est rendu lisible, avec la date à laquelle ce sera possible', async () => {
      fetchMock.mockImplementation((url: string, options?: { method?: string }) => {
        if (url.startsWith('/api/praticien/objectifs/relance')) {
          return Promise.resolve({
            ok: false,
            status: 429,
            json: async () => ({
              ok: false,
              reason: 'cadence',
              error: 'Un courrier est déjà parti il y a moins de 3 jours.',
              possibleLe: '2026-09-13T12:00:00.000Z',
            }),
          } as Response);
        }
        return router({ dossier: dossierEnAttente })(url, options);
      });
      await attendreLeDossier();

      fireEvent.click(screen.getByRole('button', { name: /Renvoyer le courrier au patient/ }));

      await waitFor(() => {
        expect(screen.getByRole('status').textContent).toMatch(/moins de 3 jours/);
      });
      expect(screen.getByRole('status').textContent).toMatch(/Possible à partir du/);
    });
  });


  it('F2 — UNE CONTESTATION POSÉE SUR UNE VERSION ANTÉRIEURE reste visible au cockpit', async () => {
    // C'est le geste le plus BREF qui disparaissait, et souvent le plus
    // décisif : un patient qui conteste. L'amendement et la réponse d'étape,
    // eux, restaient affichés sur toute la chaîne — asymétrie exactement
    // inverse de celle qu'on veut.
    fetchMock.mockImplementation(
      router({
        dossier: {
          ...DOSSIER_VIDE,
          objectifs: [ligne({ id: 'OBJ_2' })],
          trajectoires: [{
            idObjectif: 'OBJ_2',
            lignes: [ligne({ id: 'OBJ_2' }), ligne({ id: 'OBJ_1', priorite: 'Version initiale' })],
          }],
          ratifications: { OBJ_2: 'en_attente' },
          fins: { OBJ_2: FIN_OUVERTE },
          tetesActives: 1,
          lignesRatification: [
            { id: 'RAT_1', idObjectif: 'OBJ_1', sens: 'conteste', creeLe: '2026-09-01T10:00:00.000Z' },
          ],
        },
      }),
    );
    await attendreLeDossier();

    fireEvent.click(screen.getByText(/Versions antérieures/));
    const corps = document.body.textContent ?? '';
    expect(corps).toMatch(/sur CETTE version/);
    // ET LA TÊTE N'HÉRITE DE RIEN : le geste ancien est rendu SOUS sa version,
    // jamais reporté sur la courante — le drapeau `s` n'est pas disponible sur
    // la cible de compilation, donc on vérifie la mention de rattachement.
    expect(corps).toMatch(/Version initiale/);
  });


  it('LE COCKPIT DIT L’ÉTAPE ATTENDUE, pas seulement celles qui sont arrivées', async () => {
    // `jalonObjectifDu` n'était consommé que par le PORTAIL : le praticien
    // voyait les réponses reçues, jamais celles qu'on attend — et relançait au
    // hasard, ou pas du tout.
    fetchMock.mockImplementation(router({
      dossier: {
        ...DOSSIER_VIDE,
        jalonDu: {
          statut: 'ouverte',
          jalon: 'J21',
          ouvertLe: '2026-09-05T00:00:00.000Z',
          fermeLe: '2026-09-21T00:00:00.000Z',
        },
      },
    }));
    await attendreLeDossier();
    expect(document.body.textContent).toMatch(/Étape J21/);
    expect(document.body.textContent).toMatch(/peut répondre jusqu’au/);
  });

  it('SANS FENÊTRE OUVERTE, LE MOTIF EST DIT — jamais un blanc', async () => {
    // Un écran muet laisse croire à une panne, et « le patient n'a pas répondu »
    // ferait d'un silence un manquement (`DC-24`).
    fetchMock.mockImplementation(router({
      dossier: {
        ...DOSSIER_VIDE,
        jalonDu: {
          statut: 'aucune',
          motif: 'Aucune étape n’est ouverte aujourd’hui.',
          prochainJalon: 'J42',
          prochaineOuverture: '2026-10-01T00:00:00.000Z',
        },
      },
    }));
    await attendreLeDossier();
    expect(document.body.textContent).toMatch(/Aucune étape n’est ouverte/);
    expect(document.body.textContent).toMatch(/Prochaine étape \(J42\)/);
  });

});
