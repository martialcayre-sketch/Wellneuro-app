// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CorrespondanceMedecinPanel } from './CorrespondanceMedecinPanel';

const fetchMock = vi.fn();

const json = (payload: unknown, ok = true) => ({ ok, json: async () => payload });

const FIL_VIDE = {
  ok: true,
  correspondances: [],
  accepteConsignation: true,
  partageMedecinTraitant: null,
};

/** Route les appels comme le ferait le serveur, sans supposer leur ordre. */
function router(
  surcharges: { fil?: unknown; filOk?: boolean; post?: unknown; postOk?: boolean; syntheses?: unknown } = {},
) {
  return (url: string, options?: { method?: string }) => {
    if (options?.method === 'POST') {
      return Promise.resolve(json(surcharges.post ?? { ok: true, correspondance: {} }, surcharges.postOk ?? true));
    }
    if (url.startsWith('/api/praticien/correspondance-medecin')) {
      return Promise.resolve(json(surcharges.fil ?? FIL_VIDE, surcharges.filOk ?? true));
    }
    if (url.startsWith('/api/praticien/synthese')) {
      return Promise.resolve(json(surcharges.syntheses ?? { syntheses: [] }));
    }
    return Promise.resolve(json({}, false));
  };
}

async function attendreLeFil() {
  render(<CorrespondanceMedecinPanel idPatient="PAT_SEED_03" />);
  await waitFor(() => expect(screen.getByText(/Consigner un échange/)).toBeTruthy());
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('CorrespondanceMedecinPanel (C3 LOT-06)', () => {
  it('affiche le fil, badges de sens compris', async () => {
    fetchMock.mockImplementation(
      router({
        fil: {
          ...FIL_VIDE,
          correspondances: [
            {
              id: 'CORR_1',
              sens: 'sortant',
              medecinLibelle: 'Dr Martin',
              texte: 'Document remis.',
              idSynthese: null,
              echangeLe: null,
              consigneLe: '2026-07-22T17:00:00.000Z',
            },
            {
              id: 'CORR_2',
              sens: 'entrant',
              medecinLibelle: 'Dr Martin',
              texte: 'Réponse du médecin.',
              idSynthese: 'SYN_DISPARUE',
              echangeLe: '2026-07-20T00:00:00.000Z',
              consigneLe: '2026-07-22T18:00:00.000Z',
            },
          ],
        },
      }),
    );
    await attendreLeFil();

    expect(screen.getByText(/Envoi consigné · Dr Martin/)).toBeTruthy();
    expect(screen.getByText(/Réponse transcrite · Dr Martin/)).toBeTruthy();
    // Référence souple : un id de synthèse disparu ne casse pas la lecture.
    expect(screen.getByText(/synthèse référencée/)).toBeTruthy();
  });

  it('consigne via le contrat exact de la route, sans jamais transmettre de date de consignation', async () => {
    fetchMock.mockImplementation(router());
    await attendreLeFil();

    fireEvent.change(screen.getByLabelText(/Médecin \(désignation libre/), {
      target: { value: 'Dr Martin, médecin traitant' },
    });
    fireEvent.change(screen.getByLabelText('Texte de l’échange'), {
      target: { value: 'Document de suivi transmis.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Consigner \(daté d’aujourd’hui\)/ }));

    await waitFor(() => {
      const appelPost = fetchMock.mock.calls.find(([, options]) => options?.method === 'POST');
      expect(appelPost).toBeTruthy();
    });
    const [url, options] = fetchMock.mock.calls.find(([, options]) => options?.method === 'POST')!;
    expect(url).toBe('/api/praticien/correspondance-medecin');
    const corps = JSON.parse(options.body as string);
    expect(corps).toEqual({
      idPatient: 'PAT_SEED_03',
      sens: 'sortant',
      medecinLibelle: 'Dr Martin, médecin traitant',
      texte: 'Document de suivi transmis.',
      idSynthese: null,
      echangeLe: null,
    });
    expect(Object.keys(corps)).not.toContain('consigneLe');
  });

  it('une erreur de lecture propose « Réessayer », jamais un fil vide', async () => {
    fetchMock.mockImplementation(router({ fil: { ok: false, reason: 'exception', error: 'Erreur technique.' }, filOk: false }));
    render(<CorrespondanceMedecinPanel idPatient="PAT_SEED_03" />);

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeTruthy();
    expect(screen.queryByText(/Aucune correspondance consignée/)).toBeNull();
  });

  it('affiche tel quel le message de refus de la route (le 409 fait foi)', async () => {
    fetchMock.mockImplementation(
      router({
        post: { ok: false, reason: 'dossier_cloture', error: 'Le suivi de ce dossier est clôturé : aucun questionnaire ne peut être assigné, aucun document de suivi envoyé. Rouvrez le suivi pour reprendre.' },
        postOk: false,
      }),
    );
    await attendreLeFil();

    fireEvent.change(screen.getByLabelText(/Médecin \(désignation libre/), { target: { value: 'Dr Martin' } });
    fireEvent.change(screen.getByLabelText('Texte de l’échange'), { target: { value: 'Texte.' } });
    fireEvent.click(screen.getByRole('button', { name: /Consigner/ }));

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Rouvrez le suivi'));
  });

  it('dossier clos : formulaire absent, fil toujours lisible', async () => {
    fetchMock.mockImplementation(router({ fil: { ...FIL_VIDE, accepteConsignation: false } }));
    await attendreLeFil();

    expect(screen.getByText(/plus rien ne s’y consigne/)).toBeTruthy();
    expect(screen.queryByLabelText('Texte de l’échange')).toBeNull();
  });

  it('affiche l’état du consentement de partage sans jamais bloquer', async () => {
    fetchMock.mockImplementation(router({ fil: { ...FIL_VIDE, partageMedecinTraitant: 'accorde' } }));
    await attendreLeFil();
    expect(screen.getByText(/Partage avec le médecin traitant : accordé/)).toBeTruthy();
    // Le formulaire reste actif : l'indicateur informe, il n'interdit pas.
    expect(screen.getByLabelText('Texte de l’échange')).toBeTruthy();
  });
});
