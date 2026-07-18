import { canonicalSha256 } from '@/lib/clinical-engine/canonical';
import {
  VERSION_PROTOCOL_DRAFT,
  VERSION_PROTOCOL_DRAFT_V2,
  type ProtocolDraft,
} from '@/lib/clinical-engine/types';
import {
  C5_ACTION_REF_VERSION,
  C5_AXIS_CODE,
  C5_DATASET_VERSION,
  C5_MAPPING_VERSION,
  C5_SCORE_VERSION,
  type FoodCompassActionRef,
} from './types';

export function assertFoodCompassActionRef(
  value: FoodCompassActionRef,
  expected?: { protocolDraftId?: string; selectedPriorityId?: string },
): void {
  const { refHash, ...hashInput } = value;
  if (value.contractVersion !== C5_ACTION_REF_VERSION
    || value.axisCode !== C5_AXIS_CODE
    || value.datasetVersion !== C5_DATASET_VERSION
    || value.mappingVersion !== C5_MAPPING_VERSION
    || value.scoreVersion !== C5_SCORE_VERSION
    || !value.sourceProtocolDraftId?.trim()
    || !value.sourceProtocolInputHash?.trim()
    || canonicalSha256(hashInput) !== refHash) {
    throw new TypeError('Référence C5 incompatible ou altérée.');
  }
  if ((expected?.protocolDraftId !== undefined
      && value.sourceProtocolDraftId !== expected.protocolDraftId)
    || (expected?.selectedPriorityId !== undefined
      && value.selectedPriorityId !== expected.selectedPriorityId)) {
    throw new TypeError('La référence C5 ne correspond pas au protocole source.');
  }
}

export function assertProtocolDraftC5Structure(draft: ProtocolDraft): void {
  if (draft.version !== VERSION_PROTOCOL_DRAFT && draft.version !== VERSION_PROTOCOL_DRAFT_V2) {
    throw new TypeError('Version protocole inconnue.');
  }
  const updatedAt = new Date(draft.updatedAt);
  if (!draft.updatedAt || Number.isNaN(updatedAt.getTime()) || updatedAt.toISOString() !== draft.updatedAt) {
    throw new TypeError('Horodatage protocole invalide.');
  }
  if (!Array.isArray(draft.actions)) throw new TypeError('Actions protocole invalides.');
  if (draft.status === 'draft') {
    if (draft.review !== null) throw new TypeError('Un brouillon ne peut pas porter une revue praticien.');
  } else if (draft.status === 'practitioner_reviewed') {
    const review = draft.review;
    const reviewedAt = review?.reviewedAt ?? '';
    const parsedReviewedAt = new Date(reviewedAt);
    if (!review
      || review.reviewerRole !== 'practitioner'
      || review.confirmation !== 'content_reviewed'
      || !reviewedAt
      || Number.isNaN(parsedReviewedAt.getTime())
      || parsedReviewedAt.toISOString() !== reviewedAt
      || parsedReviewedAt.getTime() < updatedAt.getTime()) {
      throw new TypeError('Revue praticien du protocole invalide.');
    }
  } else {
    throw new TypeError('Statut protocole inconnu.');
  }
  const refs = draft.actions
    .map(action => action.foodCompassRef)
    .filter((ref): ref is FoodCompassActionRef => ref !== undefined);
  if ((draft.version === VERSION_PROTOCOL_DRAFT && refs.length > 0)
    || (draft.version === VERSION_PROTOCOL_DRAFT_V2 && refs.length === 0)) {
    throw new TypeError('Structure C5 incompatible avec la version du protocole.');
  }
  draft.actions.forEach(action => {
    if (action.foodCompassRef === undefined) return;
    if (action.type !== 'food') throw new TypeError('Une référence C5 exige une action alimentaire.');
    assertFoodCompassActionRef(action.foodCompassRef, {
      protocolDraftId: draft.protocolDraftId,
      selectedPriorityId: draft.selectedPriorityId,
    });
  });
}
