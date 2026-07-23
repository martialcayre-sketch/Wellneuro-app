// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Trajectoire } from '@/lib/protocol/trajectoire';
import { TrajectoirePanel } from './TrajectoirePanel';

afterEach(cleanup);

const jalons = (t0: number | null, j21: number | null): Trajectoire['cycles'][number]['jalons'] => [
  { jalon: 'T0', mesure: t0 !== null, valeur: t0, date: t0 === null ? null : '2026-01-01T00:00:00.000Z' },
  { jalon: 'J21', mesure: j21 !== null, valeur: j21, date: j21 === null ? null : '2026-01-22T00:00:00.000Z' },
  { jalon: 'J42', mesure: false, valeur: null, date: null },
  { jalon: 'J90', mesure: false, valeur: null, date: null },
];

describe('TrajectoirePanel (C2B LOT-09)', () => {
  it('empty-state quand aucun cycle', () => {
    render(<TrajectoirePanel trajectoire={null} />);
    expect(screen.getByText(/Aucun épisode confirmé/i)).toBeTruthy();
  });

  it('un cycle : jalons datés, « non mesuré », et comparaison différée au 2e cycle', () => {
    const trajectoire: Trajectoire = {
      index: [{ milestone: 'T0', date: '2026-01-01T00:00:00.000Z', cycleId: 'ep_T0' }],
      cycles: [
        {
          cycleId: 'ep_T0',
          dateT0: '2026-01-01T00:00:00.000Z',
          versionScore: 'v1',
          jalons: [
            { jalon: 'T0', mesure: true, valeur: 40, date: '2026-01-01T00:00:00.000Z' },
            { jalon: 'J21', mesure: true, valeur: 55, date: '2026-01-22T00:00:00.000Z' },
            { jalon: 'J42', mesure: false, valeur: null, date: null },
            { jalon: 'J90', mesure: false, valeur: null, date: null },
          ],
          momentum: { tendance: 'hausse', delta: 15 },
        },
      ],
      comparaison: { disponible: false, raison: 'un_seul_cycle' },
    };
    render(<TrajectoirePanel trajectoire={trajectoire} />);
    expect(screen.getByText(/indice 40/i)).toBeTruthy();
    expect(screen.getAllByText(/jalon non mesuré/i).length).toBe(2);
    // « en hausse » apparaît dans la carte de cycle ET le badge d'épisode.
    expect(screen.getAllByText(/en hausse/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/dès un 2ᵉ cycle/i)).toBeTruthy();
  });

  it('versions différentes → « non comparable »', () => {
    const trajectoire: Trajectoire = {
      index: [],
      cycles: [
        { cycleId: 'a', dateT0: '2026-01-01T00:00:00.000Z', versionScore: 'v1', jalons: [], momentum: null },
        { cycleId: 'b', dateT0: '2026-03-01T00:00:00.000Z', versionScore: 'v2', jalons: [], momentum: null },
      ],
      comparaison: { disponible: false, raison: 'versions_differentes' },
    };
    render(<TrajectoirePanel trajectoire={trajectoire} />);
    expect(screen.getByText(/Non comparable/i)).toBeTruthy();
  });
});

