import { describe, expect, it } from 'vitest';
import { canonicalSha256 } from '@/lib/clinical-engine/canonical';
import { buildProtocolDraft } from '@/lib/clinical-engine/protocolDraft';
import type { DecisionCard } from '@/lib/clinical-engine/types';
import { isApprovalStale } from '@/lib/protocol/diffusion';
import { ProtocolPayloadIntegrityError, reconstructProtocolDraft } from '@/lib/protocol/fromPrisma';
import {
  buildContextualFoodReading,
  buildFoodCompassDistribution,
  buildIntrinsicFoodProfile,
  buildPatientFoodCompassView,
  calculatePlatePral,
  calculatePral100g,
  createFoodCompassActionRef,
  createRecommendedPlateRef,
  areIntrinsicProfilesComparable,
  isC5Enabled,
  percentileLinear,
  getSignedFoodCompassDistribution,
  attachFoodCompassRef,
  reviewFoodCompassProtocolV2,
} from '.';
import {
  C5_DATASET_VERSION,
  type CiqualNutrientDatum,
  type FoodCompassDistribution,
  type ReferenceNutrientCode,
} from './types';
import { EXPECTED_UNITS, REFERENCE_NUTRIENT_CODES } from './mapping';

const SOURCE_REF = 'doi:10.57745/RDMHWY#compo_2025_11_03.xml';
const SOURCE_HASH = '2da725585946434df320d8041631998b';

function signedDistribution(): FoodCompassDistribution {
  return getSignedFoodCompassDistribution();
}

const SARDINE_VALUES: Record<ReferenceNutrientCode, number> = {
  '25000': 23.3,
  '31000': 0.31,
  '32000': 0,
  '34100': 0,
  '40302': 3.06,
  '40303': 5.31,
  '40304': 5.1,
  '41833': 0.18,
  '42053': 0.67,
  '42263': 1,
  '10004': 0.88,
  '10110': 300,
  '10120': 38.5,
  '10150': 306,
  '10190': 368,
  '10200': 333,
};

function sardineRows(): CiqualNutrientDatum[] {
  return REFERENCE_NUTRIENT_CODES.map(nutrientCode => ({
    datasetVersion: C5_DATASET_VERSION,
    ciqualCode: '26034',
    nutrientCode,
    value: SARDINE_VALUES[nutrientCode],
    valueStatus: 'exact',
    unit: EXPECTED_UNITS[nutrientCode],
    sourceRef: SOURCE_REF,
    sourceHash: SOURCE_HASH,
    confidenceCode: 'A',
  }));
}

function profile(rows = sardineRows()) {
  return buildIntrinsicFoodProfile({
    ciqualCode: '26034',
    foodLabel: 'Sardine, à l’huile, appertisée, égouttée',
    rows,
    distribution: signedDistribution(),
  });
}

function card(): DecisionCard {
  return {
    decisionCardId: 'card-c5', snapshotId: 'snapshot-c5', snapshotInputHash: 'snapshot-hash',
    reviewId: 'review-c5', reviewInputHash: 'review-hash', createdAt: '2026-07-18T08:00:00.000Z',
    version: 'c1-decision-card-v1', status: 'draft',
    priorityCandidates: [{
      candidateId: 'priority-c5', origin: 'engine', label: 'Équilibre de l’assiette', rank: 1,
      confidence: 'à_documenter', ruleId: 'fixture', rationale: 'Fixture LOT-03.',
      provenance: { responseIds: [], needIds: [], clinicalObjectCodes: [] }, limitations: [],
    }],
    proposedMainPriorityId: 'priority-c5',
    selectedMainPriority: {
      candidateId: 'priority-c5', selectedAt: '2026-07-18T08:00:00.000Z',
      selectedBy: 'practitioner', rationale: 'Choix praticien.',
    },
    counterfactuals: [], missingDataFindingIds: [], discordanceFindingIds: [], safetyFindingIds: [],
    abstention: { status: 'not_required', ruleIds: ['fixture'], limitations: [] },
    limitations: [], inputHash: 'decision-hash',
  };
}

function protocolV1() {
  return buildProtocolDraft({
    protocolDraftId: 'protocol-c5',
    decisionCard: card(),
    createdAt: '2026-07-18T09:00:00.000Z',
    updatedAt: '2026-07-18T09:00:00.000Z',
    purpose: 'Tester une action alimentaire.',
    followUpCriterion: 'Retour factuel à J21.',
    actions: [{
      actionId: 'food-action', type: 'food', title: 'Essai sardine',
      idealPlan: 'Plan idéal.', minimalPlan: 'Plan minimal.', rescuePlan: 'Plan secours.', limitations: [],
    }],
    therapeuticLoad: { level: 'light', source: 'practitioner', justification: null },
  });
}

