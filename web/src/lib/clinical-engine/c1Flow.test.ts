import { describe, expect, it } from 'vitest';
import { proposeAssessmentEpisode, confirmAssessmentEpisode } from './assessmentEpisode';
import { buildClinicalSnapshot } from './clinicalSnapshot';
import { buildClinicalReview } from './clinicalReview';
import { buildDecisionCard } from './decisionCard';
import { buildProtocolDraft, reviseProtocolDraft } from './protocolDraft';
import { buildPatientProtocolView } from './patientProtocolView';
import type { ClinicalRuleRef, ProtocolAction, QuestionnaireResponseInput } from './types';

const response: QuestionnaireResponseInput = {
  responseId: 'response-fixture', questionnaireId: 'Q_SOM_06',
  observedAt: '2026-01-01T00:00:00.000Z', scoreVersion: 'fixture-v1',
  scoresJson: { rawAnswers: { P1: '2', P2: '2', P3: '1', P4: '1', P5: '1', P6: '1', P7: '1', P8: '1' } },
};

const validatedRule: ClinicalRuleRef = {
  ruleId: 'RULE_C1_TECHNICAL_FIXTURE', version: 'fixture-v1', lifecycle: 'clinically_validated',
  validation: {
    validatedAt: '2026-01-01T00:00:00.000Z', validatorRole: 'practitioner',
    sourceReference: 'fixture-technique-sans-portee-clinique',
  },
};

const action: ProtocolAction = {
  actionId: 'action-fixture', type: 'food', title: 'Action technique fixture',
  idealPlan: 'Plan idéal fixture', minimalPlan: 'Plan minimal fixture',
  rescuePlan: 'Plan de secours fixture', limitations: [],
};

function snapshot() {
  const proposal = proposeAssessmentEpisode({
    assessmentEpisodeId: 'episode-fixture', patientId: 'patient-fixture', milestone: 'T0',
    targetAt: '2026-01-01T00:00:00.000Z', responses: [response],
  });
  const episode = confirmAssessmentEpisode(proposal, [response.responseId], '2026-01-02T00:00:00.000Z');
  return buildClinicalSnapshot({
    snapshotId: 'snapshot-fixture', patientId: 'patient-fixture', asOf: '2026-01-02T00:00:00.000Z',
    assessmentEpisode: episode, responses: [response],
    patientContext: { mainReason: null, priorityGoal: null, expectations: [], constraints: [] },
  });
}

function nominalFlow() {
  const clinicalSnapshot = snapshot();
  const review = buildClinicalReview({
    reviewId: 'review-fixture', createdAt: '2026-01-03T00:00:00.000Z', snapshot: clinicalSnapshot,
    rules: [validatedRule],
    findings: { abstention: { status: 'not_required', ruleIds: [validatedRule.ruleId], limitations: [] } },
  });
  const decisionCard = buildDecisionCard({
    decisionCardId: 'decision-fixture', createdAt: '2026-01-04T00:00:00.000Z',
    snapshot: clinicalSnapshot, review,
    candidates: [{
      candidateId: 'priority-fixture', origin: 'engine', label: 'Priorité technique fixture', rank: 1,
      confidence: 'à_documenter', ruleId: validatedRule.ruleId, rationale: 'Fixture sans portée clinique.',
      provenance: { responseIds: [response.responseId], needIds: [], clinicalObjectCodes: [] }, limitations: [],
    }],
    proposedMainPriorityId: 'priority-fixture',
    selectedMainPriority: {
      candidateId: 'priority-fixture', selectedAt: '2026-01-04T00:00:00.000Z',
      selectedBy: 'practitioner', rationale: 'Sélection technique fixture.',
    },
  });
  const protocolDraft = buildProtocolDraft({
    protocolDraftId: 'protocol-fixture', decisionCard, createdAt: '2026-01-05T00:00:00.000Z',
    updatedAt: '2026-01-05T00:00:00.000Z', purpose: 'Raison technique fixture',
    followUpCriterion: 'Critère technique fixture', actions: [action],
    therapeuticLoad: { level: 'light', source: 'practitioner', justification: null },
    review: { reviewedAt: '2026-01-06T00:00:00.000Z', reviewerRole: 'practitioner', confirmation: 'content_reviewed' },
  });
  return { clinicalSnapshot, review, decisionCard, protocolDraft };
}