describe('TrajectoirePanel — index navigable (Vague 2)', () => {
  const deuxCycles: Trajectoire = {
    index: [
      { milestone: 'T0', date: '2026-01-01T00:00:00.000Z', cycleId: 'ep_a' },
      { milestone: 'J21', date: '2026-01-22T00:00:00.000Z', cycleId: 'ep_a' },
      { milestone: 'T0', date: '2026-03-01T00:00:00.000Z', cycleId: 'ep_b' },
    ],
    cycles: [
      {
        cycleId: 'ep_a',
        dateT0: '2026-01-01T00:00:00.000Z',
        versionScore: 'v1',
        jalons: jalons(40, 55),
        momentum: { tendance: 'hausse', delta: 15 },
      },
      {
        cycleId: 'ep_b',
        dateT0: '2026-03-01T00:00:00.000Z',
        versionScore: 'v1',
        jalons: jalons(48, null),
        momentum: null,
      },
    ],
    comparaison: { disponible: true, raison: 'comparable' },
  };

  it('rend l’index comme une liste de repères datés cliquables', () => {
    render(<TrajectoirePanel trajectoire={deuxCycles} />);
    const index = screen.getByRole('navigation', { name: /Index de la Spirale/i });
    const boutons = within(index).getAllByRole('button');
    expect(boutons).toHaveLength(3);
    // Les épisodes J21 confirmés étaient invisibles avant la Vague 2.
    expect(within(index).getByRole('button', { name: /J21 · 22\/01\/2026/ })).toBeTruthy();
  });

  it('sélectionner un repère met en avant le cycle qu’il documente, en toutes lettres', () => {
    render(<TrajectoirePanel trajectoire={deuxCycles} />);
    const index = screen.getByRole('navigation', { name: /Index de la Spirale/i });

    fireEvent.click(within(index).getByRole('button', { name: /J21 · 22\/01\/2026/ }));

    // Jamais la couleur seule : la mise en avant est écrite.
    expect(screen.getByText(/repère sélectionné/i)).toBeTruthy();
    expect(screen.getByText(/cycle mis en avant ci-dessous/i)).toBeTruthy();
    // Le J21 du 22/01 appartient au cycle ouvert le 01/01, pas à celui du 01/03.
    const carteA = screen.getByText(/Cycle depuis le 01\/01\/2026/).closest('div[aria-current]');
    expect(carteA).not.toBeNull();
  });

  it('un second clic désélectionne le repère', () => {
    render(<TrajectoirePanel trajectoire={deuxCycles} />);
    const index = screen.getByRole('navigation', { name: /Index de la Spirale/i });
    const bouton = within(index).getByRole('button', { name: /J21 · 22\/01\/2026/ });

    fireEvent.click(bouton);
    expect(bouton.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(bouton);
    expect(bouton.getAttribute('aria-pressed')).toBe('false');
    expect(screen.queryByText(/repère sélectionné/i)).toBeNull();
  });

  it('repère antérieur à tout T0 : le panneau le dit, il n’invente aucun rattachement', () => {
    const trajectoire: Trajectoire = {
      ...deuxCycles,
      index: [{ milestone: 'J21', date: '2025-12-01T00:00:00.000Z', cycleId: null }],
    };
    render(<TrajectoirePanel trajectoire={trajectoire} />);
    const index = screen.getByRole('navigation', { name: /Index de la Spirale/i });

    fireEvent.click(within(index).getByRole('button', { name: /J21 · 01\/12\/2025/ }));

    expect(screen.getByText(/antérieur à tout épisode T0 confirmé/i)).toBeTruthy();
    expect(screen.queryByText(/repère sélectionné/i)).toBeNull();
  });

  it('aucun index → aucune navigation affichée', () => {
    render(<TrajectoirePanel trajectoire={{ ...deuxCycles, index: [] }} />);
    expect(screen.queryByRole('navigation', { name: /Index de la Spirale/i })).toBeNull();
  });
});

describe('TrajectoirePanel — comparateur côte à côte (Vague 2)', () => {
  const comparable: Trajectoire = {
    index: [],
    cycles: [
      {
        cycleId: 'ep_a',
        dateT0: '2026-01-01T00:00:00.000Z',
        versionScore: 'v1',
        jalons: jalons(40, 55),
        momentum: { tendance: 'hausse', delta: 15 },
      },
      {
        cycleId: 'ep_b',
        dateT0: '2026-03-01T00:00:00.000Z',
        versionScore: 'v1',
        jalons: jalons(48, null),
        momentum: null,
      },
    ],
    comparaison: { disponible: true, raison: 'comparable' },
  };

  it('présente une vraie grille : une colonne par cycle, une ligne par jalon', () => {
    render(<TrajectoirePanel trajectoire={comparable} />);
    const table = screen.getByRole('table');
    expect(within(table).getByRole('columnheader', { name: /Cycle du 01\/01\/2026/ })).toBeTruthy();
    expect(within(table).getByRole('columnheader', { name: /Cycle du 01\/03\/2026/ })).toBeTruthy();
    for (const jalon of ['T0', 'J21', 'J42', 'J90']) {
      expect(within(table).getByRole('rowheader', { name: jalon })).toBeTruthy();
    }
  });

  it('une case sans mesure affiche « jalon non mesuré », jamais un 0 (A8-2)', () => {
    render(<TrajectoirePanel trajectoire={comparable} />);
    const table = screen.getByRole('table');
    // ep_b n'a pas de J21 mesuré : la case le dit, elle n'affiche pas 0.
    expect(within(table).getAllByText(/jalon non mesuré/i).length).toBeGreaterThan(0);
    expect(within(table).queryByText(/indice 0\b/)).toBeNull();
  });

  it('n’invente aucun écart entre cycles et le déclare', () => {
    render(<TrajectoirePanel trajectoire={comparable} />);
    expect(screen.getByText(/Aucun écart n’est calculé entre cycles/i)).toBeTruthy();
  });

  it('version inconnue : aucune grille, et le panneau dit « inconnue » plutôt que la version courante (gate G2)', () => {
    render(
      <TrajectoirePanel
        trajectoire={{
          ...comparable,
          cycles: [comparable.cycles[0], { ...comparable.cycles[1], versionScore: null }],
          comparaison: { disponible: false, raison: 'version_inconnue' },
        }}
      />,
    );
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText(/version de score : inconnue/i)).toBeTruthy();
    expect(screen.getByText(/version de score d’au moins un cycle est inconnue/i)).toBeTruthy();
  });

  it('versions différentes : aucune grille, seulement le bloc « non comparable » (A8-3)', () => {
    render(
      <TrajectoirePanel
        trajectoire={{
          ...comparable,
          cycles: [comparable.cycles[0], { ...comparable.cycles[1], versionScore: 'v2' }],
          comparaison: { disponible: false, raison: 'versions_differentes' },
        }}
      />,
    );
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText(/Non comparable/i)).toBeTruthy();
  });
});

