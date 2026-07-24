// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CorrespondanceRecente } from './CorrespondanceRecente';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubCorrespondance(payload: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => payload }) as unknown as Response));
}

describe('CorrespondanceRecente', () => {
  beforeEach(() => vi.clearAllMocks());

  it('affiche le sens, la désignation du médecin et un extrait, avec lien vers la fiche', async () => {
    stubCorrespondance({
      ok: true,
      lignes: [
        {
          id: 'C1',
          idPatient: 'PAT_SEED_01',
          patient: 'Sophie Nicola',
          sens: 'entrant',
          medecinLibelle: 'Dr Exemple',
          extrait: 'Compte rendu reçu',
          consigneLe: '2026-07-15T08:00:00.000Z',
        },
      ],
      nbRecentes7j: 1,
    });
    render(<CorrespondanceRecente />);
    await waitFor(() => expect(screen.getByText('Sophie Nicola')).toBeTruthy());
    expect(screen.getByText(/Réponse transcrite — Dr Exemple/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Sophie Nicola/ }).getAttribute('href')).toBe(
      '/dashboard/patients/PAT_SEED_01',
    );
  });

  it('aucune consignation : le panneau le dit sans erreur', async () => {
    stubCorrespondance({ ok: true, lignes: [], nbRecentes7j: 0 });
    render(<CorrespondanceRecente />);
    await waitFor(() => expect(screen.getByText(/Aucune consignation/i)).toBeTruthy());
  });
});