describe('replay d’intégration C1', () => {
  it('construit la chaîne nominale sans exposer les champs praticien', () => {
    const { clinicalSnapshot, review, decisionCard, protocolDraft } = nominalFlow();
    const patientView = buildPatientProtocolView({
      decisionCard, protocolDraft,
      approval: {
        decisionCardInputHash: decisionCard.inputHash, protocolDraftInputHash: protocolDraft.inputHash,
        approvedAt: '2026-01-07T00:00:00.000Z', approvedBy: 'practitioner',
        confirmation: 'content_approved_for_diffusion',
      },
    });

    expect(clinicalSnapshot.assessmentEpisode.status).toBe('confirmed');
    expect(review.missingData.length).toBeGreaterThan(0);
    expect(decisionCard.selectedMainPriority?.candidateId).toBe('priority-fixture');
    expect(protocolDraft.status).toBe('practitioner_reviewed');
    expect(patientView.deliveryStatus).toBe('not_transmitted');
    expect(patientView.actions[0]).toEqual({
      actionId: action.actionId, type: action.type, title: action.title, minimalPlan: action.minimalPlan,
    });
    expect(JSON.stringify(patientView)).not.toMatch(/Plan idéal|Plan de secours|therapeuticLoad|discordance|missingData|provenance/);
  });

  it('bloque la décision puis le protocole quand l’abstention n’est pas évaluée', () => {
    const clinicalSnapshot = snapshot();
    const review = buildClinicalReview({
      reviewId: 'review-blocked', createdAt: '2026-01-03T00:00:00.000Z', snapshot: clinicalSnapshot,
    });
    const decisionCard = buildDecisionCard({
      decisionCardId: 'decision-blocked', createdAt: '2026-01-04T00:00:00.000Z', snapshot: clinicalSnapshot, review,
    });
    expect(decisionCard.abstention.status).toBe('not_evaluated');
    expect(decisionCard.proposedMainPriorityId).toBeNull();
    expect(() => buildProtocolDraft({
      protocolDraftId: 'protocol-blocked', decisionCard, createdAt: '2026-01-05T00:00:00.000Z',
      updatedAt: '2026-01-05T00:00:00.000Z', purpose: 'Fixture', followUpCriterion: 'Fixture',
      therapeuticLoad: { level: 'light', source: 'practitioner', justification: null },
    })).toThrow('abstention');
  });

  it('bloque une sélection quand un constat de sécurité reste présent', () => {
    const clinicalSnapshot = snapshot();
    const review = buildClinicalReview({
      reviewId: 'review-safety', createdAt: '2026-01-03T00:00:00.000Z', snapshot: clinicalSnapshot,
      rules: [validatedRule],
      findings: {
        abstention: { status: 'not_required', ruleIds: [validatedRule.ruleId], limitations: [] },
        safetyFindings: [{
          findingId: 'safety-fixture', kind: 'safety', confidence: 'à_documenter',
          disposition: 'requires_practitioner_review', rationale: 'Fixture technique à revoir.',
          provenance: { responseIds: [response.responseId], needIds: [], clinicalObjectCodes: [] },
          ruleId: validatedRule.ruleId, limitations: [],
        }],
      },
    });
    expect(() => buildDecisionCard({
      decisionCardId: 'decision-safety', createdAt: '2026-01-04T00:00:00.000Z', snapshot: clinicalSnapshot, review,
      candidates: [{
        candidateId: 'priority-fixture', origin: 'engine', label: 'Priorité fixture', rank: 1,
        confidence: 'à_documenter', ruleId: validatedRule.ruleId, rationale: 'Fixture.',
        provenance: { responseIds: [], needIds: [], clinicalObjectCodes: [] }, limitations: [],
      }],
      selectedMainPriority: {
        candidateId: 'priority-fixture', selectedAt: '2026-01-04T00:00:00.000Z',
        selectedBy: 'practitioner', rationale: 'Fixture.',
      },
    })).toThrow('bloqueurs');
  });

  it('repasse en brouillon après révision et invalide l’approbation précédente', () => {
    const { decisionCard, protocolDraft } = nominalFlow();
    const revised = reviseProtocolDraft({
      existing: protocolDraft, decisionCard, updatedAt: '2026-01-08T00:00:00.000Z', purpose: 'Raison révisée',
    });
    expect(revised.status).toBe('draft');
    expect(revised.review).toBeNull();
    expect(() => buildPatientProtocolView({
      decisionCard, protocolDraft: revised,
      approval: {
        decisionCardInputHash: decisionCard.inputHash, protocolDraftInputHash: protocolDraft.inputHash,
        approvedAt: '2026-01-07T00:00:00.000Z', approvedBy: 'practitioner',
        confirmation: 'content_approved_for_diffusion',
      },
    })).toThrow('relu');
  });
});
