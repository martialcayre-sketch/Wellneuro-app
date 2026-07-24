// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgendaPraticien } from './AgendaPraticien';

const PATIENTS = [{ idPatient: 'PAT_SEED_01', nomComplet: 'Sophie Nicola' }];

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('AgendaPraticien', () => {
  beforeEach(() => vi.clearAllMocks());

  it('affiche le formulaire et l’état vide quand aucun rendez-vous', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, rendezVous: [] }) }) as unknown as Response));
    render(<AgendaPraticien patients={PATIENTS} />);
    expect(screen.getByRole('button', { name: 'Planifier' })).toBeTruthy();
    await waitFor(() => expect(screen.getByText(/Aucun rendez-vous planifié/i)).toBeTruthy());
    // Le patient est proposé dans le select.
    expect(screen.getByRole('option', { name: 'Sophie Nicola' })).toBeTruthy();
  });

  it('liste les rendez-vous chargés, groupés, avec heure et patient', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          ok: true,
          rendezVous: [
            { id: 'RDV_1', idPatient: 'PAT_SEED_01', patient: 'Sophie Nicola', dateHeure: '2026-07-15T09:00:00.000Z', motif: 'Suivi J14' },
          ],
        }),
      }) as unknown as Response),
    );
    render(<AgendaPraticien patients={PATIENTS} />);
    await waitFor(() => expect(screen.getByText('Sophie Nicola')).toBeTruthy());
    expect(screen.getByText(/Suivi J14/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeTruthy();
  });

  it('annuler retire le rendez-vous de la liste et appelle la route d’annulation', async () => {
    const appels: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, options?: { method?: string }) => {
        appels.push(url);
        if (options?.method === 'POST') return { ok: true, json: async () => ({ ok: true }) } as unknown as Response;
        return {
          ok: true,
          json: async () => ({
            ok: true,
            rendezVous: [
              { id: 'RDV_1', idPatient: 'PAT_SEED_01', patient: 'Sophie Nicola', dateHeure: '2026-07-15T09:00:00.000Z', motif: null },
            ],
          }),
        } as unknown as Response;
      }),
    );
    render(<AgendaPraticien patients={PATIENTS} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Annuler' }));
    // Le rendez-vous quitte la liste : son bouton « Annuler » disparaît (le nom
    // du patient subsiste dans le <select> du formulaire, on ne le cible pas).
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Annuler' })).toBeNull());
    expect(appels).toContain('/api/praticien/rendez-vous/annulation');
  });
});
