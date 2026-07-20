// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LectureEtatPassePanel } from './LectureEtatPassePanel';

const fetchMock = vi.fn();

const INSTANT_RELU = '2026-01-01T00:00:00.000Z';

const reperes = [{ date: INSTANT_RELU, source: 'episode', libelle: 'Épisode T0 confirmé' }];

const json = (payload: unknown, ok = true) => ({ ok, json: async () => payload });

/** Route les appels comme le ferait le serveur, sans supposer leur ordre. */
function router(surcharges: { notes?: unknown[]; postNote?: unknown } = {}) {
  return (url: string, options?: { method?: string }) => {
    if (options?.method === 'POST') {
      return Promise.resolve(json(surcharges.postNote ?? { ok: true, note: {} }, true));
    }
    if (url.startsWith('/api/praticien/reperes')) return Promise.resolve(json({ ok: true, reperes }));
    if (url.startsWith('/api/praticien/relecture-notes')) {
      return Promise.resolve(json({ ok: true, notes: surcharges.notes ?? [] }));
    }
    return Promise.resolve(json({ asOf: INSTANT_RELU, proposal: { candidateResponses: [{}] } }));
  };
}

async function ouvrirLectureDu1erJanvier() {
  render(<LectureEtatPassePanel idPatient="PAT_SEED_03" />);
  const repere = await screen.findByRole('button', { name: /Épisode T0 confirmé/ });
  fireEvent.click(repere);
  await waitFor(() => expect(screen.getByLabelText('Note de relecture')).toBeTruthy());
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('LectureEtatPassePanel — dépôt de note (SP-TT LOT-02)', () => {
  it('dit au praticien que sa note est datée d’aujourd’hui, pas du jour relu', async () => {
    fetchMock.mockImplementation(router());
    await ouvrirLectureDu1erJanvier();

    expect(screen.getByText(/datée du jour, jamais de la date relue/i)).toBeTruthy();
    // Le bandeau de lecture passée reste affiché : la note ne le remplace pas.
    expect(screen.getByText(/ce n’est pas l’état actuel du patient/i)).toBeTruthy();
  });

  it('envoie l’instant relu dans le corps, sur la route dédiée, jamais en `asOf`', async () => {
    fetchMock.mockImplementation(router());
    await ouvrirLectureDu1erJanvier();

    fireEvent.change(screen.getByLabelText('Note de relecture'), {
      target: { value: 'Le sommeil s’était déjà dégradé.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Déposer la note/ }));

    await waitFor(() => {
      const envoi = fetchMock.mock.calls.find(([, options]) => options?.method === 'POST');
      expect(envoi).toBeTruthy();
      const [url, options] = envoi!;
      expect(url).toBe('/api/praticien/relecture-notes');
      // Aucune écriture ne passe par le cockpit ni par un mode de lecture.
      expect(url).not.toMatch(/cockpit/);
      expect(url).not.toMatch(/asOf/);
      const corps = JSON.parse(options.body as string);
      expect(corps).toMatchObject({ idPatient: 'PAT_SEED_03', instantRelu: INSTANT_RELU });
      expect(corps.texte).toBe('Le sommeil s’était déjà dégradé.');
      // La date d'écriture n'est pas l'affaire du navigateur.
      expect(corps).not.toHaveProperty('creeLe');
    });
  });

  it('affiche une note existante avec sa date d’écriture, distincte de l’état relu', async () => {
    fetchMock.mockImplementation(
      router({
        notes: [
          {
            id: 'n1',
            instantRelu: INSTANT_RELU,
            texte: 'Fatigue déjà installée.',
            creeLe: '2026-07-20T09:00:00.000Z',
            corrigeDepuisNoteId: null,
          },
        ],
      }),
    );
    await ouvrirLectureDu1erJanvier();

    expect(screen.getByText('Fatigue déjà installée.')).toBeTruthy();
    expect(screen.getByText(/Écrite le 20\/07\/2026/)).toBeTruthy();
  });

  it('ne propose pas de déposer une note vide', async () => {
    fetchMock.mockImplementation(router());
    await ouvrirLectureDu1erJanvier();

    const bouton = screen.getByRole('button', { name: /Déposer la note/ }) as HTMLButtonElement;
    expect(bouton.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('Note de relecture'), { target: { value: '   ' } });
    expect(bouton.disabled).toBe(true);
  });

  it('signale un refus serveur sans effacer le brouillon', async () => {
    fetchMock.mockImplementation(
      router({ postNote: { ok: false, reason: 'instant_hors_reperes', error: 'Date de lecture inconnue.' } }),
    );
    await ouvrirLectureDu1erJanvier();

    const zone = screen.getByLabelText('Note de relecture');
    fireEvent.change(zone, { target: { value: 'Une observation.' } });
    fireEvent.click(screen.getByRole('button', { name: /Déposer la note/ }));

    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/Date de lecture inconnue/));
    expect((zone as HTMLTextAreaElement).value).toBe('Une observation.');
  });
});
