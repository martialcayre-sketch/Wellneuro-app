// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { J21DecisionPanel } from './J21DecisionPanel';
import type { ResumeJ21 } from '@/lib/protocol/resumeJ21';

const reponses = { adhesion: 'plupart_des_jours', tolerance: 'bien', energie: 'stable', sommeil: 'mieux' };

const resume: ResumeJ21 = {
  score: { tendance: 'hausse', delta: 15 },
  points: [
    { pointEtape: 'J7', renseigne: true, reponses },
    { pointEtape: 'J14', renseigne: false, reponses: null },
    { pointEtape: 'J21', renseigne: false, reponses: null },
  ],
  pointsRenseignes: 1,
};

afterEach(cleanup);

describe('J21DecisionPanel', () => {
  it('affiche le point de jonction (score + action) et les 6 labels', () => {
    render(<J21DecisionPanel resume={resume} />);
    expect(screen.getByText(/en hausse/i)).toBeTruthy();
    expect(screen.getByText(/La plupart des jours/i)).toBeTruthy();
    // Les 6 labels de décision sont présents.
    for (const label of ['Alléger', 'Densifier', 'Pivoter', 'Continuer', 'Explorer', 'Stopper']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it('affiche « non disponible » quand le score est absent', () => {
    render(<J21DecisionPanel resume={{ ...resume, score: null }} />);
    expect(screen.getByText(/non disponible/i)).toBeTruthy();
  });

  it('déclenche onAjuster depuis un label d’ajustement', () => {
    const onAjuster = vi.fn();
    render(<J21DecisionPanel resume={resume} onAjuster={onAjuster} />);
    fireEvent.click(screen.getByText('Alléger'));
    expect(onAjuster).toHaveBeenCalled();
  });
});
