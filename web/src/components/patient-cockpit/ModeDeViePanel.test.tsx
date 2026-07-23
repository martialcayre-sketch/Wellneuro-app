// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { ModeVieDate } from '@/lib/equilibre/modeVie';
import { ModeDeViePanel } from './ModeDeViePanel';

afterEach(cleanup);

const ZONES = [
  { min: 0, max: 8, label: 'Sommeil non réparateur', color: 'danger' as const },
  { min: 10, max: 14, label: 'Sommeil insuffisant', color: 'warning' as const },
  { min: 15, max: 28, label: 'Sommeil satisfaisant', color: 'success' as const },
];

const MODE_VIE: ModeVieDate = {
  domaines: [
    {
      id: 'SOMMEIL',
      label: 'Sommeil',
      total: 18,
      max: 28,
      interpretation: { label: 'Sommeil satisfaisant', color: 'success' },
      zones: ZONES,
    },
    {
      id: 'ACTIVITE_PHYSIQUE',
      label: 'Activité physique',
      total: 9,
      max: 20,
      interpretation: null,
      zones: [],
    },
  ],
};

describe('ModeDeViePanel (SP-TRAJ LOT-02)', () => {
  it('non mesuré : l’état est écrit, aucune ligne inventée (A8-2)', () => {
    render(<ModeDeViePanel modeVie={null} legendeDate="aujourd’hui" />);
    expect(screen.getByText(/Mode de vie non mesuré à cette date/)).toBeTruthy();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('une ligne par domaine : libellé, valeur mono total/max, zone en toutes lettres', () => {
    render(<ModeDeViePanel modeVie={MODE_VIE} legendeDate="aujourd’hui" />);
    const panneau = screen.getByRole('region', { name: 'Mode de vie — 7 domaines' });
    expect(within(panneau).getByText('Sommeil')).toBeTruthy();
    expect(within(panneau).getByText('18/28')).toBeTruthy();
    // Jamais la couleur seule : la zone est écrite.
    expect(within(panneau).getByText('Sommeil satisfaisant')).toBeTruthy();
  });

  it('domaine sans zone du moteur : badge neutre « Sans zone », pas de zone inventée', () => {
    render(<ModeDeViePanel modeVie={MODE_VIE} legendeDate="aujourd’hui" />);
    expect(screen.getByText('Sans zone')).toBeTruthy();
    expect(screen.getByText('9/20')).toBeTruthy();
  });

  it('fantôme T0 : la légende ne l’annonce que quand il est fourni', () => {
    const { rerender } = render(<ModeDeViePanel modeVie={MODE_VIE} legendeDate="aujourd’hui" />);
    expect(screen.queryByText(/○/)).toBeNull();

    rerender(
      <ModeDeViePanel modeVie={MODE_VIE} modeVieT0={MODE_VIE} legendeDate="aujourd’hui" legendeT0="T0 (12/06/2026)" />,
    );
    expect(screen.getByText(/○ T0 \(12\/06\/2026\)/)).toBeTruthy();
  });
});