function contextual() {
  return buildContextualFoodReading({
    intrinsicProfile: profile(),
    selectedPriority: { priorityId: 'priority-c5', label: 'Équilibre de l’assiette' },
    activeProtocol: { protocolDraftId: 'protocol-c5', inputHash: 'active-protocol-hash', status: 'active' },
  });
}

function reviewedProtocolBundle() {
  const v1 = protocolV1();
  const intrinsic = profile();
  const reading = buildContextualFoodReading({
    intrinsicProfile: intrinsic,
    selectedPriority: { priorityId: 'priority-c5', label: 'Équilibre de l’assiette' },
    activeProtocol: { protocolDraftId: v1.protocolDraftId, inputHash: v1.inputHash, status: 'active' },
  });
  const actionRef = createFoodCompassActionRef({ profile: intrinsic, reading });
  const draft = attachFoodCompassRef({
    protocolDraft: v1,
    actionId: 'food-action',
    actionRef,
    updatedAt: '2026-07-18T10:00:00.000Z',
    c5Enabled: true,
  });
  const reviewed = reviewFoodCompassProtocolV2({
    protocolDraft: draft,
    reviewedAt: '2026-07-18T11:00:00.000Z',
    c5Enabled: true,
  });
  const approval = {
    decisionCardInputHash: reviewed.decisionCardInputHash,
    protocolDraftInputHash: reviewed.inputHash,
    approvedAt: '2026-07-18T12:00:00.000Z',
    approvedBy: 'practitioner' as const,
    confirmation: 'content_approved_for_diffusion' as const,
  };
  return { intrinsic, reading, actionRef, draft, reviewed, approval };
}

function syntheticDistributionRows(foodCount = 3): CiqualNutrientDatum[] {
  return Array.from({ length: foodCount }, (_, foodIndex) =>
    REFERENCE_NUTRIENT_CODES.map((nutrientCode, nutrientIndex) => ({
      datasetVersion: C5_DATASET_VERSION,
      ciqualCode: `food-${foodIndex + 1}`,
      nutrientCode,
      value: foodIndex + 1 + nutrientIndex / 10,
      valueStatus: 'exact' as const,
      unit: EXPECTED_UNITS[nutrientCode],
      sourceRef: SOURCE_REF,
      sourceHash: SOURCE_HASH,
      confidenceCode: 'A' as const,
    })),
  ).flat();
}

function containsNumber(value: unknown): boolean {
  if (typeof value === 'number') return true;
  if (Array.isArray(value)) return value.some(containsNumber);
  if (value && typeof value === 'object') return Object.values(value).some(containsNumber);
  return false;
}

