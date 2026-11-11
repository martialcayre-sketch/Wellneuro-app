// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AtelierCorpusPanel } from './AtelierCorpusPanel';

const fetchMock = vi.fn();

const json = (payload: unknown, ok = true) => ({ ok, json: async () => payload });

const COMPTEURS = {
  enAttenteValidation: 1,
  valide: 0,
  rejete: 0,
  empreintesDerivees: 0,
  sourcesSupersedees: 0,
};

const CLAIM = {
  id: 'WN-CL-0056-001@v1.0',
  claimId: 'WN-CL-0056-001',
  versionClaim: 'v1.0',
  sourceId: 'WN-SRC-0056',
  texteNormalise: 'Le magnésium contribue au fonctionnement normal du système nerveux.',
  classeAutorite: 'EFSA',
  niveauPreuve: 'B',
  typologieLecture: 'déclaré',
  prescriptif: true,
  modeleReviseur: 'claude-sonnet-5',
  statut: 'EN_ATTENTE_VALIDATION',
  validateur: null,
  valideAt: null,
  metadata: {},
  createdAt: '2026-07-22T10:00:00.000Z',
  sources: [
    {
      chunkId: 'WN-CH-0056-003',
      versionChunk: 'v1.0',
      section: 'Micronutrition',
      extrait: 'Verbatim du cours cité tel quel.',
      tronque: false,
      shaDerive: false,
      supersedee: true,
    },
  ],
};

const LISTE = {
  ok: true,
  statut: 'EN_ATTENTE_VALIDATION',
  sourceId: null,
  total: 1,
  claims: [CLAIM],
  compteurs: COMPTEURS,
};

/** Second claim (revue en lot) — deux claims en attente sur la même page. */
const CLAIM_2 = {
  ...CLAIM,
  id: 'WN-CL-0056-002@v1.0',
  claimId: 'WN-CL-0056-002',
  texteNormalise: 'Le zinc participe à la neurotransmission.',
};

const LISTE_2 = {
  ...LISTE,
  total: 2,
  claims: [CLAIM, CLAIM_2],
  compteurs: { ...COMPTEURS, enAttenteValidation: 2 },
};

const URL_DECISION = '/api/praticien/corpus/claims/decision';

/**
 * Route les appels sur leurs URLs EXACTES, comme le ferait le serveur : un
 * POST hors de la route décision ou un GET hors de la route liste échoue —
 * le test vérifie donc l'endpoint, pas seulement la méthode.
 */
function router(
  surcharges: {
    listes?: Record<string, unknown>;
    listeDefaut?: unknown;
    post?: unknown;
    postOk?: boolean;
  } = {},
) {
  return (url: string, options?: { method?: string }) => {
    if (options?.method === 'POST') {
      if (url !== URL_DECISION) return Promise.resolve(json({}, false));
      return Promise.resolve(
        json(
          surcharges.post ?? {
            ok: true,
            claim: {
              id: CLAIM.id,
              statut: 'VALIDE',
              validateur: 'praticien@wellneuro.fr',
              valideAt: '2026-07-22T18:00:00.000Z',
            },
          },
          surcharges.postOk ?? true,
        ),
      );
    }
    if (url.startsWith('/api/praticien/corpus/claims?')) {
      const statut = new URLSearchParams(url.split('?')[1]).get('statut') ?? '';
      const parStatut = surcharges.listes?.[statut];
      return Promise.resolve(json(parStatut ?? surcharges.listeDefaut ?? LISTE));
    }
    return Promise.resolve(json({}, false));
  };
}

const appelsPost = () => fetchMock.mock.calls.filter(([, options]) => options?.method === 'POST');
const appelsGet = () => fetchMock.mock.calls.filter(([, options]) => options?.method !== 'POST');

