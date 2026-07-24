// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InboxQuestionnaires } from './InboxQuestionnaires';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function json(payload: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => payload } as unknown as Response;
}

function stubInbox(payload: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => json(payload)));
}

describe('InboxQuestionnaires', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rend une ligne par patient — nombre, titres, ouverture en lecture', async () => {
    stubInbox({
      ok: true,
      lignes: [
        {
          idPatient: 'PAT_SEED_01',
          patient: 'Sophie Nicola',
          nb: 2,
          derniereDate: '2026-07-15T08:00:00.000Z',
          titres: ['Plaintes', 'Sommeil'],
        },
      ],
    });
    render(<InboxQuestionnaires />);
    await waitFor(() => expect(screen.getByText('Sophie Nicola')).toBeTruthy());
    expect(screen.getByText('Plaintes · Sommeil')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Sophie Nicola/ })).toBeTruthy();
  });

  it('un fil vide dit qu’il n’y a rien à consulter, sans crier à l’erreur', async () => {
    stubInbox({ ok: true, lignes: [] });
    render(<InboxQuestionnaires />);
    await waitFor(() => expect(screen.getByText(/Aucun questionnaire en attente/i)).toBeTruthy());
  });

  it('ouvre la fenêtre de lecture et confirme les questionnaires lus', async () => {
    const fetchMock = vi.fn(async (input: unknown, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === 'POST') return json({ ok: true, lignes: [] });
      if (url.includes('idPatient=PAT_SEED_01')) {
        return json({
          ok: true,
          lignes: [],
          patient: { idPatient: 'PAT_SEED_01', nom: 'Sophie Nicola' },
          reponses: [
            {
              idReponse: 'REP001',
              idPatient: 'PAT_SEED_01',
              idAssignation: 'ASS001',
              idQuestionnaire: 'NEU_03',
              titre: 'Sommeil',
              dateSoumission: '2026-07-15T08:00:00.000Z',
              scoresParsed: { total: 7, rawAnswers: { Q1: 2 } },
              rawAnswers: { Q1: 2 },
              scorePrincipal: 7,
              interpretation: 'Vigilance',
              subScoreRanges: null,
            },
          ],
        });
      }
      return json({
        ok: true,
        lignes: [
          {
            idPatient: 'PAT_SEED_01',
            patient: 'Sophie Nicola',
            nb: 1,
            derniereDate: '2026-07-15T08:00:00.000Z',
            titres: ['Sommeil'],
          },
        ],
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<InboxQuestionnaires />);

    await waitFor(() => expect(screen.getByText('Sophie Nicola')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /Sophie Nicola/ }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeTruthy();
    expect(dialog.textContent).toContain('Sommeil');
    expect(dialog.textContent).toContain('Q1');

    fireEvent.click(screen.getByRole('button', { name: /Confirmer la lecture/i }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/praticien/inbox-questionnaires',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ idPatient: 'PAT_SEED_01', idsReponses: ['REP001'] }),
        }),
      ),
    );
  });
});
