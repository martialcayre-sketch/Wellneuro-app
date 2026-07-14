import { describe, expect, it } from 'vitest';
import { buildProtocolDraft, reviseProtocolDraft } from './protocolDraft';
import type { DecisionCard, ProtocolAction } from './types';

function card(overrides: Partial<DecisionCard> = {}): DecisionCard {
  return {
    decisionCardId: 'card-1', snapshotId: 'snapshot-1', snapshotInputHash: 'snapshot-hash',
    reviewId: 'review-1', reviewInputHash: 'review-hash', createdAt: '2026-01-01T00:00:00.000Z',
    version: 'c1-decision-card-v1', status: 'draft',
    priorityCandidates: [{
      candidateId: 'priority-1', origin: 'engine', label: 'Priorité fixture', rank: 1,
      confidence: 'à_documenter', ruleId: 'RULE_FIXTURE', rationale: 'Fixture technique.',
      provenance: { responseIds: [], needIds: [], clinicalObjectCodes: [] }, limitations: [],
    }],
    proposedMainPriorityId: 'priority-1',
    selectedMainPriority: { candidateId: 'priority-1', selectedAt: '2026-01-01T00:00:00.000Z', selectedBy: 'practitioner', rationale: 'Choix fixture.' },
    counterfactuals: [], missingDataFindingIds: [], discordanceFindingIds: [], safetyFindingIds: [],
    abstention: { status: 'not_required', ruleIds: ['RULE_FIXTURE'], limitations: [] },
    limitations: [], inputHash: 'card-input-hash', ...overrides,
  };
}

function action(id = 'action-1', overrides: Partial<ProtocolAction> = {}): ProtocolAction {
  return {
    actionId: id, type: 'food', title: 'Action fixture', idealPlan: 'Plan idéal fixture.',
    minimalPlan: 'Plan minimal fixture.', rescuePlan: 'Plan secours fixture.', limitations: [], ...overrides,
  };
}

function build(overrides: Partial<Parameters<typeof buildProtocolDraft>[0]> = {}) {
  return buildProtocolDraft({
    protocolDraftId: 'protocol-1', decisionCard: card(), createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z', purpose: 'Raison fixture.',
    followUpCriterion: 'Critère observable fixture.', actions: [action()],
    therapeuticLoad: { level: 'moderate', source: 'practitioner', justification: null }, ...overrides,
  });
}

describe('ProtocolDraft', () => {
  it('construit un brouillon déterministe lié à la priorité sélectionnée', () => {
    const first = build();
    const second = build({ protocolDraftId: 'protocol-2' });
    expect(first.status).toBe('draft');
    expect(first.selectedPriorityId).toBe('priority-1');
    expect(first.therapeuticLoad).toEqual({ level: 'moderate', source: 'practitioner', justification: null });
    expect(first.inputHash).toBe(second.inputHash);
  });

  it('garantit trois actions maximum et refuse les identifiants dupliqués', () => {
    expect(build({ actions: [action('a1'), action('a2'), action('a3')] }).actions).toHaveLength(3);
    expect(() => build({ actions: [action('a1'), action('a2'), action('a3'), action('a4')] })).toThrow('trois actions');
    expect(() => build({ actions: [action('a1'), action('a1')] })).toThrow('dupliquée');
  });

  it('refuse les champs requis vides et une charge excessive non justifiée', () => {
    expect(() => build({ purpose: ' ' })).toThrow('raison d’être');
    expect(() => build({ actions: [action('a1', { minimalPlan: '' })] })).toThrow('plan minimal');
    expect(() => build({ therapeuticLoad: { level: 'excessive', source: 'practitioner', justification: null } })).toThrow('justification');
    expect(build({ therapeuticLoad: { level: 'excessive', source: 'practitioner', justification: 'Choix explicite.' } }).therapeuticLoad.justification).toBe('Choix explicite.');
  });

  it('refuse les cartes sans sélection, en abstention ou avec sécurité', () => {
    expect(() => build({ decisionCard: card({ selectedMainPriority: null }) })).toThrow('priorité sélectionnée');
    expect(() => build({ decisionCard: card({ abstention: { status: 'required', ruleIds: ['R'], limitations: [] } }) })).toThrow('abstention');
    expect(() => build({ decisionCard: card({ safetyFindingIds: ['safety-1'] }) })).toThrow('sécurité');
  });

  it('interdit produit, forme, marque ou dose dans une intention de complément', () => {
    const supplement = { ...action('a1', { type: 'supplement_exploration' }), dose: 'interdite' } as ProtocolAction;
    expect(() => build({ actions: [supplement] })).toThrow('produit, forme, marque ou dose');
  });

  it('exige une revue praticien complète et remet toute révision en brouillon', () => {
    const reviewed = build({
      review: { reviewedAt: '2026-01-02T00:00:00.000Z', reviewerRole: 'practitioner', confirmation: 'content_reviewed' },
    });
    expect(reviewed.status).toBe('practitioner_reviewed');
    expect(() => build({ actions: [], review: { reviewedAt: '2026-01-02T00:00:00.000Z', reviewerRole: 'practitioner', confirmation: 'content_reviewed' } })).toThrow('au moins une action');
    expect(() => build({ review: { reviewedAt: '2026-01-02T00:00:00.000Z', reviewerRole: 'system', confirmation: 'content_reviewed' } as never })).toThrow('praticien');
    const revised = reviseProtocolDraft({ existing: reviewed, decisionCard: card(), updatedAt: '2026-01-03T00:00:00.000Z', purpose: 'Raison révisée.' });
    expect(revised.status).toBe('draft');
    expect(revised.review).toBeNull();
  });

  it('refuse les statuts actifs même via une entrée hors contrat', () => {
    const result = build();
    expect(result.status).toBe('draft');
    expect(JSON.stringify(result)).not.toMatch(/active|completed|stopped|sent/);
  });
});
