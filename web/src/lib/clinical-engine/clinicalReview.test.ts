import { describe, expect, it } from 'vitest';
import { buildClinicalReview } from './clinicalReview';
import type {
  ClinicalRuleRef,
  ClinicalSnapshot,
  DiscordanceFinding,
  MissingDataFinding,
} from './types';

function snapshot(): ClinicalSnapshot {
  return {
    snapshotId: 'snapshot-test', patientId: 'patient-test', asOf: '2026-01-02T00:00:00.000Z',
    assessmentEpisode: {
      assessmentEpisodeId: 'episode-test', patientId: 'patient-test', milestone: 'T0',
      targetAt: '2026-01-01T00:00:00.000Z',
      window: { start: '2025-12-24T00:00:00.000Z', end: '2026-01-09T00:00:00.000Z', toleranceDays: 8 },
      candidateResponses: [{ responseId: 'response-test', questionnaireId: 'Q_TEST', observedAt: '2026-01-01T00:00:00.000Z', scoreVersion: null }],
      inWindowResponseIds: ['response-test'], outOfWindowResponseIds: [], includedResponseIds: ['response-test'],
      sourceDateRange: { min: '2026-01-01T00:00:00.000Z', max: '2026-01-01T00:00:00.000Z' },
      status: 'confirmed', confirmedAt: '2026-01-02T00:00:00.000Z',
    },
    patientContext: { mainReason: null, priorityGoal: null, expectations: [], constraints: [] },
    questionnaireFindings: [{
      responseId: 'response-test', questionnaireId: 'Q_TEST', observedAt: '2026-01-01T00:00:00.000Z',
      scoreVersion: null, evaluability: 'not_calculable', limitations: ['Source synthétique inexploitable.'],
    }],
    balanceAssessment: {
      global: { value: null, unit: 'ratio' }, globalBeforeCap: { value: null, unit: 'ratio' },
      strata: [],
      needs: [{
        needId: 1, strata: 'CORPS', measurement: { value: null, unit: 'ratio' },
        evaluability: 'not_measured', evidence: 'NON_MESURE', questionnaireIds: [],
      }],
      criticalFoundations: [], limitations: [],
    },
    clinicalObjects: [{
      code: 'GLOBAL_BALANCE', measurement: { value: null, unit: 'ratio' },
      definitionVersion: 'objets-cliniques-v1', sourceResponseIds: [], limitations: [],
    }],
    completeness: {
      availableDomains: ['questionnaires'], missingDomains: ['equilibre'], staleSources: ['response-test'],
      sourceDateRange: { min: '2026-01-01T00:00:00.000Z', max: '2026-01-01T00:00:00.000Z' },
    },
    sourceRefs: [{
      responseId: 'response-test', questionnaireId: 'Q_TEST', observedAt: '2026-01-01T00:00:00.000Z',
      scoreVersion: null, sourceType: 'questionnaire', status: 'to_verify', limitations: [],
    }],
    versions: {
      snapshotSchema: 'c1-clinical-snapshot-v1', questionnaireScoring: [], balanceScore: 'v1',
      needMapping: 'besoins-v1', clinicalObjects: 'objets-cliniques-v1',
    },
    limitations: [], inputHash: 'snapshot-input-hash-test',
  };
}

const validatedRule: ClinicalRuleRef = {
  ruleId: 'RULE_TECHNICAL_FIXTURE', version: 'fixture-v1', lifecycle: 'clinically_validated',
  validation: {
    validatedAt: '2026-01-01T00:00:00.000Z', validatorRole: 'practitioner',
    sourceReference: 'fixture-technique-sans-contenu-clinique',
  },
};

function discordance(): DiscordanceFinding {
  return {
    findingId: 'discordance-fixture', kind: 'discordance', confidence: 'à_documenter',
    audience: 'practitioner_only', interpretation: 'point_to_explore',
    signal: 'Écart synthétique à explorer.', questionToExplore: 'Quelle donnée technique doit être vérifiée ?',
    possibleProtocolImpact: 'L’impact reste indéterminé avant revue.',
    provenance: { responseIds: ['response-test'], needIds: [1], clinicalObjectCodes: ['GLOBAL_BALANCE'] },
    ruleId: validatedRule.ruleId, limitations: [],
  };
}

