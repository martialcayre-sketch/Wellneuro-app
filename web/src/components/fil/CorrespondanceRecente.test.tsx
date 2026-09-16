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

const LIGNE = {
  id: 'C1',
  idPatient: 'PAT_SEED_01',
  patient: 'Sophie Nicola',
  sens: 'entrant',
  medecinLibelle: 'Dr Exemple',
  consigneLe: '2026-07-15T08:00:00.000Z',
};

describe('CorrespondanceRecente', () => {
  beforeEach(() => vi.clearAllMocks());

  it('affiche le sens et la désignation du médecin, avec lien vers la fiche', async () => {
    stubCorrespondance({ ok: true, lignes: [LIGNE] });
    render(<CorrespondanceRecente />);
    await waitFor(() => expect(screen.getByText('Sophie Nicola')).toBeTruthy());
    expect(screen.getByText(/Réponse transcrite — Dr Exemple/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Sophie Nicola/ }).getAttribute('href')).toBe(
      '/dashboard/patients/PAT_SEED_01',
    );
  });

  it('ne cite AUCUN fragment du texte consigné, même si la route en servait un', async () => {
    // Contre-épreuve : le panneau récitait 120 caractères de parole clinique
    // transcrite sur l'écran d'accueil, hors de tout journal d'accès. Le champ
    // est retiré du contrat ; ce banc tient même si quelqu'un le remet.
    stubCorrespondance({
      ok: true,
      lignes: [{ ...LIGNE, extrait: 'Le patient décrit des douleurs thoraciques à l’effort' }],
    });
    render(<CorrespondanceRecente />);
    await waitFor(() => expect(screen.getByText('Sophie Nicola')).toBeTruthy());
    expect(screen.queryByText(/douleurs thoraciques/)).toBeNull();
  });

  it('sens indéterminé : le panneau n’affirme aucune direction', async () => {
    stubCorrespondance({ ok: true, lignes: [{ ...LIGNE, id: 'C2', sens: null }] });
    render(<CorrespondanceRecente />);
    await waitFor(() => expect(screen.getByText('Sophie Nicola')).toBeTruthy());
    expect(screen.getByText(/Échange consigné — Dr Exemple/)).toBeTruthy();
    expect(screen.queryByText(/Envoi consigné/)).toBeNull();
    expect(screen.queryByText(/Réponse transcrite/)).toBeNull();
  });

  it('aucune consignation : le panneau le dit sans erreur', async () => {
    stubCorrespondance({ ok: true, lignes: [] });
    render(<CorrespondanceRecente />);
    await waitFor(() => expect(screen.getByText(/Aucune consignation/i)).toBeTruthy());
  });
});
