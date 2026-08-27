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
          ancre: 'T0',
          dateAncre: '2026-01-01T00:00:00.000Z',
          versionScore: 'v1',
          jalons: [
            { jalon: 'T0', mesure: true, valeur: 40, date: '2026-01-01T00:00:00.000Z' },
            { jalon: 'J21', mesure: false, valeur: null, date: null },
            { jalon: 'J42', mesure: false, valeur: null, date: null },
            { jalon: 'J90', mesure: false, valeur: null, date: null },
          ],
          momentum: null,
          momentumParBesoin: [],
        },
      ],
      discordanceOrdreCycles: false,
      comparaison: { disponible: false, raison: 'un_seul_cycle' },
    },
  },
  {
    idPatient: 'PAT002',
    prenom: 'Michel',
    nom: 'Dogné',
    email: 'michel.dogne@example.test',
    trajectoire: {
      index: [],
      cycles: [],
      comparaison: { disponible: false, raison: 'aucun_cycle' },
      discordanceOrdreCycles: false,
    },
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
    // T0 au 2026-01-01 : l'échéance J21 (22/01) est passée depuis longtemps.
    // « Prochaine échéance » se lirait « à venir » — c'est un jalon manqué.
    expect(screen.getByText(/Jalon J21 non mesuré — échéance du 22\/01\/2026 passée/)).toBeTruthy();

    // Michel : rien d'inventé.
    const ligneMichel = screen.getByRole('link', { name: /Michel Dogné/ });
    expect(ligneMichel.getAttribute('href')).toBe('/dashboard/patients/PAT002?onglet=trajectoire');
    expect(screen.getByText('Aucun épisode confirmé')).toBeTruthy();
    expect(screen.getByText('T0 à confirmer', { exact: false })).toBeTruthy();
  });

  // Pendant du cas précédent : une échéance réellement à venir reste annoncée
  // comme telle. Sans ce cas, le libellé pourrait dire « non mesuré » partout et
  // le test ci-dessus passerait quand même.
  it('un jalon dont l’échéance est à venir reste une « prochaine échéance »', async () => {
    const dateT0 = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    stubFetch({
      ok: true,
      lignes: [
        {
          ...LIGNES[0],
          trajectoire: {
            ...LIGNES[0].trajectoire,
            index: [{ milestone: 'T0', date: dateT0, cycleId: 'c1' }],
            cycles: [
              {
                ...LIGNES[0].trajectoire.cycles[0],
                dateAncre: dateT0,
                jalons: [
                  { jalon: 'T0', mesure: true, valeur: 40, date: dateT0 },
                  { jalon: 'J21', mesure: false, valeur: null, date: null },
                  { jalon: 'J42', mesure: false, valeur: null, date: null },
                  { jalon: 'J90', mesure: false, valeur: null, date: null },
                ],
              },
            ],
          },
        },
      ],
    });
    render(<TrajectoiresPanel />);

    await screen.findByRole('link', { name: /Sophie Nicola/ });
    expect(screen.getByText(/Prochaine échéance : J21 vers le/)).toBeTruthy();
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