describe('ClinicalReview', () => {
  it('projette les absences factuelles à documenter sans zéro ni criticité clinique', () => {
    const review = buildClinicalReview({
      reviewId: 'review-1', createdAt: '2026-01-03T00:00:00.000Z', snapshot: snapshot(),
    });

    expect(review.missingData).toHaveLength(4);
    expect(review.missingData.every(finding => finding.confidence === 'à_documenter')).toBe(true);
    expect(review.missingData.every(finding => finding.priority === null)).toBe(true);
    expect(JSON.stringify(review.missingData)).not.toContain('"value":0');
    expect(review.abstention.status).toBe('not_evaluated');
    expect(review.snapshotInputHash).toBe('snapshot-input-hash-test');
  });

  it('rejette une provenance absente du snapshot', () => {
    const finding: MissingDataFinding = {
      findingId: 'missing-authored', kind: 'missing_data', confidence: 'à_documenter', priority: null,
      uncertaintyExplanation: 'Une source technique manque.', potentialDecisionImpact: 'Impact indéterminé.',
      provenance: { responseIds: ['unknown-response'], needIds: [], clinicalObjectCodes: [] },
      ruleId: null, limitations: [],
    };
    expect(() => buildClinicalReview({
      reviewId: 'review-1', createdAt: '2026-01-03T00:00:00.000Z', snapshot: snapshot(),
      findings: { missingData: [finding] },
    })).toThrow('source absente');
  });

  it('conserve une règle candidate inactive et lui interdit de produire un constat', () => {
    const candidate: ClinicalRuleRef = { ruleId: 'RULE_CANDIDATE', version: 'candidate-v1', lifecycle: 'candidate' };
    const base = buildClinicalReview({
      reviewId: 'review-1', createdAt: '2026-01-03T00:00:00.000Z', snapshot: snapshot(), rules: [candidate],
    });
    expect(base.limitations).toContain('Règle candidate inactive : RULE_CANDIDATE.');
    expect(base.abstention.status).toBe('not_evaluated');

    const requestedAbstention = buildClinicalReview({
      reviewId: 'review-abstention', createdAt: '2026-01-03T00:00:00.000Z', snapshot: snapshot(), rules: [candidate],
      findings: { abstention: { status: 'required', ruleIds: [candidate.ruleId], limitations: [] } },
    });
    expect(requestedAbstention.abstention.status).toBe('not_evaluated');

    expect(() => buildClinicalReview({
      reviewId: 'review-2', createdAt: '2026-01-03T00:00:00.000Z', snapshot: snapshot(), rules: [candidate],
      findings: { discordances: [{ ...discordance(), ruleId: candidate.ruleId }] },
    })).toThrow('candidate');
  });

  it('accepte une discordance validée uniquement comme point à explorer praticien-only', () => {
    const review = buildClinicalReview({
      reviewId: 'review-1', createdAt: '2026-01-03T00:00:00.000Z', snapshot: snapshot(),
      rules: [validatedRule], findings: { discordances: [discordance()] },
    });
    expect(review.discordances[0]).toMatchObject({
      audience: 'practitioner_only', interpretation: 'point_to_explore', ruleId: validatedRule.ruleId,
    });
    expect(review.abstention).toEqual({
      status: 'not_evaluated', ruleIds: [], limitations: ['Aucune évaluation d’abstention n’est fournie.'],
    });
  });

  it('normalise, déduplique et produit un hash stable hors reviewId sans muter le snapshot', () => {
    const source = snapshot();
    const before = JSON.stringify(source);
    const finding = discordance();
    const first = buildClinicalReview({
      reviewId: 'review-1', createdAt: '2026-01-03T00:00:00.000Z', snapshot: source,
      rules: [validatedRule, validatedRule], findings: { discordances: [finding, finding] },
    });
    const second = buildClinicalReview({
      reviewId: 'review-2', createdAt: '2026-01-03T00:00:00.000Z', snapshot: source,
      rules: [validatedRule], findings: { discordances: [finding] },
    });
    expect(first.inputHash).toBe(second.inputHash);
    expect(first.rules).toHaveLength(1);
    expect(first.discordances).toHaveLength(1);
    expect(JSON.stringify(source)).toBe(before);

    const changed = buildClinicalReview({
      reviewId: 'review-3', createdAt: '2026-01-03T00:00:00.000Z', snapshot: source,
      rules: [validatedRule], findings: { discordances: [{ ...finding, questionToExplore: 'Question modifiée ?' }] },
    });
    expect(changed.inputHash).not.toBe(first.inputHash);
  });

  it('utilise un ordre lexical portable pour les identifiants', () => {
    const authored = ['é-finding', 'a-finding', 'Z-finding'].map(findingId => ({
      findingId, kind: 'missing_data' as const, confidence: 'à_documenter' as const, priority: null,
      uncertaintyExplanation: 'Élément technique absent.', potentialDecisionImpact: 'Impact indéterminé.',
      provenance: { responseIds: [], needIds: [1], clinicalObjectCodes: [] }, ruleId: null, limitations: [],
    }));
    const review = buildClinicalReview({
      reviewId: 'review-order', createdAt: '2026-01-03T00:00:00.000Z', snapshot: snapshot(),
      findings: { missingData: authored },
    });
    expect(review.missingData.map(finding => finding.findingId).filter(id => id.endsWith('-finding')))
      .toEqual(['Z-finding', 'a-finding', 'é-finding']);
  });

  it('rejette les dates non canoniques et les nombres non JSON', () => {
    expect(() => buildClinicalReview({
      reviewId: 'review-1', createdAt: '2026-01-03', snapshot: snapshot(),
    })).toThrow('ISO canonique');
    expect(() => buildClinicalReview({
      reviewId: 'review-1', createdAt: '2026-01-03T00:00:00.000Z', snapshot: snapshot(),
      findings: { missingData: [{
        findingId: 'nan', kind: 'missing_data', confidence: 'à_documenter', priority: null,
        uncertaintyExplanation: 'Valeur technique invalide.', potentialDecisionImpact: 'Impact indéterminé.',
        provenance: { responseIds: [], needIds: [NaN], clinicalObjectCodes: [] }, ruleId: null, limitations: [],
      }] },
    })).toThrow(TypeError);
  });

  it('rejette les littéraux hors contrat, notamment toute sécurité automatique', () => {
    expect(() => buildClinicalReview({
      reviewId: 'review-1', createdAt: '2026-01-03T00:00:00.000Z', snapshot: snapshot(),
      rules: [validatedRule], findings: { safetyFindings: [{
        findingId: 'unsafe', kind: 'safety', confidence: 'fragile',
        disposition: 'automatic_diagnosis', rationale: 'Interdit.',
        provenance: { responseIds: [], needIds: [1], clinicalObjectCodes: [] },
        ruleId: validatedRule.ruleId, limitations: [],
      } as never] },
    })).toThrow('revue praticien');

    expect(() => buildClinicalReview({
      reviewId: 'review-2', createdAt: '2026-01-03T00:00:00.000Z', snapshot: snapshot(),
      findings: { missingData: [{
        findingId: 'invalid-confidence', kind: 'missing_data', confidence: 'certain-à-100%', priority: null,
        uncertaintyExplanation: 'Invalide.', potentialDecisionImpact: 'Invalide.',
        provenance: { responseIds: [], needIds: [1], clinicalObjectCodes: [] }, ruleId: null, limitations: [],
      } as never] },
    })).toThrow('qualitatif');

    expect(() => buildClinicalReview({
      reviewId: 'review-3', createdAt: '2026-01-03T00:00:00.000Z', snapshot: snapshot(),
      rules: [{
        ...validatedRule,
        validation: { ...validatedRule.validation, validatorRole: 'system' },
      } as never],
    })).toThrow('praticien');

    expect(() => buildClinicalReview({
      reviewId: 'review-4', createdAt: '2026-01-03T00:00:00.000Z', snapshot: snapshot(),
      rules: [validatedRule], findings: { missingData: [discordance() as never] },
    })).toThrow('Type de constat inattendu');
  });
});
