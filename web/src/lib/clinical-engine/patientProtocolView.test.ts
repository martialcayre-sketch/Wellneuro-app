import { describe, expect, it } from 'vitest';
import { buildPatientProtocolView } from './patientProtocolView';
import type { DecisionCard, ProtocolDiffusionApproval, ProtocolDraft } from './types';

function card(overrides: Partial<DecisionCard> = {}): DecisionCard {
  return {
    decisionCardId: 'card-1', snapshotId: 'snapshot-1', snapshotInputHash: 'snapshot-hash',
    reviewId: 'review-1', reviewInputHash: 'review-hash', createdAt: '2026-01-01T00:00:00.000Z',
    version: 'c1-decision-card-v1', status: 'draft',
    priorityCandidates: [{ candidateId: 'priority-1', origin: 'engine', label: 'Priorité fixture', rank: 1, confidence: 'à_documenter', ruleId: 'RULE_FIXTURE', rationale: 'Interne.', provenance: { responseIds: ['response-1'], needIds: [1], clinicalObjectCodes: [] }, limitations: ['Interne.'] }],
    proposedMainPriorityId: 'priority-1',
    selectedMainPriority: { candidateId: 'priority-1', selectedAt: '2026-01-01T00:00:00.000Z', selectedBy: 'practitioner', rationale: 'Choix interne.' },
    counterfactuals: [], missingDataFindingIds: ['missing-1'], discordanceFindingIds: ['discordance-1'], safetyFindingIds: [],
    abstention: { status: 'not_required', ruleIds: ['RULE_FIXTURE'], limitations: [] },
    limitations: ['Limite décision interne.'], inputHash: 'card-hash', ...overrides,
  };
}

function protocol(overrides: Partial<ProtocolDraft> = {}): ProtocolDraft {
  return {
    protocolDraftId: 'protocol-1', decisionCardId: 'card-1', decisionCardInputHash: 'card-hash',
    selectedPriorityId: 'priority-1', createdAt: '2026-01-02T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z',
    version: 'c1-protocol-draft-v1', status: 'practitioner_reviewed', purpose: 'Raison fixture.',
    followUpCriterion: 'Critère J21 fixture.', adviceSheetRef: 'fiche-fixture',
    actions: [{ actionId: 'action-1', type: 'food', title: 'Action fixture', idealPlan: 'Plan idéal interne.', minimalPlan: 'Plan minimal patient.', rescuePlan: 'Plan secours interne.', limitations: ['Interne.'] }],
    therapeuticLoad: { level: 'moderate', source: 'practitioner', justification: 'Interne.' },
    review: { reviewedAt: '2026-01-03T00:00:00.000Z', reviewerRole: 'practitioner', confirmation: 'content_reviewed' },
    limitations: ['Limite protocole interne.'], inputHash: 'protocol-hash', ...overrides,
  };
}

function approval(overrides: Partial<ProtocolDiffusionApproval> = {}): ProtocolDiffusionApproval {
  return {
    decisionCardInputHash: 'card-hash', protocolDraftInputHash: 'protocol-hash',
    approvedAt: '2026-01-04T00:00:00.000Z', approvedBy: 'practitioner',
    confirmation: 'content_approved_for_diffusion', ...overrides,
  };
}

describe('PatientProtocolView', () => {
  it('produit une projection stable indépendante des détails praticien', () => {
    const first = buildPatientProtocolView({ decisionCard: card(), protocolDraft: protocol(), approval: approval(), patientLimitations: [' Limite patient. ', 'Limite patient.'] });
    const second = buildPatientProtocolView({ decisionCard: card(), protocolDraft: protocol(), approval: approval(), patientLimitations: ['Limite patient.'] });
    expect(first).toEqual(second);
    expect(first.diffusionStatus).toBe('approved_for_diffusion');
    expect(first.deliveryStatus).toBe('not_transmitted');
    expect(first.actions[0]).toEqual({ actionId: 'action-1', type: 'food', title: 'Action fixture', minimalPlan: 'Plan minimal patient.' });
    const serialized = JSON.stringify(first);
    expect(serialized).not.toMatch(/Plan idéal|Plan secours|moderate|Choix interne|missing-1|discordance-1|response-1/);
  });

  it('refuse un protocole non relu, une abstention et un bloqueur de sécurité', () => {
    expect(() => buildPatientProtocolView({ decisionCard: card(), protocolDraft: protocol({ status: 'draft', review: null }), approval: approval() })).toThrow('relu');
    expect(() => buildPatientProtocolView({ decisionCard: card({ abstention: { status: 'required', ruleIds: ['R'], limitations: [] } }), protocolDraft: protocol(), approval: approval() })).toThrow('abstention');
    expect(() => buildPatientProtocolView({ decisionCard: card({ safetyFindingIds: ['safety-1'] }), protocolDraft: protocol(), approval: approval() })).toThrow('sécurité');
  });

  it('refuse les références, priorités et validations périmées', () => {
    expect(() => buildPatientProtocolView({ decisionCard: card(), protocolDraft: protocol({ decisionCardInputHash: 'ancien-hash' }), approval: approval() })).toThrow('correspond pas');
    expect(() => buildPatientProtocolView({ decisionCard: card(), protocolDraft: protocol({ selectedPriorityId: 'autre' }), approval: approval() })).toThrow('correspond pas');
    expect(() => buildPatientProtocolView({ decisionCard: card(), protocolDraft: protocol(), approval: approval({ protocolDraftInputHash: 'ancien-hash' }) })).toThrow('correspond plus');
  });

  it('refuse une approbation antérieure à la revue et un plan minimal vide', () => {
    expect(() => buildPatientProtocolView({ decisionCard: card(), protocolDraft: protocol(), approval: approval({ approvedAt: '2026-01-02T00:00:00.000Z' }) })).toThrow('postérieure');
    expect(() => buildPatientProtocolView({ decisionCard: card(), protocolDraft: protocol(), approval: approval({ approvedAt: '2026-01-03T00:00:00.000Z' }) })).toThrow('postérieure');
    const invalid = protocol({ actions: [{ ...protocol().actions[0], minimalPlan: ' ' }] });
    expect(() => buildPatientProtocolView({ decisionCard: card(), protocolDraft: invalid, approval: approval() })).toThrow('plan minimal');
    const unknownType = protocol({ actions: [{ ...protocol().actions[0], type: 'unknown' as never }] });
    expect(() => buildPatientProtocolView({ decisionCard: card(), protocolDraft: unknownType, approval: approval() })).toThrow('inconnu');
  });

  it('invalide une approbation dès que le hash du protocole change', () => {
    expect(() => buildPatientProtocolView({ decisionCard: card(), protocolDraft: protocol({ inputHash: 'protocol-revise' }), approval: approval() })).toThrow('correspond plus');
  });
});