async function attendreLaFile() {
  render(<AtelierCorpusPanel />);
  await waitFor(() => expect(screen.getByText(/WN-CL-0056-001/)).toBeTruthy());
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('AtelierCorpusPanel (Atelier corpus v1)', () => {
  it('charge la file en attente (statut, limit, offset dans l’URL) et l’affiche', async () => {
    fetchMock.mockImplementation(router());
    await attendreLaFile();

    const [urlInitiale] = appelsGet()[0];
    expect(urlInitiale).toBe(
      '/api/praticien/corpus/claims?statut=EN_ATTENTE_VALIDATION&limit=50&offset=0',
    );
    expect(screen.getByText(/magnésium/)).toBeTruthy();
    expect(screen.getByText('déclaré')).toBeTruthy();
    expect(screen.getByText('prescriptif')).toBeTruthy();
    expect(screen.getByText('preuve B')).toBeTruthy();
    expect(screen.getByText(/WN-CH-0056-003/)).toBeTruthy();
    expect(screen.getByText('version supersédée')).toBeTruthy();
    // Deux natures de dérive, jamais additionnées dans la même tuile.
    expect(screen.getByText('Verbatims modifiés')).toBeTruthy();
    expect(screen.getByText(/0 version supersédée/)).toBeTruthy();
  });

  it('valide en deux temps : armer, puis signer sur la route décision — et recharge la file', async () => {
    fetchMock.mockImplementation(router());
    await attendreLaFile();
    const getsAvant = appelsGet().length;

    // 1er clic : arme la confirmation, RIEN n'est envoyé.
    fireEvent.click(screen.getByRole('button', { name: 'Valider' }));
    expect(appelsPost()).toHaveLength(0);

    // 2e clic : signe.
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer la validation' }));
    await waitFor(() => {
      const posts = appelsPost();
      expect(posts).toHaveLength(1);
      expect(posts[0][0]).toBe(URL_DECISION);
      expect(JSON.parse(posts[0][1].body)).toEqual({
        id: CLAIM.id,
        decision: 'VALIDE',
        statutAttendu: 'EN_ATTENTE_VALIDATION',
      });
    });
    // La décision recharge la file : un nouveau GET est parti.
    await waitFor(() => expect(appelsGet().length).toBeGreaterThan(getsAvant));
  });

  // D-321 — clés de lien : facultatives à la signature, jamais partielles.
  it('valide avec des clés de lien : besoins cochés et rubrique choisie partent avec la signature', async () => {
    fetchMock.mockImplementation(router());
    await attendreLaFile();

    fireEvent.click(screen.getByRole('button', { name: 'Valider' }));
    // Rien n'est coché ni choisi d'office.
    expect((screen.getByLabelText('2. Micronutriments essentiels') as HTMLInputElement).checked).toBe(false);
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('');

    fireEvent.click(screen.getByLabelText('4. Perception et sensations corporelles'));
    fireEvent.click(screen.getByLabelText('2. Micronutriments essentiels'));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'options' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer la validation' }));

    await waitFor(() => expect(appelsPost()).toHaveLength(1));
    expect(JSON.parse(appelsPost()[0][1].body)).toEqual({
      id: CLAIM.id,
      decision: 'VALIDE',
      statutAttendu: 'EN_ATTENTE_VALIDATION',
      besoins: [2, 4],
      rubrique: 'options',
    });
  });

  it('une saisie partielle bloque la signature et le dit', async () => {
    fetchMock.mockImplementation(router());
    await attendreLaFile();

    fireEvent.click(screen.getByRole('button', { name: 'Valider' }));
    fireEvent.click(screen.getByLabelText('2. Micronutriments essentiels'));
    const confirmer = screen.getByRole('button', { name: 'Confirmer la validation' }) as HTMLButtonElement;
    expect(confirmer.disabled).toBe(true);
    expect(screen.getByText(/se posent ensemble/)).toBeTruthy();
    fireEvent.click(confirmer);
    expect(appelsPost()).toHaveLength(0);
  });

  const CLAIM_VALIDE = {
    ...CLAIM,
    statut: 'VALIDE',
    validateur: 'praticien@wellneuro.fr',
    valideAt: '2026-07-22T18:00:00.000Z',
  };

  it('étiquette un claim validé : acte distinct, clés complètes exigées, aucune décision envoyée', async () => {
    fetchMock.mockImplementation(
      router({
        listes: { VALIDE: { ...LISTE, statut: 'VALIDE', claims: [CLAIM_VALIDE] } },
        post: { ok: true, etiquette: { id: CLAIM.id, besoins: [9], rubrique: 'limites' } },
      }),
    );
    await attendreLaFile();
    fireEvent.click(screen.getByRole('tab', { name: 'Validés' }));
    expect(await screen.findByText(/Non étiqueté/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Étiqueter' }));
    const enregistrer = screen.getByRole('button', { name: 'Enregistrer l’étiquetage' }) as HTMLButtonElement;
    expect(enregistrer.disabled).toBe(true);
    fireEvent.click(screen.getByLabelText('9. Sensations-émotions fondamentales (stress)'));
    expect(enregistrer.disabled).toBe(true);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'limites' } });
    expect(enregistrer.disabled).toBe(false);
    fireEvent.click(enregistrer);

    await waitFor(() => expect(appelsPost()).toHaveLength(1));
    expect(appelsPost()[0][0]).toBe(URL_DECISION);
    expect(JSON.parse(appelsPost()[0][1].body)).toEqual({
      action: 'etiqueter',
      id: CLAIM.id,
      besoins: [9],
      rubrique: 'limites',
    });
  });

  it('un claim déjà étiqueté affiche ses clés et ouvre leur correction pré-remplie', async () => {
    fetchMock.mockImplementation(
      router({
        listes: {
          VALIDE: {
            ...LISTE,
            statut: 'VALIDE',
            claims: [{ ...CLAIM_VALIDE, metadata: { besoins: [2, 9], rubrique: 'limites' } }],
          },
        },
      }),
    );
    await attendreLaFile();
    fireEvent.click(screen.getByRole('tab', { name: 'Validés' }));
    expect(await screen.findByText('Besoins 2, 9 · rubrique « Limites »')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Corriger l’étiquetage' }));
    expect((screen.getByLabelText('2. Micronutriments essentiels') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('limites');
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(appelsPost()).toHaveLength(0);
  });

  it('un claim remis en attente montre ses clés, et sa re-validation les reprend sans pouvoir les vider', async () => {
    fetchMock.mockImplementation(
      router({ listeDefaut: { ...LISTE, claims: [{ ...CLAIM, metadata: { besoins: [9], rubrique: 'limites' } }] } }),
    );
    await attendreLaFile();
    expect(screen.getByText('Besoins 9 · rubrique « Limites »')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Valider' }));
    expect(
      (screen.getByLabelText('9. Sensations-émotions fondamentales (stress)') as HTMLInputElement).checked,
    ).toBe(true);
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('limites');
    // Vider les clés ne les retire pas en base : la signature est bloquée.
    fireEvent.click(screen.getByLabelText('9. Sensations-émotions fondamentales (stress)'));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '' } });
    const confirmer = screen.getByRole('button', { name: 'Confirmer la validation' }) as HTMLButtonElement;
    expect(confirmer.disabled).toBe(true);

    fireEvent.click(screen.getByLabelText('2. Micronutriments essentiels'));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'options' } });
    fireEvent.click(confirmer);
    await waitFor(() => expect(appelsPost()).toHaveLength(1));
    expect(JSON.parse(appelsPost()[0][1].body)).toMatchObject({ besoins: [2], rubrique: 'options' });
  });

  it('un étiquetage en échec garde la saisie ouverte et dit l’erreur', async () => {
    fetchMock.mockImplementation(
      router({
        listes: { VALIDE: { ...LISTE, statut: 'VALIDE', claims: [{ ...CLAIM, statut: 'VALIDE', validateur: 'praticien@wellneuro.fr', valideAt: '2026-07-22T18:00:00.000Z' }] } },
        post: { ok: false, reason: 'exception', error: 'Erreur technique.' },
        postOk: false,
      }),
    );
    await attendreLaFile();
    fireEvent.click(screen.getByRole('tab', { name: 'Validés' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Étiqueter' }));
    fireEvent.click(screen.getByLabelText('2. Micronutriments essentiels'));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'options' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer l’étiquetage' }));

    expect(await screen.findByText('Erreur technique.')).toBeTruthy();
    expect((screen.getByLabelText('2. Micronutriments essentiels') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('options');
  });

  it('l’annulation de l’armement ne signe rien', async () => {
    fetchMock.mockImplementation(router());
    await attendreLaFile();

    fireEvent.click(screen.getByRole('button', { name: 'Valider' }));
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(screen.getByRole('button', { name: 'Valider' })).toBeTruthy();
    expect(appelsPost()).toHaveLength(0);
  });

  it('rejette en deux temps : armer, motif obligatoire, puis signer avec le motif transmis', async () => {
    fetchMock.mockImplementation(router());
    await attendreLaFile();

    // 1er clic : arme le rejet et ouvre le champ motif — RIEN n'est envoyé.
    fireEvent.click(screen.getByRole('button', { name: 'Rejeter' }));
    expect(appelsPost()).toHaveLength(0);
    const motif = screen.getByLabelText(/Motif du rejet/);
    expect(motif).toBeTruthy();

    // La confirmation reste bloquée tant que le motif est vide.
    expect((screen.getByRole('button', { name: 'Confirmer le rejet' }) as HTMLButtonElement).disabled).toBe(
      true,
    );

    fireEvent.change(motif, { target: { value: 'Hors périmètre clinique' } });
    expect(
      (screen.getByRole('button', { name: 'Confirmer le rejet' }) as HTMLButtonElement).disabled,
    ).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer le rejet' }));

    await waitFor(() => {
      const posts = appelsPost();
      expect(posts).toHaveLength(1);
      expect(posts[0][0]).toBe(URL_DECISION);
      // Le motif accompagne le rejet — sans lui la route répond motif_requis (422).
      expect(JSON.parse(posts[0][1].body)).toEqual({
        id: CLAIM.id,
        decision: 'REJETE',
        statutAttendu: 'EN_ATTENTE_VALIDATION',
        motif: 'Hors périmètre clinique',
      });
    });
  });

  it('change d’onglet : recharge avec le statut demandé, offset remis à zéro', async () => {
    fetchMock.mockImplementation(
      router({
        listes: {
          VALIDE: {
            ...LISTE,
            statut: 'VALIDE',
            claims: [
              {
                ...CLAIM,
                statut: 'VALIDE',
                validateur: 'praticien@wellneuro.fr',
                valideAt: '2026-07-22T18:00:00.000Z',
              },
            ],
          },
        },
      }),
    );
    await attendreLaFile();

    fireEvent.click(screen.getByRole('tab', { name: 'Validés' }));
    await waitFor(() => {
      const urls = appelsGet().map(([url]) => url);
      expect(urls).toContain('/api/praticien/corpus/claims?statut=VALIDE&limit=50&offset=0');
    });
    expect(await screen.findByText(/validé par praticien@wellneuro.fr/)).toBeTruthy();
  });

  it('la remise en attente est AUSSI en deux temps : effacer une signature ne part jamais d’un clic isolé', async () => {
    fetchMock.mockImplementation(
      router({
        listes: {
          VALIDE: {
            ...LISTE,
            statut: 'VALIDE',
            claims: [
              {
                ...CLAIM,
                statut: 'VALIDE',
                validateur: 'praticien@wellneuro.fr',
                valideAt: '2026-07-22T18:00:00.000Z',
              },
            ],
          },
        },
      }),
    );
    await attendreLaFile();
    fireEvent.click(screen.getByRole('tab', { name: 'Validés' }));
    const bouton = await screen.findByRole('button', { name: 'Remettre en attente' });

    // 1er clic : arme — la question nomme l'effacement de la signature.
    fireEvent.click(bouton);
    expect(appelsPost()).toHaveLength(0);
    expect(screen.getByText(/Effacer la signature et remettre ce claim en attente/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmer la remise en attente' }));
    await waitFor(() => {
      const posts = appelsPost();
      expect(posts).toHaveLength(1);
      expect(JSON.parse(posts[0][1].body)).toEqual({
        id: CLAIM.id,
        decision: 'EN_ATTENTE_VALIDATION',
        statutAttendu: 'VALIDE',
      });
    });
  });

  it('pagine au-delà de la page de 50 : compte affiché exact et offset transmis', async () => {
    const grandeListe = {
      ...LISTE,
      total: 136,
      claims: Array.from({ length: 50 }, (_, index) => ({
        ...CLAIM,
        id: `WN-CL-0056-${String(index + 1).padStart(3, '0')}@v1.0`,
        claimId: `WN-CL-0056-${String(index + 1).padStart(3, '0')}`,
      })),
      compteurs: { ...COMPTEURS, enAttenteValidation: 136 },
    };
    fetchMock.mockImplementation(router({ listeDefaut: grandeListe }));
    render(<AtelierCorpusPanel />);

    // Le compte ne ment pas : « 50 affichés sur 136 », jamais « 136 » nus.
    await waitFor(() => expect(screen.getByText(/50 claims affichés sur 136/)).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    await waitFor(() => {
      const urls = appelsGet().map(([url]) => url);
      expect(urls).toContain(
        '/api/praticien/corpus/claims?statut=EN_ATTENTE_VALIDATION&limit=50&offset=50',
      );
    });
  });

  it('affiche l’erreur de décision renvoyée par le serveur', async () => {
    fetchMock.mockImplementation(
      router({
        post: {
          ok: false,
          reason: 'source_derivee',
          error:
            'Un verbatim cité a été modifié depuis son rattachement — validation refusée tant que la dérive n’est pas instruite.',
        },
        postOk: false,
      }),
    );
    await attendreLaFile();

    // Le refus serveur remonte via une validation (armer → confirmer), le rejet
    // exigeant désormais un motif : la validation en deux temps suffit à
    // provoquer et afficher l'erreur.
    fireEvent.click(screen.getByRole('button', { name: 'Valider' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer la validation' }));
    await waitFor(() =>
      expect(screen.getByText(/Un verbatim cité a été modifié depuis son rattachement/)).toBeTruthy(),
    );
  });

  it('montre l’état vide de la file sans le confondre avec une erreur', async () => {
    fetchMock.mockImplementation(router({ listeDefaut: { ...LISTE, total: 0, claims: [] } }));
    render(<AtelierCorpusPanel />);
    await waitFor(() =>
      expect(screen.getByText(/Aucun claim en attente de validation/)).toBeTruthy(),
    );
  });

  it('signale un échec de lecture et propose de réessayer', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, false)),
    );
    render(<AtelierCorpusPanel />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeTruthy();
  });

  it('revue en lot : marque, soumet une décision individuelle par claim dans l’ordre, recharge une seule fois', async () => {
    fetchMock.mockImplementation(router({ listeDefaut: LISTE_2 }));
    render(<AtelierCorpusPanel />);
    await waitFor(() => expect(screen.getByText(/WN-CL-0056-002/)).toBeTruthy());
    const getsAvant = appelsGet().length;

    fireEvent.click(screen.getByRole('button', { name: 'Revue en lot' }));
    // 1er claim à valider, 2e à rejeter (+ motif).
    fireEvent.click(screen.getAllByRole('button', { name: 'À valider' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'À rejeter' })[1]);
    fireEvent.change(screen.getByLabelText(/Motif du rejet/), { target: { value: 'Doublon' } });

    fireEvent.click(screen.getByRole('button', { name: 'Soumettre les décisions (2)' }));

    await waitFor(() => expect(appelsPost()).toHaveLength(2));
    const posts = appelsPost();
    // Chaque marque part sur la route individuelle, jamais un endpoint de lot.
    expect(posts.every(([url]) => url === URL_DECISION)).toBe(true);
    // Ordre = ordre de la file, pas de l'insertion des marques.
    expect(JSON.parse(posts[0][1].body)).toEqual({
      id: CLAIM.id,
      decision: 'VALIDE',
      statutAttendu: 'EN_ATTENTE_VALIDATION',
    });
    expect(JSON.parse(posts[1][1].body)).toEqual({
      id: CLAIM_2.id,
      decision: 'REJETE',
      statutAttendu: 'EN_ATTENTE_VALIDATION',
      motif: 'Doublon',
    });
    // Une seule recharge à la fin du run (pas une par décision).
    await waitFor(() => expect(appelsGet().length).toBe(getsAvant + 1));
  });

  it('revue en lot : un rejet sans motif bloque la soumission, un claim non marqué n’est jamais soumis', async () => {
    fetchMock.mockImplementation(router({ listeDefaut: LISTE_2 }));
    render(<AtelierCorpusPanel />);
    await waitFor(() => expect(screen.getByText(/WN-CL-0056-002/)).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Revue en lot' }));
    // Seul le 1er claim est marqué (à rejeter), sans motif → soumission bloquée.
    fireEvent.click(screen.getAllByRole('button', { name: 'À rejeter' })[0]);
    expect(
      (screen.getByRole('button', { name: 'Soumettre les décisions (1)' }) as HTMLButtonElement).disabled,
    ).toBe(true);

    fireEvent.change(screen.getByLabelText(/Motif du rejet/), { target: { value: 'Erroné' } });
    fireEvent.click(screen.getByRole('button', { name: 'Soumettre les décisions (1)' }));

    // Une seule décision part : le 2e claim, non marqué, n'est jamais soumis.
    await waitFor(() => expect(appelsPost()).toHaveLength(1));
    expect(JSON.parse(appelsPost()[0][1].body)).toEqual({
      id: CLAIM.id,
      decision: 'REJETE',
      statutAttendu: 'EN_ATTENTE_VALIDATION',
      motif: 'Erroné',
    });
  });

  it('revue en lot : le résumé d’audit reste visible même quand le lot vide la file', async () => {
    let signes = 0;
    fetchMock.mockImplementation((url: string, options?: { method?: string; body?: string }) => {
      if (options?.method === 'POST') {
        signes += 1;
        return Promise.resolve(
          json({ ok: true, claim: { id: 'x', statut: 'VALIDE', validateur: 'p', valideAt: null } }),
        );
      }
      if (url.startsWith('/api/praticien/corpus/claims?')) {
        // Une fois des décisions signées, la file est vide au rechargement.
        const liste =
          signes > 0
            ? { ...LISTE_2, total: 0, claims: [], compteurs: { ...COMPTEURS, enAttenteValidation: 0 } }
            : LISTE_2;
        return Promise.resolve(json(liste));
      }
      return Promise.resolve(json({}, false));
    });
    render(<AtelierCorpusPanel />);
    await waitFor(() => expect(screen.getByText(/WN-CL-0056-002/)).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Revue en lot' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'À valider' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'À valider' })[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Soumettre les décisions (2)' }));

    // La file se vide, MAIS le retour d'audit reste lisible.
    await waitFor(() => expect(screen.getByText(/Aucun claim en attente/)).toBeTruthy());
    expect(screen.getByText(/2 décisions enregistrées/)).toBeTruthy();
  });

  it('revue en lot : deux rejets portent chacun leur motif, transmis au bon claim', async () => {
    fetchMock.mockImplementation(router({ listeDefaut: LISTE_2 }));
    render(<AtelierCorpusPanel />);
    await waitFor(() => expect(screen.getByText(/WN-CL-0056-002/)).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Revue en lot' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'À rejeter' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'À rejeter' })[1]);
    // Les deux champs sont distincts par leur libellé (claimId) — pas d'homonymie.
    fireEvent.change(screen.getByLabelText(`Motif du rejet — ${CLAIM.claimId}`), {
      target: { value: 'Motif A' },
    });
    fireEvent.change(screen.getByLabelText(`Motif du rejet — ${CLAIM_2.claimId}`), {
      target: { value: 'Motif B' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Soumettre les décisions (2)' }));

    await waitFor(() => expect(appelsPost()).toHaveLength(2));
    const parId = Object.fromEntries(
      appelsPost().map(([, options]) => {
        const corps = JSON.parse(options.body);
        return [corps.id, corps.motif];
      }),
    );
    expect(parId[CLAIM.id]).toBe('Motif A');
    expect(parId[CLAIM_2.id]).toBe('Motif B');
  });

  it('revue en lot : un échec réseau partiel est signalé, pas compté comme signé', async () => {
    fetchMock.mockImplementation((url: string, options?: { method?: string; body?: string }) => {
      if (options?.method === 'POST') {
        const corps = JSON.parse(options.body ?? '{}');
        if (corps.id === CLAIM_2.id) return Promise.reject(new Error('réseau'));
        return Promise.resolve(
          json({ ok: true, claim: { id: corps.id, statut: 'VALIDE', validateur: 'p', valideAt: null } }),
        );
      }
      if (url.startsWith('/api/praticien/corpus/claims?')) return Promise.resolve(json(LISTE_2));
      return Promise.resolve(json({}, false));
    });
    render(<AtelierCorpusPanel />);
    await waitFor(() => expect(screen.getByText(/WN-CL-0056-002/)).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Revue en lot' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'À valider' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'À valider' })[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Soumettre les décisions (2)' }));

    await waitFor(() => expect(screen.getByText(/1 décision enregistrée/)).toBeTruthy());
    // Le claim en échec est nommé, jamais compté comme signé.
    expect(screen.getByText(new RegExp(`1 en échec.*${CLAIM_2.claimId}`))).toBeTruthy();
  });

  it('revue en lot : sur état divergent, arrête le run et ne compte pas la décision comme signée', async () => {
    fetchMock.mockImplementation((url: string, options?: { method?: string }) => {
      if (options?.method === 'POST') {
        return Promise.resolve(
          json({ ok: false, reason: 'etat_divergent', error: 'La file a changé sous vous.' }, false),
        );
      }
      if (url.startsWith('/api/praticien/corpus/claims?')) {
        return Promise.resolve(json(LISTE_2));
      }
      return Promise.resolve(json({}, false));
    });
    render(<AtelierCorpusPanel />);
    await waitFor(() => expect(screen.getByText(/WN-CL-0056-002/)).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Revue en lot' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'À valider' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'À valider' })[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Soumettre les décisions (2)' }));

    // Le run s'arrête au 1er conflit : une seule tentative, résumé honnête.
    await waitFor(() => expect(screen.getByText(/interrompu/)).toBeTruthy());
    expect(appelsPost()).toHaveLength(1);
    expect(screen.getByText(/0 décision/)).toBeTruthy();
  });
});

// D/22 — recherche par identifiant : exacte, dans l'onglet ouvert, renvoi
// vers l'onglet où vit le claim quand la recherche ne trouve rien ici.
describe('AtelierCorpusPanel — recherche par identifiant (D/22)', () => {
  const URL_LISTE = '/api/praticien/corpus/claims?';

  /** Liste selon (statut, claim) : la recherche de 0056-001 n'existe qu'en VALIDE. */
  function routeurRecherche() {
    return (url: string, options?: { method?: string }) => {
      if (options?.method === 'POST') {
        return Promise.resolve(
          json({
            ok: true,
            claim: { id: CLAIM.id, statut: 'VALIDE', validateur: 'praticien@wellneuro.fr', valideAt: null },
          }),
        );
      }
      if (!url.startsWith(URL_LISTE)) return Promise.resolve(json({}, false));
      const params = new URLSearchParams(url.split('?')[1]);
      const statut = params.get('statut');
      const claim = params.get('claim');
      if (claim === null) return Promise.resolve(json(LISTE));
      if (statut === 'VALIDE') {
        return Promise.resolve(
          json({
            ...LISTE,
            statut: 'VALIDE',
            claimId: claim,
            claims: [{ ...CLAIM, statut: 'VALIDE', validateur: 'praticien@wellneuro.fr', valideAt: '2026-07-22T18:00:00.000Z' }],
            autresStatuts: [],
          }),
        );
      }
      return Promise.resolve(
        json({ ...LISTE, statut, claimId: claim, total: 0, claims: [], autresStatuts: ['VALIDE'] }),
      );
    };
  }

  const urlsGet = () => appelsGet().map(([url]) => url as string);

  function chercher(saisie: string) {
    fireEvent.change(screen.getByLabelText('Rechercher un claim par identifiant'), {
      target: { value: saisie },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Rechercher' }));
  }

  it('lit la forme courte et la transmet normalisée, offset remis à zéro', async () => {
    fetchMock.mockImplementation(routeurRecherche());
    await attendreLaFile();

    chercher(' 0056-001 ');
    await waitFor(() =>
      expect(urlsGet()).toContain(
        '/api/praticien/corpus/claims?statut=EN_ATTENTE_VALIDATION&limit=50&offset=0&claim=WN-CL-0056-001',
      ),
    );
    expect((screen.getByLabelText('Rechercher un claim par identifiant') as HTMLInputElement).value).toBe(
      'WN-CL-0056-001',
    );
  });

  it('une saisie illisible est refusée à l’écran, sans requête', async () => {
    fetchMock.mockImplementation(routeurRecherche());
    await attendreLaFile();
    const avant = appelsGet().length;

    chercher('0056-01');

    expect(screen.getByRole('alert').textContent).toContain('Identifiant attendu : WN-CL-0000-000 ou 0000-000.');
    expect(appelsGet()).toHaveLength(avant);
    expect(urlsGet().some((url) => url.includes('claim='))).toBe(false);
  });

  it('recherche vide ici : nomme l’onglet du claim et l’ouvre en gardant la recherche', async () => {
    fetchMock.mockImplementation(routeurRecherche());
    await attendreLaFile();

    chercher('WN-CL-0056-001');
    expect(await screen.findByText('Aucun claim WN-CL-0056-001 actif dans cet onglet.')).toBeTruthy();
    expect(screen.getByText('Il est dans l’onglet Validés.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir l’onglet Validés' }));
    await waitFor(() =>
      expect(urlsGet()).toContain(
        '/api/praticien/corpus/claims?statut=VALIDE&limit=50&offset=0&claim=WN-CL-0056-001',
      ),
    );
    expect(await screen.findByText(/validé par praticien@wellneuro.fr/)).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Validés' }).getAttribute('aria-selected')).toBe('true');
    // Le bouton de renvoi a disparu : le focus clavier suit l'onglet ouvert.
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Validés' }));
  });

  it('« Effacer » retire la recherche et rend la file entière', async () => {
    fetchMock.mockImplementation(routeurRecherche());
    await attendreLaFile();
    chercher('0056-001');
    await screen.findByText('Aucun claim WN-CL-0056-001 actif dans cet onglet.');
    const avant = appelsGet().length;

    fireEvent.click(screen.getByRole('button', { name: 'Effacer' }));
    await waitFor(() => expect(appelsGet().length).toBeGreaterThan(avant));
    expect(urlsGet().at(-1)).toBe('/api/praticien/corpus/claims?statut=EN_ATTENTE_VALIDATION&limit=50&offset=0');
    expect(await screen.findByText(/WN-CL-0056-001/)).toBeTruthy();
  });

  it('une décision prise sur un résultat recharge la vue courante, recherche comprise', async () => {
    fetchMock.mockImplementation(routeurRecherche());
    await attendreLaFile();
    fireEvent.click(screen.getByRole('tab', { name: 'Validés' }));
    chercher('0056-001');
    const bouton = await screen.findByRole('button', { name: 'Remettre en attente' });
    const avant = appelsGet().length;

    fireEvent.click(bouton);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer la remise en attente' }));
    await waitFor(() => expect(appelsPost()).toHaveLength(1));
    await waitFor(() => expect(appelsGet().length).toBeGreaterThan(avant));
    expect(urlsGet().at(-1)).toBe('/api/praticien/corpus/claims?statut=VALIDE&limit=50&offset=0&claim=WN-CL-0056-001');
  });
});

describe('AtelierCorpusPanel — exclusion de la recherche ([[D-490]])', () => {
  const URL_EXCLUSION = '/api/praticien/corpus/claims/exclusion-recherche';
  const VALIDE = {
    ...CLAIM,
    statut: 'VALIDE',
    validateur: 'praticien@wellneuro.fr',
    valideAt: '2026-07-22T18:00:00.000Z',
    excluRecherche: false,
  };
  const EXCLU = { ...VALIDE, excluRecherche: true };
  const POST_EXCLU = { ok: true, claim: { id: CLAIM.id, excluRecherche: true }, inchange: false };

  function routeur(claimValide: typeof VALIDE, post: unknown = POST_EXCLU) {
    return (url: string, options?: { method?: string }) => {
      if (options?.method === 'POST') {
        return Promise.resolve(url === URL_EXCLUSION ? json(post) : json({}, false));
      }
      if (url.startsWith('/api/praticien/corpus/claims?')) {
        const statut = new URLSearchParams(url.split('?')[1]).get('statut');
        return Promise.resolve(
          json(statut === 'VALIDE' ? { ...LISTE, statut: 'VALIDE', claims: [claimValide] } : LISTE),
        );
      }
      return Promise.resolve(json({}, false));
    };
  }

  async function ouvrirValides() {
    await attendreLaFile();
    fireEvent.click(screen.getByRole('tab', { name: 'Validés' }));
    await screen.findByRole('button', { name: /(Exclure de|Rétablir dans) la recherche/ });
  }

  it('exclut en deux temps, motif obligatoire, sans décision ni signature envoyée', async () => {
    fetchMock.mockImplementation(routeur(VALIDE));
    await ouvrirValides();
    expect(screen.queryByText('Exclu de la recherche')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Exclure de la recherche' }));
    const confirmer = screen.getByRole('button', { name: 'Confirmer l’exclusion' }) as HTMLButtonElement;
    expect(confirmer.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Motif — WN-CL-0056-001'), { target: { value: '  ' } });
    expect(confirmer.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Motif — WN-CL-0056-001'), { target: { value: 'dossier, classement' } });
    expect(confirmer.disabled).toBe(false);
    fireEvent.click(confirmer);

    await waitFor(() => expect(appelsPost()).toHaveLength(1));
    expect(appelsPost()[0][0]).toBe(URL_EXCLUSION);
    expect(JSON.parse(appelsPost()[0][1].body)).toEqual({
      id: CLAIM.id,
      sens: 'exclure',
      motif: 'dossier, classement',
    });
  });

  it('un claim exclu porte le badge et se rétablit', async () => {
    fetchMock.mockImplementation(
      routeur(EXCLU, { ok: true, claim: { id: CLAIM.id, excluRecherche: false }, inchange: false }),
    );
    await ouvrirValides();
    expect(screen.getByText('Exclu de la recherche')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Rétablir dans la recherche' }));
    fireEvent.change(screen.getByLabelText('Motif — WN-CL-0056-001'), { target: { value: 'relecture' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer le rétablissement' }));
    await waitFor(() => expect(appelsPost()).toHaveLength(1));
    expect(JSON.parse(appelsPost()[0][1].body).sens).toBe('retablir');
  });

  it('un refus garde le motif saisi et dit l’erreur', async () => {
    fetchMock.mockImplementation(routeur(VALIDE, { ok: false, reason: 'exception', error: 'Erreur technique.' }));
    await ouvrirValides();
    fireEvent.click(screen.getByRole('button', { name: 'Exclure de la recherche' }));
    fireEvent.change(screen.getByLabelText('Motif — WN-CL-0056-001'), { target: { value: 'dossier' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer l’exclusion' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Erreur technique.'));
    expect((screen.getByLabelText('Motif — WN-CL-0056-001') as HTMLInputElement).value).toBe('dossier');
  });

  it('le filtre « exclus seulement » n’existe que dans l’onglet Validés et part dans l’URL', async () => {
    fetchMock.mockImplementation(routeur(EXCLU));
    await attendreLaFile();
    expect(screen.queryByLabelText('Exclus de la recherche seulement')).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'Validés' }));
    fireEvent.click(await screen.findByLabelText('Exclus de la recherche seulement'));
    await waitFor(() =>
      expect(appelsGet().at(-1)?.[0]).toBe('/api/praticien/corpus/claims?statut=VALIDE&limit=50&offset=0&exclu=1'),
    );
  });
});
