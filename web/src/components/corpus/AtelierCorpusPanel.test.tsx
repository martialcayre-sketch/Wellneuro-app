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

  it('l’annulation de l’armement ne signe rien', async () => {
    fetchMock.mockImplementation(router());
    await attendreLaFile();

    fireEvent.click(screen.getByRole('button', { name: 'Valider' }));
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(screen.getByRole('button', { name: 'Valider' })).toBeTruthy();
    expect(appelsPost()).toHaveLength(0);
  });

  it('rejette en un geste (décision réversible depuis l’onglet Rejetés)', async () => {
    fetchMock.mockImplementation(router());
    await attendreLaFile();

    fireEvent.click(screen.getByRole('button', { name: 'Rejeter' }));
    await waitFor(() => {
      const posts = appelsPost();
      expect(posts).toHaveLength(1);
      expect(posts[0][0]).toBe(URL_DECISION);
      expect(JSON.parse(posts[0][1].body)).toEqual({
        id: CLAIM.id,
        decision: 'REJETE',
        statutAttendu: 'EN_ATTENTE_VALIDATION',
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

    fireEvent.click(screen.getByRole('button', { name: 'Rejeter' }));
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
});
