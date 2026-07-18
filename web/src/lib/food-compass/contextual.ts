import { canonicalSha256 } from '@/lib/clinical-engine/canonical';
import {
  C5_ACTION_REF_VERSION,
  C5_AXIS_CODE,
  C5_CONTEXTUAL_READING_VERSION,
  C5_DATASET_VERSION,
  C5_MAPPING_VERSION,
  C5_PATIENT_VIEW_VERSION,
  C5_RECOMMENDED_PLATE_REF_VERSION,
  C5_SCORE_VERSION,
  type ContextualFoodReading,
  type FoodCompassActionRef,
  type IntrinsicFoodProfile,
  type PatientFoodCompassView,
  type RecommendedPlateRef,
} from './types';
import { assertFoodCompassActionRef, assertProtocolDraftC5Structure } from './refValidation';
import {
  VERSION_PROTOCOL_DRAFT_V2,
  type ProtocolDiffusionApproval,
  type ProtocolDraft,
} from '@/lib/clinical-engine/types';
import { recomputeDraftInputHash } from '@/lib/protocol/fromPrisma';

function nonEmpty(value: string, field: string): string {
  if (!value.trim()) throw new TypeError(`${field} est requis.`);
  return value.trim();
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))]
    .sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
}

function hasValidInputHash(value: { inputHash: string }): boolean {
  const { inputHash, ...hashInput } = value;
  return canonicalSha256(hashInput) === inputHash;
}

function assertQualitative(value: string, field: string): string {
  const normalized = nonEmpty(value, field);
  if (/\b(?:score|classement|rang)\b/iu.test(normalized)
    || /\b0\s*[-–—]\s*100\b/u.test(normalized)
    || /\b(?:résultat|valeur)\s+numérique\b/iu.test(normalized)
    || /\bcode\s+couleur\b/iu.test(normalized)
    || /\b\d+(?:[.,]\d+)?\s*(?:%|points?)\b/iu.test(normalized)
    || /\b\d+(?:[.,]\d+)?\s*(?:sur|\/)\s*100\b/iu.test(normalized)) {
    throw new TypeError(`${field} doit rester strictement qualitatif.`);
  }
  return normalized;
}

export function buildContextualFoodReading(input: {
  intrinsicProfile: IntrinsicFoodProfile;
  selectedPriority: { priorityId: string; label: string } | null;
  activeProtocol: { protocolDraftId: string; inputHash: string; status: string } | null;
  limitations?: readonly string[];
}): ContextualFoodReading {
  if (!hasValidInputHash(input.intrinsicProfile)) {
    throw new TypeError('Empreinte du profil intrinsèque incohérente.');
  }
  if (!input.selectedPriority) throw new TypeError('Une priorité C1 sélectionnée est requise.');
  if (!input.activeProtocol || input.activeProtocol.status !== 'active') {
    throw new TypeError('Un protocole C2 actif est requis.');
  }
  const selectedPriority = {
    priorityId: nonEmpty(input.selectedPriority.priorityId, 'priorityId'),
    label: nonEmpty(input.selectedPriority.label, 'libellé de priorité'),
  };
  const activeProtocol = {
    protocolDraftId: nonEmpty(input.activeProtocol.protocolDraftId, 'protocolDraftId'),
    inputHash: nonEmpty(input.activeProtocol.inputHash, 'empreinte du protocole'),
  };
  const status = input.intrinsicProfile.status === 'insufficient_data'
    ? 'insufficient_data' as const
    : 'practitioner_review_required' as const;
  const withoutHash = {
    contractVersion: C5_CONTEXTUAL_READING_VERSION,
    status,
    foodRef: input.intrinsicProfile.foodRef,
    intrinsicProfileHash: input.intrinsicProfile.inputHash,
    intrinsicProfileStatus: input.intrinsicProfile.status,
    selectedPriority,
    activeProtocol,
    automaticRecommendation: false as const,
    patientDiffusionAllowed: false as const,
    limitations: uniqueSorted([
      ...(input.limitations ?? []),
      'Lecture contextuelle soumise à la décision manuelle du praticien.',
      ...(input.intrinsicProfile.status === 'partial_data'
        ? ['Profil partiel : aucune diffusion patient automatique.']
        : []),
    ]),
  };
  return { ...withoutHash, inputHash: canonicalSha256(withoutHash) };
}

export function createFoodCompassActionRef(input: {
  profile: IntrinsicFoodProfile;
  reading: ContextualFoodReading;
}): FoodCompassActionRef {
  if (!hasValidInputHash(input.profile) || !hasValidInputHash(input.reading)) {
    throw new TypeError('Empreinte C5 incohérente.');
  }
  if (input.profile.status === 'insufficient_data' || input.profile.aggregateScore === null) {
    throw new TypeError('Une référence C5 exige un profil intrinsèque calculable.');
  }
  if (input.reading.status !== 'practitioner_review_required'
    || input.reading.intrinsicProfileHash !== input.profile.inputHash
    || input.reading.foodRef !== input.profile.foodRef) {
    throw new TypeError('La lecture contextuelle ne correspond pas au profil intrinsèque.');
  }
  const withoutHash = {
    contractVersion: C5_ACTION_REF_VERSION,
    foodRef: input.profile.foodRef,
    axisCode: C5_AXIS_CODE,
    datasetVersion: C5_DATASET_VERSION,
    mappingVersion: C5_MAPPING_VERSION,
    scoreVersion: C5_SCORE_VERSION,
    selectedPriorityId: input.reading.selectedPriority.priorityId,
    sourceProtocolDraftId: input.reading.activeProtocol.protocolDraftId,
    sourceProtocolInputHash: input.reading.activeProtocol.inputHash,
    intrinsicProfileHash: input.profile.inputHash,
    contextualReadingHash: input.reading.inputHash,
    sourceHash: input.profile.sourceHash,
  };
  return { ...withoutHash, refHash: canonicalSha256(withoutHash) };
}