describe('C5A — distribution et profil intrinsèque', () => {
  it('calcule les percentiles par interpolation linéaire indépendamment de l’ordre', () => {
    expect(percentileLinear([4, 1, 3, 2], 0.05)).toBeCloseTo(1.15, 12);
    const rows = syntheticDistributionRows();
    expect(() => buildFoodCompassDistribution(rows)).toThrow('3/3484');
    expect(() => buildFoodCompassDistribution([...rows].reverse())).toThrow('3/3484');
  });

  it('reproduit la fixture clinique signée de la sardine sans arrondi intermédiaire', () => {
    const result = profile();
    expect(result.status).toBe('complete');
    expect(result.completenessPct).toBe(100);
    expect(result.pral.valueMeqPer100g).toBe(9.681);
    expect(result.aggregateScore).toBe(61.734453);
    expect(result.inputHash).toBe(profile([...sardineRows()].reverse()).inputHash);
  });

  it('n’impute aucune donnée facultative et bloque le score si le noyau obligatoire manque', () => {
    const optionalMissing = sardineRows().map(row => row.nutrientCode === '32000'
      ? { ...row, value: null, valueStatus: 'trace' as const }
      : row);
    const partial = profile(optionalMissing);
    expect(partial.status).toBe('partial_data');
    expect(partial.completenessPct).toBe(91);
    expect(partial.missingOptionalCodes).toContain('32000');
    expect(areIntrinsicProfilesComparable(profile(), partial)).toBe(false);
    expect(areIntrinsicProfilesComparable(profile(), profile())).toBe(true);

    const requiredMissing = sardineRows().map(row => row.nutrientCode === '34100'
      ? { ...row, value: null, valueStatus: 'missing' as const }
      : row);
    const insufficient = profile(requiredMissing);
    expect(insufficient.status).toBe('insufficient_data');
    expect(insufficient.aggregateScore).toBeNull();
    expect(insufficient.missingRequiredCodes).toContain('34100');
  });

  it('renormalise le profil nutritionnel à 100 quand PRAL seul manque', () => {
    const rows = sardineRows().map(row => row.nutrientCode === '10120'
      ? { ...row, value: null, valueStatus: 'below_limit' as const }
      : row);
    const result = profile(rows);
    expect(result.status).toBe('partial_data');
    expect(result.completenessPct).toBe(90);
    expect(result.pral).toMatchObject({ status: 'insufficient_data', valueMeqPer100g: null });
    expect(result.aggregateScore).not.toBeNull();
  });

  it('applique la formule PRAL et refuse tout PRAL partiel d’assiette', () => {
    expect(calculatePral100g({
      proteinG: 10, phosphorusMg: 200, potassiumMg: 400, magnesiumMg: 50, calciumMg: 100,
    })).toBeCloseTo(1.3, 12);
    expect(calculatePlatePral([{ pral100g: 1.3, grams: 150 }, { pral100g: -2, grams: 100 }]))
      .toEqual({ status: 'available', pralTotalMeq: -0.05, pralDensityMeqPer100g: -0.02 });
    expect(calculatePlatePral([{ pral100g: 1.3, grams: 150 }, { pral100g: null, grams: 100 }]))
      .toEqual({ status: 'insufficient_data', pralTotalMeq: null, pralDensityMeqPer100g: null });
  });
});