describe('TrajectoirePanel — en-tête et Spirale navigable (Fiche-trajectoire 5.0)', () => {
  const deuxCycles: Trajectoire = {
    index: [
      { milestone: 'T0', date: '2026-01-01T00:00:00.000Z', cycleId: 'ep_a' },
      { milestone: 'J21', date: '2026-01-22T00:00:00.000Z', cycleId: 'ep_a' },
      { milestone: 'T0', date: '2026-03-01T00:00:00.000Z', cycleId: 'ep_b' },
    ],
    cycles: [
      {
        cycleId: 'ep_a',
        dateT0: '2026-01-01T00:00:00.000Z',
        versionScore: 'v1',
        jalons: jalons(40, 55),
        momentum: { tendance: 'hausse', delta: 15 },
      },
      {
        cycleId: 'ep_b',
        dateT0: '2026-03-01T00:00:00.000Z',
        versionScore: 'v1',
        jalons: jalons(48, null),
        momentum: null,
      },
    ],
    comparaison: { disponible: true, raison: 'comparable' },
  };

  it('affiche l’identité et l’épisode courant, avec un badge par épisode', () => {
    render(<TrajectoirePanel trajectoire={deuxCycles} nomComplet="Sophie Nicola" />);
    expect(screen.getByRole('heading', { name: 'Sophie Nicola — épisode 2' })).toBeTruthy();
    const episodes = screen.getByRole('list', { name: 'Épisodes' });
    expect(within(episodes).getByText(/Épisode 1 · T0 le 01\/01\/2026 · momentum en hausse \(écart 15\)/)).toBeTruthy();
    expect(within(episodes).getByText(/Épisode 2 · T0 le 01\/03\/2026/)).toBeTruthy();
  });

  it('sans cycle confirmé : l’identité seule — aucun épisode affirmé', () => {
    render(<TrajectoirePanel trajectoire={null} nomComplet="Sophie Nicola" />);
    expect(screen.getByRole('heading', { name: 'Sophie Nicola' })).toBeTruthy();
    expect(screen.queryByText(/— épisode/)).toBeNull();
    expect(screen.queryByRole('list', { name: 'Épisodes' })).toBeNull();
  });

  it('sans identité fournie, le titre historique demeure', () => {
    render(<TrajectoirePanel trajectoire={null} />);
    expect(screen.getByRole('heading', { name: 'Fiche-trajectoire — repères datés' })).toBeTruthy();
  });

  it('la Spirale double l’index : cliquer un arc sélectionne le même repère que le bouton texte', () => {
    render(<TrajectoirePanel trajectoire={deuxCycles} />);
    const spirale = screen.getByRole('group', { name: /Spirale de trajectoire/ });

    fireEvent.click(within(spirale).getByRole('button', { name: 'Jalon J21 du 22/01/2026 — épisode 1' }));

    // Même sélection que par le bouton texte : mise en avant écrite, bouton
    // texte pressé — une seule source d'état, pas deux navigations.
    expect(screen.getByText(/repère sélectionné/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /J21 · 22\/01\/2026/ }).getAttribute('aria-pressed')).toBe('true');

    // « Aujourd'hui » ramène au présent — même geste que la désélection.
    fireEvent.click(within(spirale).getByRole('button', { name: 'Aujourd’hui — revenir au présent' }));
    expect(screen.queryByText(/repère sélectionné/i)).toBeNull();
  });

  it('zéro repère → aucune Spirale rendue', () => {
    render(<TrajectoirePanel trajectoire={{ ...deuxCycles, index: [] }} />);
    expect(screen.queryByRole('group', { name: /Spirale de trajectoire/ })).toBeNull();
  });

  it('mode de vie au présent (LOT-02) : rendu seulement quand le canal est fourni', () => {
    const { rerender } = render(<TrajectoirePanel trajectoire={null} />);
    // Appelant sans le canal (ex. ClinicalRuntimeSection) : rien n'apparaît.
    expect(screen.queryByRole('region', { name: 'Mode de vie — 7 domaines' })).toBeNull();

    rerender(<TrajectoirePanel trajectoire={null} modeViePresent={null} />);
    // Canal fourni mais non mesuré : l'état est écrit, jamais un 0 (A8-2).
    expect(screen.getByRole('region', { name: 'Mode de vie — 7 domaines' })).toBeTruthy();
    expect(screen.getByText(/Mode de vie non mesuré à cette date/)).toBeTruthy();
  });
});

