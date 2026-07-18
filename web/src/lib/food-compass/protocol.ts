import { canonicalSha256 } from '@/lib/clinical-engine/canonical';
import {
  VERSION_PROTOCOL_DRAFT_V2,
  type ProtocolDraft,
} from '@/lib/clinical-engine/types';
import type { FoodCompassActionRef } from './types';
import { assertFoodCompassActionRef, assertProtocolDraftC5Structure } from './refValidation';
import { recomputeDraftInputHash } from '@/lib/protocol/fromPrisma';

function canonicalIso(value: string): string {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime()) || date.toISOString() !== value) {
    throw new TypeError('updatedAt doit être une date ISO canonique valide.');
  }
  return value;
}

export function attachFoodCompassRef(input: {
  protocolDraft: ProtocolDraft;
  actionId: string;
  actionRef: FoodCompassActionRef;
  updatedAt: string;
  c5Enabled: boolean;
}): ProtocolDraft {
  if (!input.c5Enabled) throw new TypeError('C5 est désactivée.');
  if (recomputeDraftInputHash(input.protocolDraft) !== input.protocolDraft.inputHash) {
    throw new TypeError('Empreinte du protocole source incohérente.');
  }
  assertProtocolDraftC5Structure(input.protocolDraft);
  assertFoodCompassActionRef(input.actionRef, {
    protocolDraftId: input.protocolDraft.protocolDraftId,
    selectedPriorityId: input.protocolDraft.selectedPriorityId,
  });
  if (input.actionRef.sourceProtocolInputHash !== input.protocolDraft.inputHash
    || input.actionRef.sourceProtocolDraftId !== input.protocolDraft.protocolDraftId) {
    throw new TypeError('La référence C5 ne correspond pas à la version source du protocole.');
  }
  canonicalIso(input.updatedAt);
  if (input.updatedAt <= input.protocolDraft.updatedAt) {
    throw new TypeError('La version C5 doit être postérieure au protocole courant.');
  }
  let matched = false;
  const actions = input.protocolDraft.actions.map(action => {
    if (action.actionId !== input.actionId) return action;
    matched = true;
    if (action.type !== 'food') throw new TypeError('Une référence C5 ne peut viser qu’une action alimentaire.');
    return { ...action, foodCompassRef: { ...input.actionRef } };
  });
  if (!matched) throw new TypeError('Action protocole introuvable.');
  const withoutHash = {
    ...input.protocolDraft,
    updatedAt: input.updatedAt,
    version: VERSION_PROTOCOL_DRAFT_V2,
    status: 'draft' as const,
    actions,
    review: null,
  };
  const { protocolDraftId: _protocolDraftId, inputHash: _inputHash, ...hashInput } = withoutHash;
  return { ...withoutHash, inputHash: canonicalSha256(hashInput) };
}

export function reviewFoodCompassProtocolV2(input: {
  protocolDraft: ProtocolDraft;
  reviewedAt: string;
  c5Enabled: boolean;
}): ProtocolDraft {
  if (!input.c5Enabled) throw new TypeError('C5 est désactivée.');
  canonicalIso(input.reviewedAt);
  if (recomputeDraftInputHash(input.protocolDraft) !== input.protocolDraft.inputHash
    || input.protocolDraft.version !== VERSION_PROTOCOL_DRAFT_V2) {
    throw new TypeError('Le protocole C5 V2 est incompatible ou altéré.');
  }
  assertProtocolDraftC5Structure(input.protocolDraft);
  if (input.reviewedAt < input.protocolDraft.updatedAt) {
    throw new TypeError('La revue doit être postérieure à la dernière modification.');
  }
  const withoutHash = {
    ...input.protocolDraft,
    status: 'practitioner_reviewed' as const,
    review: {
      reviewedAt: input.reviewedAt,
      reviewerRole: 'practitioner' as const,
      confirmation: 'content_reviewed' as const,
    },
  };
  const { protocolDraftId: _protocolDraftId, inputHash: _inputHash, ...hashInput } = withoutHash;
  return { ...withoutHash, inputHash: canonicalSha256(hashInput) };
}
