// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Trajectoire } from '@/lib/protocol/trajectoire';
import { TrajectoirePanel } from './TrajectoirePanel';

afterEach(cleanup);

describe('TrajectoirePanel (C2B LOT-09)', () => {
  it('empty-state quand aucun cycle', () => {
    render(<TrajectoirePanel trajectoire={null} />);
    expect(screen.getByText(/Aucun épisode confirmé/i)).toBeTruthy();
  });

  it('un cycle : jalons datés, « non mesuré », et comparaison différée au 2e cycle', () => {
    const trajectoire: Trajectoire = {
      index: [{ milestone: 'T0', date: '2026-01-01T00:00:00.000Z' }],
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
    expect(screen.getByText(/en hausse/i)).toBeTruthy();
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
