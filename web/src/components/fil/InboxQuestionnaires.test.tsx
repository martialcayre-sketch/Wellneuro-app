// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InboxQuestionnaires } from './InboxQuestionnaires';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubInbox(payload: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => payload }) as unknown as Response));
}

describe('InboxQuestionnaires', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rend une ligne par patient — nombre, titres, lien vers la fiche', async () => {
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
    expect(screen.getByRole('link', { name: /Sophie Nicola/ }).getAttribute('href')).toBe(
      '/dashboard/patients/PAT_SEED_01',
    );
  });

  it('un fil vide dit qu’il n’y a rien à consulter, sans crier à l’erreur', async () => {
    stubInbox({ ok: true, lignes: [] });
    render(<InboxQuestionnaires />);
    await waitFor(() => expect(screen.getByText(/Aucun questionnaire en attente/i)).toBeTruthy());
  });
});
