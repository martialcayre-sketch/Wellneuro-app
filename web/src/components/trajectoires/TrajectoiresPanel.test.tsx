// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LigneCabinet } from '@/lib/praticien/chargementCabinet';
import { TrajectoiresPanel } from './TrajectoiresPanel';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// Patients fictifs autorisés uniquement (CLAUDE.md).
const LIGNES: LigneCabinet[] = [
  {
    idPatient: 'PAT001',
    prenom: 'Sophie',
    nom: 'Nicola',
    email: 'sophie.nicola@example.test',
    trajectoire: {
      index: [{ milestone: 'T0', date: '2026-01-01T00:00:00.000Z', cycleId: 'c1' }],
      cycles: [
        {
          cycleId: 'c1',
          dateT0: '2026-01-01T00:00:00.000Z',
          versionScore: 'v1',
          jalons: [
            { jalon: 'T0', mesure: true, valeur: 40, date: '2026-01-01T00:00:00.000Z' },
            { jalon: 'J21', mesure: false, valeur: null, date: null },
            { jalon: 'J42', mesure: false, valeur: null, date: null },
            { jalon: 'J90', mesure: false, valeur: null, date: null },
          ],
          momentum: null,
        },
      ],
      comparaison: { disponible: false, raison: 'un_seul_cycle' },
    },
  },
  {
    idPatient: 'PAT002',
    prenom: 'Michel',
    nom: 'Dogné',
    email: 'michel.dogne@example.test',
    trajectoire: { index: [], cycles: [], comparaison: { disponible: false, raison: 'aucun_cycle' } },
  },
];

function stubFetch(payload: unknown, ok = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve({ ok, json: () => Promise.resolve(payload) })),
  );
}

describe('TrajectoiresPanel (SP-TRAJ LOT-04)', () => {
  it('erreur de lecture : jamais présentée comme un cabinet vide', async () => {
    stubFetch({ ok: false, reason: 'exception' });
    render(<TrajectoiresPanel />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByText(/n’ont pas pu être lues/)).toBeTruthy();
    expect(screen.queryByText(/Aucun patient dans le cabinet/)).toBeNull();
  });

  it('cabinet vide : état écrit, aucune liste', async () => {
    stubFetch({ ok: true, lignes: [] });
    render(<TrajectoiresPanel />);
    await waitFor(() => expect(screen.getByText(/Aucun patient dans le cabinet/)).toBeTruthy());
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('une ligne par patient : épisode réel ou « Aucun épisode confirmé », lien vers la fiche onglet Trajectoire', async () => {
    stubFetch({ ok: true, lignes: LIGNES });
    render(<TrajectoiresPanel />);

    const ligneSophie = await screen.findByRole('link', { name: /Sophie Nicola/ });
    expect(ligneSophie.getAttribute('href')).toBe('/dashboard/patients/PAT001?onglet=trajectoire');
    expect(screen.getByText(/Épisode 1 · T0 \+ \d+ j/)).toBeTruthy();
    expect(screen.getByText(/Dernier jalon T0 · indice 40/)).toBeTruthy();
    expect(screen.getByText(/Prochaine échéance : J21/)).toBeTruthy();

    // Michel : rien d'inventé.
    const ligneMichel = screen.getByRole('link', { name: /Michel Dogné/ });
    expect(ligneMichel.getAttribute('href')).toBe('/dashboard/patients/PAT002?onglet=trajectoire');
    expect(screen.getByText('Aucun épisode confirmé')).toBeTruthy();
    expect(screen.getByText('T0 à confirmer', { exact: false })).toBeTruthy();
  });

  it('recherche client : filtre par nom sans re-fetch', async () => {
    stubFetch({ ok: true, lignes: LIGNES });
    render(<TrajectoiresPanel />);
    await screen.findByRole('link', { name: /Sophie Nicola/ });

    fireEvent.change(screen.getByRole('searchbox', { name: 'Rechercher un patient' }), {
      target: { value: 'michel' },
    });
    expect(screen.queryByRole('link', { name: /Sophie Nicola/ })).toBeNull();
    expect(screen.getByRole('link', { name: /Michel Dogné/ })).toBeTruthy();
  });
});
