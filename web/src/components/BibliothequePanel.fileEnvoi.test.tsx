// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BibliothequePanel } from './BibliothequePanel';
import type { BibliothequeEntree } from '@/lib/bibliotheque';

// PRA-4, PR 1 (D-481 complément DOC-13, Q2 à Q4 ; textes T-67 à T-70 de
// D-488) : la file d'envoi dit son échec de lecture, l'envoi et la
// désactivation d'un instrument du cabinet demandent confirmation. Les
// attendus sont écrits à la main, mot pour mot, depuis D-488.

const ENTREE: BibliothequeEntree = {
  id: 'Q_TEST_01',
  titre: 'Instrument de banc',
  categorie: 'Sommeil',
  duree: '5 min',
  description: null,
  nbQuestions: 10,
  scoreMax: 30,
  certifie: true,
  statutCertification: 'certifie',
  assignable: true,
  aliasVers: null,
  passationPraticien: false,
};

const BROUILLON_UN = {
  idBrouillon: 'ENV_1',
  idPatient: 'PAT_SEED_01',
  prenom: 'Sophie',
  nom: 'Nicola',
  emailPatient: 'sophie@example.test',
  items: [{ id: 'Q_SOM_01', titre: 'Index de qualité du sommeil de Pittsburgh' }],
  dateLimite: null,
  notes: null,
};

const INSTRUMENT = {
  idInstrument: 'CAB_001',
  titre: 'Grille du cabinet',
  categorie: 'Sommeil',
  statutRelecture: 'valide',
  nbQuestions: 4,
  scoreMax: 12,
  updatedAt: '2026-11-14T00:00:00Z',
};

type Reponse = { ok: boolean; payload: unknown };

/** `fichiers` : une réponse par lecture de la file, la dernière se répète. */
function stubFetch({ fichiers, instruments = [] }: { fichiers: Reponse[]; instruments?: unknown[] }) {
  const appels: { url: string; init?: RequestInit }[] = [];
  let lectures = 0;
  const repondre = (r: Reponse) =>
    Promise.resolve({ ok: r.ok, status: r.ok ? 200 : 500, json: async () => r.payload } as Response);
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    appels.push({ url, init });
    if (url.startsWith('/api/praticien/file-envoi/envoyer')) {
      return repondre({ ok: true, payload: { success: true, count: 1 } });
    }
    if (url.startsWith('/api/praticien/file-envoi')) {
      return repondre(fichiers[Math.min(lectures++, fichiers.length - 1)]);
    }
    if (url.startsWith('/api/praticien/instruments') && init?.method === 'PATCH') {
      return repondre({ ok: true, payload: { success: true } });
    }
    if (url.startsWith('/api/praticien/instruments')) return repondre({ ok: true, payload: { instruments } });
    if (url.startsWith('/api/praticien/bibliotheque')) return repondre({ ok: true, payload: { entrees: [] } });
    if (url.startsWith('/api/praticien/patients')) return repondre({ ok: true, payload: { patients: [] } });
    return repondre({ ok: true, payload: {} });
  });
  return { appels };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('File d’envoi — un échec de lecture n’est pas une file vide (Q2, T-67, T-17)', () => {
  it('dit l’échec et propose « Réessayer », sans le message de file vide', async () => {
    stubFetch({ fichiers: [{ ok: false, payload: { brouillons: [], unavailable: true } }] });

    render(<BibliothequePanel entrees={[ENTREE]} />);

    expect((await screen.findByRole('alert')).textContent).toBe("La file d'envoi n'a pas pu être lue.");
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeTruthy();
    expect(screen.queryByText(/La file est vide/)).toBeNull();
  });

  it('« Réessayer » relit la seule file ; une lecture saine rend le message de file vide et le focus au titre', async () => {
    const { appels } = stubFetch({
      fichiers: [
        { ok: false, payload: { brouillons: [], unavailable: true } },
        { ok: true, payload: { brouillons: [] } },
      ],
    });

    render(<BibliothequePanel entrees={[ENTREE]} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Réessayer' }));

    expect(await screen.findByText("La file est vide — ajoutez des questionnaires depuis l'aperçu.")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: "File d'envoi" }));
    expect(appels.filter(a => a.url === '/api/praticien/file-envoi')).toHaveLength(2);
  });

  it('pas de message de file vide avant la première réponse', () => {
    vi.stubGlobal('fetch', () => new Promise(() => undefined));

    render(<BibliothequePanel entrees={[ENTREE]} />);

    expect(screen.queryByText(/La file est vide/)).toBeNull();
  });
});

describe('Envoi — confirmé avant de partir (Q3, T-68 variante N = 1, T-69)', () => {
  it('le premier clic n’envoie rien ; « Confirmer l’envoi » envoie le seul brouillon', async () => {
    const { appels } = stubFetch({
      fichiers: [{ ok: true, payload: { brouillons: [BROUILLON_UN] } }, { ok: true, payload: { brouillons: [] } }],
    });

    render(<BibliothequePanel entrees={[ENTREE]} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Envoyer (1) — un seul mail' }));

    expect(
      screen.getByRole('alertdialog', {
        name: 'Envoyer le questionnaire « Index de qualité du sommeil de Pittsburgh » à Sophie Nicola ?',
      }),
    ).toBeTruthy();
    expect(appels.filter(a => a.url.startsWith('/api/praticien/file-envoi/envoyer'))).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: "Confirmer l'envoi" }));

    await waitFor(() =>
      expect(appels.filter(a => a.url.startsWith('/api/praticien/file-envoi/envoyer'))).toHaveLength(1),
    );
    const envoi = appels.find(a => a.url.startsWith('/api/praticien/file-envoi/envoyer'));
    expect(JSON.parse(String(envoi?.init?.body))).toEqual({ idBrouillon: 'ENV_1' });
  });
});

describe('Désactivation d’un instrument du cabinet — confirmée (Q4, T-70)', () => {
  it('« Désactiver » ouvre la question ; « Annuler » ne désactive rien ; la confirmation désactive', async () => {
    const { appels } = stubFetch({
      fichiers: [{ ok: true, payload: { brouillons: [] } }],
      instruments: [INSTRUMENT],
    });
    const patchs = () => appels.filter(a => a.init?.method === 'PATCH');

    render(<BibliothequePanel entrees={[ENTREE]} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Désactiver' }));
    expect(
      screen.getByRole('alertdialog', {
        name: 'Désactiver « Grille du cabinet » ? Il sera retiré du catalogue du cabinet.',
      }),
    ).toBeTruthy();
    expect(patchs()).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Désactiver' }));
    expect(patchs()).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Désactiver' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer la désactivation' }));

    await waitFor(() => expect(patchs()).toHaveLength(1));
    expect(JSON.parse(String(patchs()[0]?.init?.body))).toEqual({
      idInstrument: 'CAB_001',
      action: 'desactiver',
    });
  });
});
