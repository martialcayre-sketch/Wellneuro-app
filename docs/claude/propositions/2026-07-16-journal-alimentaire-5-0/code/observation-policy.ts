import type { ObservationPolicy } from './contracts';

export const HYBRID_21_DAY_POLICY_V1: ObservationPolicy = {
  policyId: 'food_observation_hybrid_21d',
  version: '1.0.0-proposal',
  mode: 'hybrid',
  questionType: 'dietary_action_feasibility',
  maxPromptsPerDay: 2,
  allowMinimalPlan: true,
  sufficientObservationRuleId: 'coverage_action_opportunities_v1',
  windows: [
    {
      windowId: 'baseline-light',
      from: 'DAY_1',
      to: 'DAY_3',
      intensity: 'light',
      requiredMarkerCodes: [
        'vegetables',
        'whole_fruit',
        'legumes',
        'whole_grains',
        'protein_source',
        'added_fat_type',
        'ultra_processed',
      ],
      requiredContextCodes: ['meal_moment', 'representative_day'],
      rationalePatient: 'Ces premiers repères permettent de comprendre vos habitudes sans tout détailler.',
      rationalePractitioner: 'Panorama initial léger avant observation centrée sur l’action.',
    },
    {
      windowId: 'action-focus',
      from: 'DAY_4',
      to: 'DAY_14',
      intensity: 'standard',
      requiredMarkerCodes: ['ACTIVE_ACTION_MARKERS'],
      requiredContextCodes: ['action_opportunity', 'possible_today'],
      rationalePatient: 'Une trace liée à votre action suffit aujourd’hui.',
      rationalePractitioner: 'Documenter les opportunités et la faisabilité de l’action validée.',
    },
    {
      windowId: 'consolidation',
      from: 'DAY_15',
      to: 'DAY_21',
      intensity: 'minimal',
      requiredMarkerCodes: ['ACTIVE_ACTION_MARKERS'],
      requiredContextCodes: ['action_opportunity'],
      rationalePatient: 'La fin de phase sert surtout à voir ce qui reste facile à maintenir.',
      rationalePractitioner: 'Consolidation, charge réduite, préparation de la revue J21.',
    },
  ],
};

export function getWhyNow(policy: ObservationPolicy, day: number): string {
  if (!Number.isInteger(day) || day < 1 || day > 21) {
    throw new RangeError('day must be an integer between 1 and 21');
  }

  if (day <= 3) return policy.windows[0]?.rationalePatient ?? '';
  if (day <= 14) return policy.windows[1]?.rationalePatient ?? '';
  return policy.windows[2]?.rationalePatient ?? '';
}
