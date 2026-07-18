import type { ProtocolDraft } from '@/lib/clinical-engine/types';
import {
  buildContextualFoodReading,
  createFoodCompassActionRef,
} from './contextual';
import { getSignedFoodCompassDistribution } from './distribution';
import { buildIntrinsicFoodProfile } from './intrinsic';
import { REFERENCE_NUTRIENT_CODES } from './mapping';
import type {
  CiqualNutrientDatum,
  ContextualFoodReading,
  FoodCompassActionRef,
  IntrinsicFoodProfile,
} from './types';

export type PractitionerFoodCompassReference = {
  profile: IntrinsicFoodProfile;
  reading: ContextualFoodReading;
  actionRef: FoodCompassActionRef | null;
};

export function buildPractitionerFoodCompassReference(input: {
  ciqualCode: string;
  foodLabel: string;
  rows: readonly CiqualNutrientDatum[];
  activeProtocol: ProtocolDraft;
}): PractitionerFoodCompassReference {
  const expectedCodes = new Set<string>(REFERENCE_NUTRIENT_CODES);
  const actualCodes = new Set(input.rows.map(row => row.nutrientCode));
  if (input.rows.length !== expectedCodes.size
    || actualCodes.size !== expectedCodes.size
    || [...actualCodes].some(code => !expectedCodes.has(code))) {
    throw new TypeError('Référentiel alimentaire incomplet.');
  }

  const profile = buildIntrinsicFoodProfile({
    ciqualCode: input.ciqualCode,
    foodLabel: input.foodLabel,
    rows: input.rows,
    distribution: getSignedFoodCompassDistribution(),
  });
  const reading = buildContextualFoodReading({
    intrinsicProfile: profile,
    selectedPriority: {
      priorityId: input.activeProtocol.selectedPriorityId,
      label: 'Priorité sélectionnée par le praticien',
    },
    activeProtocol: {
      protocolDraftId: input.activeProtocol.protocolDraftId,
      inputHash: input.activeProtocol.inputHash,
      status: 'active',
    },
  });
  return {
    profile,
    reading,
    actionRef: profile.status === 'insufficient_data'
      ? null
      : createFoodCompassActionRef({ profile, reading }),
  };
}
