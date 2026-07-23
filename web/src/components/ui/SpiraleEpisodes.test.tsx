// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TrajectoireCycle } from '@/lib/protocol/trajectoire';
import { rattacherReperesAuxCycles } from '@/lib/protocol/trajectoire';
import { SpiraleEpisodes } from './SpiraleEpisodes';

afterEach(cleanup);

const jalonsVides: TrajectoireCycle['jalons'] = [];

const cycles: TrajectoireCycle[] = [
  { cycleId: 'ep_a', dateT0: '2026-01-01T00:00:00.000Z', versionScore: 'v1', jalons: jalonsVides, momentum: null },
  { cycleId: 'ep_b', dateT0: '2026-03-01T00:00:00.000Z', versionScore: 'v1', jalons: jalonsVides, momentum: null },
];

const reperes = rattacherReperesAuxCycles(
  [
    { milestone: 'T0', date: '2026-01-01T00:00:00.000Z', cycleId: 'ep_a' },
    { milestone: 'J21', date: '2026-01-22T00:00:00.000Z', cycleId: 'ep_a' },
    { milestone: 'T0', date: '2026-03-01T00:00:00.000Z', cycleId: 'ep_b' },
  ],
  cycles,
);

describe('SpiraleEpisodes', () => {
  it('zéro repère → rien : la Spirale ne s’invente pas', () => {
    const { container } = render(<SpiraleEpisodes reperes={[]} cycles={cycles} interactive />);
    expect(container.firstChild).toBeNull();
  });

  it('non interactive : décorative (aria-hidden), aucun bouton', () => {
    const { container } = render(<SpiraleEpisodes reperes={reperes} cycles={cycles} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('interactive : un arc-bouton par repère, daté et rattaché à son épisode, plus « Aujourd’hui »', () => {
    render(<SpiraleEpisodes reperes={reperes} cycles={cycles} interactive />);
    const groupe = screen.getByRole('group', { name: /Spirale de trajectoire : 3 repères confirmés/ });
    const arcs = within(groupe).getAllByRole('button');
    // 3 repères + l'arc « aujourd'hui » (revenir au présent).
    expect(arcs).toHaveLength(4);
    expect(within(groupe).getByRole('button', { name: 'Jalon T0 du 01/01/2026 — épisode 1' })).toBeTruthy();
    expect(within(groupe).getByRole('button', { name: 'Jalon J21 du 22/01/2026 — épisode 1' })).toBeTruthy();
    expect(within(groupe).getByRole('button', { name: 'Jalon T0 du 01/03/2026 — épisode 2' })).toBeTruthy();
    expect(within(groupe).getByRole('button', { name: 'Aujourd’hui — revenir au présent' })).toBeTruthy();
  });

  it('un repère non rattaché le dit — jamais rangé de force dans un épisode', () => {
    const orphelins = rattacherReperesAuxCycles(
      [{ milestone: 'J21', date: '2025-12-01T00:00:00.000Z', cycleId: null }],
      [],
    );
    render(<SpiraleEpisodes reperes={orphelins} cycles={[]} interactive />);
    expect(
      screen.getByRole('button', { name: 'Jalon J21 du 01/12/2025 — antérieur au premier épisode' }),
    ).toBeTruthy();
    // Sans cycle, aucun arc « aujourd'hui » : aucun épisode en cours n'est affirmé.
    expect(screen.queryByRole('button', { name: 'Aujourd’hui — revenir au présent' })).toBeNull();
  });

  it('clic et clavier (Entrée, Espace) émettent l’index du repère ; « Aujourd’hui » émet null', () => {
    const surSelection = vi.fn();
    render(
      <SpiraleEpisodes reperes={reperes} cycles={cycles} interactive indexActif={null} onSelectionRepere={surSelection} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Jalon J21 du 22/01/2026 — épisode 1' }));
    expect(surSelection).toHaveBeenLastCalledWith(1);

    fireEvent.keyDown(screen.getByRole('button', { name: 'Jalon T0 du 01/03/2026 — épisode 2' }), { key: 'Enter' });
    expect(surSelection).toHaveBeenLastCalledWith(2);

    fireEvent.keyDown(screen.getByRole('button', { name: 'Jalon T0 du 01/01/2026 — épisode 1' }), { key: ' ' });
    expect(surSelection).toHaveBeenLastCalledWith(0);

    fireEvent.click(screen.getByRole('button', { name: 'Aujourd’hui — revenir au présent' }));
    expect(surSelection).toHaveBeenLastCalledWith(null);
  });

  it('aria-pressed reflète la sélection : l’arc actif est pressé, « Aujourd’hui » l’est au présent', () => {
    const { rerender } = render(
      <SpiraleEpisodes reperes={reperes} cycles={cycles} interactive indexActif={1} />,
    );
    expect(
      screen.getByRole('button', { name: 'Jalon J21 du 22/01/2026 — épisode 1' }).getAttribute('aria-pressed'),
    ).toBe('true');
    expect(
      screen.getByRole('button', { name: 'Aujourd’hui — revenir au présent' }).getAttribute('aria-pressed'),
    ).toBe('false');

    rerender(<SpiraleEpisodes reperes={reperes} cycles={cycles} interactive indexActif={null} />);
    expect(
      screen.getByRole('button', { name: 'Aujourd’hui — revenir au présent' }).getAttribute('aria-pressed'),
    ).toBe('true');
  });
});