describe('C5B — contexte, patient et protocole V2', () => {
  it('exige simultanément une priorité C1 sélectionnée et un protocole C2 actif', () => {
    expect(() => buildContextualFoodReading({
      intrinsicProfile: profile(), selectedPriority: null,
      activeProtocol: { protocolDraftId: 'p', inputHash: 'h', status: 'active' },
    })).toThrow('priorité C1');
    expect(() => buildContextualFoodReading({
      intrinsicProfile: profile(), selectedPriority: { priorityId: 'p', label: 'Priorité' },
      activeProtocol: { protocolDraftId: 'p', inputHash: 'h', status: 'inactive' },
    })).toThrow('protocole C2 actif');
    expect(contextual()).toMatchObject({
      status: 'practitioner_review_required', automaticRecommendation: false, patientDiffusionAllowed: false,
    });
  });

  it('produit une vue patient strictement qualitative après validation manuelle', () => {
    const { intrinsic, reading, actionRef, reviewed, approval } = reviewedProtocolBundle();
    const patient = buildPatientFoodCompassView({
      profile: intrinsic,
      reading,
      actionRef,
      protocolDraft: reviewed,
      approval,
      qualitativeSummary: 'Peut soutenir l’essai défini avec votre praticien.',
      reasons: ['Apporte des protéines et des acides gras documentés.'],
      sourceLabel: 'Table Ciqual 2025',
      limitations: ['À replacer dans l’ensemble de l’assiette.'],
      alternative: 'Maquereau selon la faisabilité convenue.',
    });
    expect(containsNumber(patient)).toBe(false);
    expect(JSON.stringify(patient)).not.toMatch(/aggregateScore|completenessPct|normalized/);
    expect(() => buildPatientFoodCompassView({
      profile: intrinsic, reading, actionRef,
      protocolDraft: reviewed,
      approval: { ...approval, protocolDraftInputHash: 'caduc' },
      qualitativeSummary: 'Résumé', reasons: ['Raison'], sourceLabel: 'Source',
    })).toThrow('absente ou caduque');
    expect(() => buildPatientFoodCompassView({
      profile: intrinsic, reading, actionRef, protocolDraft: reviewed, approval,
      qualitativeSummary: 'Score 62/100', reasons: ['Raison'], sourceLabel: 'Source',
    })).toThrow('strictement qualitatif');
    expect(() => buildPatientFoodCompassView({
      profile: intrinsic, reading, actionRef, protocolDraft: reviewed, approval,
      qualitativeSummary: 'Résumé', reasons: ['Raison'], sourceLabel: 'Score 99/100',
    })).toThrow('strictement qualitatif');
    for (const forbiddenText of [
      'Échelle 0–100 : élevée',
      'Échelle 0-100 : élevée',
      'Résultat numérique : 62',
      'Code couleur rouge',
    ]) {
      expect(() => buildPatientFoodCompassView({
        profile: intrinsic, reading, actionRef, protocolDraft: reviewed, approval,
        qualitativeSummary: forbiddenText, reasons: ['Raison'], sourceLabel: 'Ciqual 2025',
      })).toThrow('strictement qualitatif');
    }
    const scoredLabelProfile = buildIntrinsicFoodProfile({
      ciqualCode: '26034', foodLabel: 'Sardine — score 75 %',
      rows: sardineRows(), distribution: signedDistribution(),
    });
    const scoredLabelV1 = protocolV1();
    const scoredLabelReading = buildContextualFoodReading({
      intrinsicProfile: scoredLabelProfile,
      selectedPriority: { priorityId: 'priority-c5', label: 'Équilibre de l’assiette' },
      activeProtocol: {
        protocolDraftId: scoredLabelV1.protocolDraftId,
        inputHash: scoredLabelV1.inputHash,
        status: 'active',
      },
    });
    const scoredLabelRef = createFoodCompassActionRef({
      profile: scoredLabelProfile, reading: scoredLabelReading,
    });
    const scoredLabelDraft = attachFoodCompassRef({
      protocolDraft: scoredLabelV1, actionId: 'food-action', actionRef: scoredLabelRef,
      updatedAt: '2026-07-18T10:00:00.000Z', c5Enabled: true,
    });
    const scoredLabelReviewed = reviewFoodCompassProtocolV2({
      protocolDraft: scoredLabelDraft, reviewedAt: '2026-07-18T11:00:00.000Z', c5Enabled: true,
    });
    expect(() => buildPatientFoodCompassView({
      profile: scoredLabelProfile, reading: scoredLabelReading, actionRef: scoredLabelRef,
      protocolDraft: scoredLabelReviewed,
      approval: {
        ...approval,
        decisionCardInputHash: scoredLabelReviewed.decisionCardInputHash,
        protocolDraftInputHash: scoredLabelReviewed.inputHash,
      },
      qualitativeSummary: 'Résumé', reasons: ['Raison'], sourceLabel: 'Ciqual 2025',
    })).toThrow('strictement qualitatif');
  });

  it('conserve V1, produit V2 derrière le flag et rend l’approbation antérieure caduque', () => {
    const v1 = protocolV1();
    expect(reconstructProtocolDraft(v1, v1.inputHash).version).toBe('c1-protocol-draft-v1');
    const anchoredReading = buildContextualFoodReading({
      intrinsicProfile: profile(),
      selectedPriority: { priorityId: 'priority-c5', label: 'Équilibre de l’assiette' },
      activeProtocol: { protocolDraftId: v1.protocolDraftId, inputHash: v1.inputHash, status: 'active' },
    });
    const actionRef = createFoodCompassActionRef({ profile: profile(), reading: anchoredReading });
    expect(() => buildProtocolDraft({
      protocolDraftId: 'protocol-c5-v1-invalid', decisionCard: card(),
      createdAt: '2026-07-18T09:00:00.000Z', updatedAt: '2026-07-18T09:00:00.000Z',
      purpose: 'Test.', followUpCriterion: 'Test.',
      actions: [{
        actionId: 'food-action', type: 'food', title: 'Action', idealPlan: 'Idéal',
        minimalPlan: 'Minimal', rescuePlan: 'Secours', limitations: [], foodCompassRef: actionRef,
      }],
      therapeuticLoad: { level: 'light', source: 'practitioner', justification: null },
    })).toThrow('payload protocole V2');
    expect(() => attachFoodCompassRef({
      protocolDraft: v1, actionId: 'food-action', actionRef,
      updatedAt: '2026-07-18T10:00:00.000Z', c5Enabled: false,
    })).toThrow('désactivée');
    const foreignRef = createFoodCompassActionRef({ profile: profile(), reading: contextual() });
    expect(() => attachFoodCompassRef({
      protocolDraft: v1, actionId: 'food-action', actionRef: foreignRef,
      updatedAt: '2026-07-18T10:00:00.000Z', c5Enabled: true,
    })).toThrow('version source');
    const sameHashOtherId = { ...v1, protocolDraftId: 'protocol-other-patient' };
    expect(sameHashOtherId.inputHash).toBe(v1.inputHash);
    expect(() => attachFoodCompassRef({
      protocolDraft: sameHashOtherId, actionId: 'food-action', actionRef,
      updatedAt: '2026-07-18T10:00:00.000Z', c5Enabled: true,
    })).toThrow('protocole source');
    const v2 = attachFoodCompassRef({
      protocolDraft: v1, actionId: 'food-action', actionRef,
      updatedAt: '2026-07-18T10:00:00.000Z', c5Enabled: true,
    });
    expect(v2).toMatchObject({ version: 'c1-protocol-draft-v2', status: 'draft', review: null });
    expect(v2.actions[0].foodCompassRef?.refHash).toBe(actionRef.refHash);
    expect(reconstructProtocolDraft(v2, v2.inputHash).version).toBe('c1-protocol-draft-v2');
    expect(() => attachFoodCompassRef({
      protocolDraft: v1, actionId: 'food-action', actionRef: { ...actionRef, sourceHash: 'tampered' },
      updatedAt: '2026-07-18T10:00:00.000Z', c5Enabled: true,
    })).toThrow('altérée');
    const v1WithRef = {
      ...v1,
      actions: [{ ...v1.actions[0], foodCompassRef: actionRef }],
    };
    const { protocolDraftId: _v1Id, inputHash: _v1Hash, ...v1HashInput } = v1WithRef;
    const sealedInvalidV1 = { ...v1WithRef, inputHash: canonicalSha256(v1HashInput) };
    expect(() => reconstructProtocolDraft(sealedInvalidV1, sealedInvalidV1.inputHash))
      .toThrow('Structure ou référence C5');
    const tamperedV2 = {
      ...v2,
      actions: [{ ...v2.actions[0], foodCompassRef: { ...actionRef, sourceHash: 'altéré' } }],
    };
    const { protocolDraftId: _v2Id, inputHash: _v2Hash, ...v2HashInput } = tamperedV2;
    const sealedTamperedV2 = { ...tamperedV2, inputHash: canonicalSha256(v2HashInput) };
    expect(() => reconstructProtocolDraft(sealedTamperedV2, sealedTamperedV2.inputHash))
      .toThrow('Structure ou référence C5');
    const nonFoodV2 = {
      ...v2,
      actions: [{ ...v2.actions[0], type: 'hydration' as const }],
    };
    const { protocolDraftId: _nonFoodId, inputHash: _nonFoodHash, ...nonFoodHashInput } = nonFoodV2;
    const sealedNonFoodV2 = { ...nonFoodV2, inputHash: canonicalSha256(nonFoodHashInput) };
    expect(() => reconstructProtocolDraft(sealedNonFoodV2, sealedNonFoodV2.inputHash))
      .toThrow('Structure ou référence C5');
    const invalidReviewV2 = {
      ...reviewFoodCompassProtocolV2({
        protocolDraft: v2, reviewedAt: '2026-07-18T11:00:00.000Z', c5Enabled: true,
      }),
      review: {
        reviewedAt: '2026-07-18T09:00:00.000Z',
        reviewerRole: 'system' as never,
        confirmation: 'content_reviewed' as const,
      },
    };
    const { protocolDraftId: _reviewId, inputHash: _reviewHash, ...reviewHashInput } = invalidReviewV2;
    const sealedInvalidReview = { ...invalidReviewV2, inputHash: canonicalSha256(reviewHashInput) };
    expect(() => reconstructProtocolDraft(sealedInvalidReview, sealedInvalidReview.inputHash))
      .toThrow('Structure ou référence C5');
    expect(isApprovalStale({
      id: 'approval-v1', protocolDraftInputHash: v1.inputHash,
      supersedesApprovalId: null, createdAt: new Date('2026-07-18T09:30:00.000Z'),
    }, v2.inputHash)).toBe(true);

    const unknown = { ...v2, version: 'c1-protocol-draft-v3' };
    expect(() => reconstructProtocolDraft(unknown, unknown.inputHash)).toThrow(ProtocolPayloadIntegrityError);
  });

  it('réserve une référence d’assiette versionnée sans modifier JA', () => {
    const first = createRecommendedPlateRef({ plateCode: 'plate-1', catalogVersion: 'catalog-v1', contentHash: 'content-hash' });
    const second = createRecommendedPlateRef({ plateCode: 'plate-1', catalogVersion: 'catalog-v1', contentHash: 'content-hash' });
    expect(first).toEqual(second);
    expect(first.contractVersion).toBe('c5-recommended-plate-ref-v1');
  });

  it('garde le flag fail-closed', () => {
    expect(isC5Enabled(undefined)).toBe(false);
    expect(isC5Enabled('false')).toBe(false);
    expect(isC5Enabled('TRUE')).toBe(false);
    expect(isC5Enabled('true')).toBe(true);
  });
});
