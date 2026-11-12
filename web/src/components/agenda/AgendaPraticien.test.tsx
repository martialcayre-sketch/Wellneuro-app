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
  // PRA-2a (Q4 b) : trois erreurs séparées, chacune à l'endroit de son geste.
  const LISTE_INDISPONIBLE = 'La liste des rendez-vous est momentanément indisponible.';

  it('une réponse non-ok de la liste dit l’indisponibilité dans la liste, pas l’état vide', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({ ok: false, error: 'x' }) }) as unknown as Response));
    render(<AgendaPraticien patients={PATIENTS} />);
    const alerte = await screen.findByRole('alert');
    expect(alerte.textContent).toBe(LISTE_INDISPONIBLE);
    expect(alerte.closest('section')?.querySelector('h2')?.textContent).toBe('Rendez-vous à venir');
    expect(screen.queryByText(/Aucun rendez-vous planifié/i)).toBeNull();
  });

  it('une panne réseau de la liste se dit dans la liste, pas dans le formulaire', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('réseau'); }));
    render(<AgendaPraticien patients={PATIENTS} />);
    const alerte = await screen.findByRole('alert');
    expect(alerte.textContent).toBe(LISTE_INDISPONIBLE);
    expect(alerte.closest('form')).toBeNull();
  });

  it('un échec d’annulation se dit sur la ligne du rendez-vous', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, options?: { method?: string }) => {
        if (options?.method === 'POST') return { ok: false, json: async () => ({ ok: false }) } as unknown as Response;
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
    const alerte = await screen.findByRole('alert');
    expect(alerte.textContent).toBe('Le rendez-vous n’a pas pu être annulé.');
    expect(alerte.closest('li')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeTruthy();
  });

  it('un formulaire incomplet se dit sous « Planifier », la liste reste lisible', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, rendezVous: [] }) }) as unknown as Response));
    render(<AgendaPraticien patients={PATIENTS} />);
    await screen.findByText(/Aucun rendez-vous planifié/i);
    fireEvent.click(screen.getByRole('button', { name: 'Planifier' }));
    const alerte = await screen.findByRole('alert');
    expect(alerte.closest('form')).not.toBeNull();
    expect(screen.getByText(/Aucun rendez-vous planifié/i)).toBeTruthy();
  });
});
