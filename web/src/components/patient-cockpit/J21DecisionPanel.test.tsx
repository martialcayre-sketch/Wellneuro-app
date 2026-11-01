// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { J21DecisionPanel } from './J21DecisionPanel';
import type { ResumeJ21 } from '@/lib/protocol/resumeJ21';

const reponses = { adhesion: 'plupart_des_jours', tolerance: 'bien', energie: 'stable', sommeil: 'mieux' };

const resume: ResumeJ21 = {
  score: { tendance: 'hausse', delta: 15 },
  points: [
    { pointEtape: 'J7', renseigne: true, reponses, soumisLe: '2026-10-21T08:00:00.000Z', marque: null },
    { pointEtape: 'J14', renseigne: false, reponses: null, soumisLe: null, marque: null },
    { pointEtape: 'J21', renseigne: false, reponses: null, soumisLe: null, marque: null },
  ],
  pointsRenseignes: 1,
  suivi: null,
};

// J2-jourN (H52) : le résumé d'un cycle diffusé le 14/10/2026, lu au Jour 12.
const resumeSuivi: ResumeJ21 = {
  ...resume,
  points: [
    { ...resume.points[0], marque: 'repondu' },
    { ...resume.points[1], marque: 'en_cours' },
    { ...resume.points[2], marque: 'a_venir' },
  ],
  suivi: { jourZero: '2026-10-14T16:56:42.000Z', jour: 12 },
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
      points: resume.points.map((point) => ({ ...point, renseigne: false, reponses: null, soumisLe: null })),
      pointsRenseignes: 0,
      suivi: null,
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

  // Textes validés mot pour mot par le responsable le 2026-11-01.
  it('J2-jourN : « Jour N sur 21 » daté de la diffusion, puis les marques E4', () => {
    render(<J21DecisionPanel resume={resumeSuivi} />);
    expect(screen.getByText('Jour 12 sur 21 — protocole diffusé le 14/10/2026')).toBeTruthy();
    const lignes = screen.getAllByRole('listitem').slice(0, 3).map((li) => li.textContent);
    expect(lignes).toEqual([
      'J7 · ◕ La plupart des jours · le 21/10/2026 · tolérance : Bien · énergie : Stable · sommeil : Mieux',
      'J14 · en cours',
      'J21 · à venir',
    ]);
    expect(screen.queryByText(/en attente du patient/i)).toBeNull();
  });

  it('J2-jourN : au-delà du Jour 21, la ligne le dit ; un point passé sans réponse aussi', () => {
    render(
      <J21DecisionPanel
        resume={{
          ...resumeSuivi,
          points: [resumeSuivi.points[0], { ...resumeSuivi.points[1], marque: 'pas_de_reponse' }, resumeSuivi.points[2]],
          suivi: { jourZero: '2026-10-14T16:56:42.000Z', jour: 23 },
        }}
      />,
    );
    expect(screen.getByText('Jour 23 — au-delà des 21 jours du cycle (protocole diffusé le 14/10/2026)')).toBeTruthy();
    expect(screen.getAllByRole('listitem')[1].textContent).toBe('J14 · pas de réponse');
  });

  it('J2-jourN : le pictogramme est masqué au lecteur d’écran, le mot porte le sens', () => {
    render(<J21DecisionPanel resume={resumeSuivi} />);
    const picto = screen.getByText('◕', { exact: false });
    expect(picto.getAttribute('aria-hidden')).toBe('true');
  });

  it('J2-jourN : sans jour 0, ni jour du cycle ni marque', () => {
    render(<J21DecisionPanel resume={resume} />);
    expect(screen.queryByText(/^Jour \d+/)).toBeNull();
    expect(screen.getAllByRole('listitem')[1].textContent).toBe('J14 · en attente du patient');
  });

  it('déclenche onAjuster depuis un label d’ajustement', () => {
    const onAjuster = vi.fn();
    render(<J21DecisionPanel resume={resume} onAjuster={onAjuster} />);
    fireEvent.click(screen.getByText('Alléger'));
    expect(onAjuster).toHaveBeenCalled();
  });
});