export function buildPatientFoodCompassView(input: {
  profile: IntrinsicFoodProfile;
  reading: ContextualFoodReading;
  actionRef: FoodCompassActionRef;
  protocolDraft: ProtocolDraft;
  approval: ProtocolDiffusionApproval;
  qualitativeSummary: string;
  reasons: readonly string[];
  sourceLabel: string;
  limitations?: readonly string[];
  alternative?: string | null;
}): PatientFoodCompassView {
  if (!hasValidInputHash(input.profile) || !hasValidInputHash(input.reading)) {
    throw new TypeError('Empreinte C5 incohérente.');
  }
  assertFoodCompassActionRef(input.actionRef, {
    protocolDraftId: input.reading.activeProtocol.protocolDraftId,
    selectedPriorityId: input.reading.selectedPriority.priorityId,
  });
  if (input.profile.status !== 'complete') {
    throw new TypeError('Un profil partiel ou insuffisant ne peut pas être projeté automatiquement au patient.');
  }
  if (input.actionRef.intrinsicProfileHash !== input.profile.inputHash
    || input.actionRef.contextualReadingHash !== input.reading.inputHash
    || input.actionRef.foodRef !== input.profile.foodRef
    || input.actionRef.sourceProtocolInputHash !== input.reading.activeProtocol.inputHash) {
    throw new TypeError('La référence C5 est caduque.');
  }
  const draft = input.protocolDraft;
  assertProtocolDraftC5Structure(draft);
  if (draft.version !== VERSION_PROTOCOL_DRAFT_V2
    || draft.status !== 'practitioner_reviewed'
    || draft.review === null
    || recomputeDraftInputHash(draft) !== draft.inputHash
    || draft.protocolDraftId !== input.actionRef.sourceProtocolDraftId
    || draft.selectedPriorityId !== input.actionRef.selectedPriorityId
    || !draft.actions.some(action => action.type === 'food'
      && action.foodCompassRef?.refHash === input.actionRef.refHash)) {
    throw new TypeError('Le protocole approuvé ne contient pas la référence C5 attendue.');
  }
  assertFoodCompassActionRef(input.actionRef, {
    protocolDraftId: draft.protocolDraftId,
    selectedPriorityId: draft.selectedPriorityId,
  });
  if (input.approval.approvedBy !== 'practitioner'
    || input.approval.confirmation !== 'content_approved_for_diffusion'
    || input.approval.protocolDraftInputHash !== draft.inputHash
    || input.approval.decisionCardInputHash !== draft.decisionCardInputHash
    || new Date(input.approval.approvedAt).toISOString() !== input.approval.approvedAt
    || input.approval.approvedAt <= draft.review.reviewedAt) {
    throw new TypeError('La validation praticien pour diffusion est absente ou caduque.');
  }
  const reasons = uniqueSorted(input.reasons);
  if (reasons.length === 0) throw new TypeError('Au moins une raison qualitative est requise.');
  const qualitativeSummary = assertQualitative(input.qualitativeSummary, 'restitution qualitative');
  const qualitativeReasons = reasons.map(reason => assertQualitative(reason, 'raison'));
  const qualitativeLimitations = uniqueSorted(input.limitations ?? [])
    .map(limitation => assertQualitative(limitation, 'limite'));
  const alternative = input.alternative?.trim()
    ? assertQualitative(input.alternative, 'alternative')
    : null;
  const withoutHash = {
    contractVersion: C5_PATIENT_VIEW_VERSION,
    foodRef: input.profile.foodRef,
    foodLabel: assertQualitative(input.profile.foodLabel, 'libellé aliment'),
    qualitativeSummary,
    reasons: qualitativeReasons,
    sourceLabel: assertQualitative(input.sourceLabel, 'source'),
    limitations: qualitativeLimitations,
    alternative,
    protocolInputHash: draft.inputHash,
    actionRefHash: input.actionRef.refHash,
  };
  return { ...withoutHash, inputHash: canonicalSha256(withoutHash) };
}

export function createRecommendedPlateRef(input: {
  plateCode: string;
  catalogVersion: string;
  contentHash: string;
}): RecommendedPlateRef {
  const withoutHash = {
    contractVersion: C5_RECOMMENDED_PLATE_REF_VERSION,
    plateCode: nonEmpty(input.plateCode, 'plateCode'),
    catalogVersion: nonEmpty(input.catalogVersion, 'catalogVersion'),
    contentHash: nonEmpty(input.contentHash, 'contentHash'),
  };
  return { ...withoutHash, refHash: canonicalSha256(withoutHash) };
}