describe('TrajectoirePanel — suture time-travel (SP-CONV LOT-03)', () => {
  const trajectoire: Trajectoire = {
    index: [{ milestone: 'T0', date: '2026-01-01T00:00:00.000Z', cycleId: 'ep_T0' }],
    cycles: [
      {
        cycleId: 'ep_T0',
        dateT0: '2026-01-01T00:00:00.000Z',
        versionScore: 'v1',
        jalons: jalons(12, null),
        momentum: null,
      },
    ],
    comparaison: { disponible: false, raison: 'un_seul_cycle' },
  };

  const json = (payload: unknown, ok = true) => ({ ok, json: async () => payload });

  it('sélectionner un repère monte la lecture datée (asOf) ; « Retour au présent » la referme', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.startsWith('/api/praticien/reperes')) {
        return Promise.resolve(
          json({ ok: true, reperes: [{ date: '2026-01-01T00:00:00.000Z', source: 'episode', libelle: 'Épisode T0 confirmé' }] }),
        );
      }
      if (url.startsWith('/api/praticien/relecture-notes')) return Promise.resolve(json({ ok: true, notes: [] }));
      // LOT-02 : l'état daté du mode de vie est recalculé au même repère.
      if (url.startsWith('/api/praticien/trajectoire') && url.includes('etatAu=')) {
        return Promise.resolve(
          json({
            ok: true,
            trajectoire,
            modeViePresent: null,
            modeVieT0CycleCourant: null,
            etatDate: {
              date: '2026-01-01T00:00:00.000Z',
              modeVie: {
                domaines: [
                  {
                    id: 'SOMMEIL',
                    label: 'Sommeil',
                    total: 14,
                    max: 28,
                    interpretation: { label: 'Sommeil insuffisant', color: 'warning' },
                    zones: [],
                  },
                ],
              },
              modeVieT0: null,
            },
          }),
        );
      }
      return Promise.resolve(json({ asOf: '2026-01-01T00:00:00.000Z', proposal: { candidateResponses: [{}] } }));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<TrajectoirePanel trajectoire={trajectoire} idPatient="PAT_SEED_03" />);
    fireEvent.click(screen.getByRole('button', { name: /T0 · 01\/01\/2026/ }));

    // La lecture datée est recalculée via asOf — bannière permanente.
    await screen.findByText(/Vous lisez l’état du 01\/01\/2026/);
    expect(
      fetchMock.mock.calls.some(([url]) => String(url).includes('/api/praticien/cockpit') && String(url).includes('asOf=')),
    ).toBe(true);

    // LOT-02 : le panneau mode de vie DATÉ accompagne la lecture — recalculé
    // au repère (etatAu), zone en toutes lettres.
    await screen.findByText('Sommeil insuffisant');
    // « au 01/01/2026 » figure dans l'en-tête ET la légende du panneau daté.
    expect(screen.getAllByText(/au 01\/01\/2026/).length).toBeGreaterThan(0);
    expect(
      fetchMock.mock.calls.some(
        ([url]) => String(url).includes('/api/praticien/trajectoire') && String(url).includes('etatAu='),
      ),
    ).toBe(true);

    // Une seule sortie, explicite : retour au présent → le panneau se referme.
    fireEvent.click(screen.getByRole('button', { name: 'Retour au présent' }));
    expect(screen.queryByText(/Vous lisez l’état du/)).toBeNull();
    expect(screen.queryByText('Sommeil insuffisant')).toBeNull();
    vi.unstubAllGlobals();
  });

  it('sans idPatient, l’index reste une navigation visuelle — aucune lecture datée', () => {
    render(<TrajectoirePanel trajectoire={trajectoire} />);
    fireEvent.click(screen.getByRole('button', { name: /T0 · 01\/01\/2026/ }));
    expect(screen.queryByText(/Vous lisez l’état du/)).toBeNull();
  });
});
