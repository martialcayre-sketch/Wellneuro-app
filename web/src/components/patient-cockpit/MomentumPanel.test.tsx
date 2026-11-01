// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { TrajectoireCycle } from '@/lib/protocol/trajectoire';
import type { MedianesCabinet } from '@/lib/protocol/cabinet';
import { MomentumPanel } from './MomentumPanel';

afterEach(cleanup);

function cycle(t0: number | null, j21: number | null, j42: number | null = null): TrajectoireCycle {
  return {
    cycleId: 'c1',
    ancre: 'T0',
    dateAncre: '2026-01-01T00:00:00.000Z', jourZero: '2026-01-01T00:00:00.000Z',
    versionScore: 'v1',
    jalons: [
      { jalon: 'T0', mesure: t0 !== null, valeur: t0, date: t0 === null ? null : '2026-01-01T00:00:00.000Z' },
      { jalon: 'J21', mesure: j21 !== null, valeur: j21, date: j21 === null ? null : '2026-01-22T00:00:00.000Z' },
      { jalon: 'J42', mesure: j42 !== null, valeur: j42, date: j42 === null ? null : '2026-02-12T00:00:00.000Z' },
      { jalon: 'J90', mesure: false, valeur: null, date: null },
    ],
    momentum: null,
    momentumParBesoin: [],
  };
}

const CABINET_OK: MedianesCabinet = {
  versionScoreReference: 'v1',
  nTotal: 6,
  nDossiers: 6,
  masque: false,
  parJalon: [{ jalon: 'J21', mediane: 6, n: 6, nDossiers: 6 }],
  jalonsMasques: 0,
};

const CABINET_MASQUE: MedianesCabinet = {
  versionScoreReference: 'v1',
  nTotal: 2,
  nDossiers: 2,
  masque: true,
  parJalon: [],
  jalonsMasques: 0,
};

describe('MomentumPanel (A6-R2)', () => {
  it('cycle courant sans jour 0 : aucune courbe, même avec deux jalons lus par le repli ([[D-397]] §2)', () => {
    const sansJourZero = { ...cycle(40, 50, 60), jourZero: null, motifMomentum: 'sans_jour_zero' as const };
    render(<MomentumPanel cycle={sansJourZero} cabinet={CABINET_OK} />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(
      screen.getByText('Momentum non calculé : aucun protocole n’est diffusé sur ce cycle, les jalons n’ont pas de jour 0.'),
    ).toBeTruthy();
  });

  it('moins de deux jalons mesurés : pas de courbe, un repli textuel', () => {
    render(<MomentumPanel cycle={cycle(40, null)} />);
    expect(screen.getByText(/Courbe indisponible : moins de deux jalons mesurés/)).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('sans T0 mesuré : rien n’est ancré, pas de courbe (A8-2)', () => {
    render(<MomentumPanel cycle={cycle(null, 50, 60)} />);
    expect(screen.getByText(/Courbe indisponible/)).toBeTruthy();
  });

  it('courbe : équivalent textuel complet, jalon non mesuré = trou écrit, jamais un 0', () => {
    render(<MomentumPanel cycle={cycle(40, 55)} libelle="épisode 1" />);
    const table = screen.getByRole('table');
    expect(within(table).getByText('+15')).toBeTruthy();
    // T0 est l'ancre : Δ = 0 est une valeur MESURÉE, pas un remplissage.
    expect(within(table).getByText('0')).toBeTruthy();
    // J42 et J90 non mesurés : écrits comme tels — jamais un 0 de remplissage.
    expect(within(table).getAllByText('jalon non mesuré')).toHaveLength(2);
  });

  it('repère cabinet : n= toujours affiché, jamais présenté comme une prédiction', () => {
    render(<MomentumPanel cycle={cycle(40, 55)} cabinet={CABINET_OK} />);
    expect(screen.getByText(/médiane du cabinet \(n=6 cycles comparables, 6 dossiers, version v1\)/)).toBeTruthy();
    expect(screen.getByText(/jamais une prédiction ni un objectif/)).toBeTruthy();
  });

  it('cohorte sous le seuil : repère masqué mais n= dit (A6-2)', () => {
    render(<MomentumPanel cycle={cycle(40, 55)} cabinet={CABINET_MASQUE} />);
    expect(
      screen.getByText(/à partir de 5 cycles comparables venant de 5 dossiers distincts — aujourd’hui : n=2 cycles, 2 dossiers/),
    ).toBeTruthy();
  });

  it('jalons masqués faute de cinq dossiers : l’écran dit pourquoi (D-298)', () => {
    render(
      <MomentumPanel
        cycle={cycle(40, 55)}
        cabinet={{ versionScoreReference: 'v1', nTotal: 6, nDossiers: 5, masque: false, parJalon: [], jalonsMasques: 2 }}
      />,
    );
    expect(screen.getByText(/Médianes par jalon masquées : moins de 5 dossiers distincts par jalon/)).toBeTruthy();
    expect(screen.getByText(/n=6 cycles, 5 dossiers, version v1/)).toBeTruthy();
  });
});
