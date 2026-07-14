// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DecisionSummaryCard } from './DecisionSummaryCard';
import { MissingDataPanel } from './MissingDataPanel';
import type { DecisionCard, DiscordanceFinding, MissingDataFinding } from '@/lib/clinical-engine/types';

const missing: MissingDataFinding = {
  findingId: 'missing-1', kind: 'missing_data', confidence: 'à_documenter', priority: null, ruleId: null,
  uncertaintyExplanation: 'Une donnée technique reste absente.',
  potentialDecisionImpact: 'Cette absence limite la préparation de la décision.',
  provenance: { responseIds: [], needIds: [], clinicalObjectCodes: [] }, limitations: [],
};

const discordance: DiscordanceFinding = {
  findingId: 'discordance-1', kind: 'discordance', confidence: 'fragile', ruleId: 'RULE_FIXTURE',
  audience: 'practitioner_only', interpretation: 'point_to_explore', signal: 'Écart technique à explorer.',
  questionToExplore: 'Quelle donnée faut-il vérifier ?', possibleProtocolImpact: 'La décision peut être ajustée.',
  provenance: { responseIds: [], needIds: [], clinicalObjectCodes: [] }, limitations: [],
};

describe('cockpit de décision prudent', () => {
  it('affiche les manques et discordances avec un détail repliable praticien-only', () => {
    render(<MissingDataPanel missingData={[missing]} discordances={[discordance]} />);
    expect(screen.getByText('Données manquantes')).not.toBeNull();
    expect(screen.getByText(missing.uncertaintyExplanation)).not.toBeNull();
    expect(screen.queryByText(discordance.questionToExplore)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Voir le détail' }));
    expect(screen.getByText(/Quelle donnée faut-il vérifier/)).not.toBeNull();
    expect(screen.getByText('Visible uniquement par le praticien.')).not.toBeNull();
  });

  it('affiche un état explicite quand aucune carte runtime n’existe', () => {
    render(<DecisionSummaryCard decisionCard={null} />);
    expect(screen.getByText('Décision clinique non préparée')).not.toBeNull();
    expect(screen.getByText(/validée par le praticien/)).not.toBeNull();
  });

  it('rend l’abstention comme une suspension nécessitant une revue praticien', () => {
    const card: DecisionCard = {
      decisionCardId: 'card-1', snapshotId: 'snapshot-1', snapshotInputHash: 'snapshot-hash',
      reviewId: 'review-1', reviewInputHash: 'review-hash', createdAt: '2026-01-01T00:00:00.000Z',
      version: 'c1-decision-card-v1', status: 'draft', priorityCandidates: [], proposedMainPriorityId: null,
      selectedMainPriority: null, counterfactuals: [], missingDataFindingIds: [], discordanceFindingIds: [],
      safetyFindingIds: [], abstention: { status: 'required', ruleIds: ['RULE_FIXTURE'], limitations: [] },
      limitations: ['Revue requise.'], inputHash: 'card-hash',
    };
    render(<DecisionSummaryCard decisionCard={card} />);
    expect(screen.getByText('Décision suspendue — revue praticien requise')).not.toBeNull();
  });

  it('permet de rendre les manques avant la décision', () => {
    const { container } = render(
      <>
        <MissingDataPanel missingData={[]} discordances={[]} />
        <DecisionSummaryCard decisionCard={null} />
      </>
    );
    expect(container.textContent?.indexOf('Données manquantes')).toBeLessThan(
      container.textContent?.indexOf('Décision clinique') ?? 0
    );
  });

  it('distingue une revue absente d’une revue sans manque qualifié', () => {
    const { container, rerender } = render(<MissingDataPanel missingData={null} discordances={null} />);
    expect(container.textContent).toContain('Données manquantes non évaluées');
    rerender(<MissingDataPanel missingData={[]} discordances={[]} />);
    expect(container.textContent).toContain('Aucune donnée manquante qualifiée');
  });
});
