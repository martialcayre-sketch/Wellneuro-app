// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MeteoAdhesionAside } from './MeteoAdhesionAside';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubMeteo(payload: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => payload }) as unknown as Response));
}

describe('MeteoAdhesionAside', () => {
  beforeEach(() => vi.clearAllMocks());

  it('affiche l’état par texte + symbole, jamais par la couleur seule, avec la note « jamais un score »', async () => {
    stubMeteo({
      ok: true,
      determinees: [
        { idPatient: 'PAT_SEED_01', patient: 'Sophie Nicola', etat: 'fragile', pointEtapeSource: 'J14', dateSource: null },
      ],
      nbIndeterminees: 0,
    });
    render(<MeteoAdhesionAside />);
    await waitFor(() => expect(screen.getByText('Sophie Nicola')).toBeTruthy());
    // Libellé textuel présent (le symbole ◐ est aria-hidden, le texte porte le sens).
    expect(screen.getByText('Fragile')).toBeTruthy();
    expect(screen.getByText(/jamais un score de risque chiffré/i)).toBeTruthy();
    expect(screen.getByText(/Jamais montrée aux patients/i)).toBeTruthy();
  });

  it('compte les patients indéterminés sans les reclasser', async () => {
    stubMeteo({ ok: true, determinees: [], nbIndeterminees: 3 });
    render(<MeteoAdhesionAside />);
    await waitFor(() => expect(screen.getByText(/3 patients sans point d.étape exploitable/i)).toBeTruthy());
    expect(screen.queryByText(/Interrompue/)).toBeNull();
  });

  it('une indisponibilité est dite, jamais présentée comme une patientèle vide', async () => {
    stubMeteo({ ok: false, determinees: [], nbIndeterminees: 0, unavailable: true });
    render(<MeteoAdhesionAside />);
    await waitFor(() => expect(screen.getByText(/momentanément indisponible/i)).toBeTruthy());
  });
});
