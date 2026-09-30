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

  // [[D-255]], lot 4 : sans diffusion, aucun point d'étape ne court.
  it('sans diffusion sur le cycle, ne dit ni « en attente du patient » ni n’offre d’ajuster', () => {
    const vide: ResumeJ21 = {
      score: null,
      points: resume.points.map((point) => ({ ...point, renseigne: false, reponses: null })),
      pointsRenseignes: 0,
    };
    render(<J21DecisionPanel resume={vide} suiviOuvert={false} />);
    expect(screen.getByRole('status').textContent).toContain('Aucun protocole n’a été diffusé sur ce cycle');
    expect(screen.queryByText(/en attente du patient/i)).toBeNull();
    for (const label of ['Alléger', 'Densifier', 'Pivoter']) {
      expect(screen.queryByText(label)).toBeNull();
    }
  });

  it('suivi non encore su (`null`) : le panneau garde sa forme habituelle', () => {
    render(<J21DecisionPanel resume={resume} suiviOuvert={null} />);
    expect(screen.getByText('Pivoter')).toBeTruthy();
    expect(screen.queryByText(/Aucun protocole n’a été diffusé/i)).toBeNull();
  });

  it('déclenche onAjuster depuis un label d’ajustement', () => {
    const onAjuster = vi.fn();
    render(<J21DecisionPanel resume={resume} onAjuster={onAjuster} />);
    fireEvent.click(screen.getByText('Alléger'));
    expect(onAjuster).toHaveBeenCalled();
  });
});
