import type { QuestionnaireDef } from './questionnaire-types';

export type AdministrationPolicy =
  | 'strict'
  | 'layout_only'
  | 'nominal_shuffle_allowed'
  | 'internal_flexible';

export type RendererProfile =
  | 'standard'
  | 'micro_batch'
  | 'focus'
  | 'guided_sections'
  | 'compact_repeated_scale';

export type OptionOrderPolicy =
  | { mode: 'fixed' }
  | {
      mode: 'shuffle_nominal';
      specificationVersion: 1;
      pinnedValues: readonly number[];
    };

export type DisplayPolicy = Readonly<{
  administration: AdministrationPolicy;
  renderer: RendererProfile;
  itemOrder: 'fixed';
  optionOrder: OptionOrderPolicy;
  activation: 'enabled' | 'blocked' | 'candidate';
  gate?: string;
}>;

const STRICT_DEFAULT_POLICY: DisplayPolicy = Object.freeze({
  administration: 'strict',
  renderer: 'standard',
  itemOrder: 'fixed',
  optionOrder: Object.freeze({ mode: 'fixed' }),
  activation: 'enabled',
});

// Registre UX séparé du catalogue clinique. Une entrée bloquée ou candidate
// documente une cible sans autoriser son branchement dans le renderer patient.
const DISPLAY_POLICY_REGISTRY: Readonly<Record<string, DisplayPolicy>> = Object.freeze({
  Q_NEU_03: Object.freeze({
    administration: 'strict',
    renderer: 'micro_batch',
    itemOrder: 'fixed',
    optionOrder: Object.freeze({ mode: 'fixed' }),
    activation: 'enabled',
  }),
  Q_MOD_02: Object.freeze({
    administration: 'strict',
    renderer: 'focus',
    itemOrder: 'fixed',
    optionOrder: Object.freeze({ mode: 'fixed' }),
    activation: 'blocked',
    gate: 'Certification documentaire et fixture de scoring requises.',
  }),
  Q_ALI_01: Object.freeze({
    administration: 'strict',
    renderer: 'guided_sections',
    itemOrder: 'fixed',
    optionOrder: Object.freeze({ mode: 'fixed' }),
    activation: 'blocked',
    gate: 'Certification documentaire et fixture de scoring requises.',
  }),
  Q_ALI_03: Object.freeze({
    administration: 'strict',
    renderer: 'compact_repeated_scale',
    itemOrder: 'fixed',
    optionOrder: Object.freeze({ mode: 'fixed' }),
    activation: 'candidate',
    gate: 'Revue clinique, certification documentaire et fixture requises.',
  }),
});

export function getDisplayPolicy(questionnaireId: string): DisplayPolicy {
  return DISPLAY_POLICY_REGISTRY[questionnaireId] ?? STRICT_DEFAULT_POLICY;
}

export function getEnabledRenderer(questionnaireId: string): RendererProfile {
  const policy = getDisplayPolicy(questionnaireId);
  return policy.activation === 'enabled' ? policy.renderer : 'standard';
}

export type QuestionnaireAnswerValue = string | number;
export type QuestionnaireAnswerPayload = Record<string, QuestionnaireAnswerValue>;

/**
 * Construit exclusivement le contrat questionId → value attendu par le scoring.
 * Les clés de brouillon, d'ordre visuel ou d'état UX sont ignorées, même si
 * elles sont présentes dans l'objet local fourni par l'interface.
 */
export function buildQuestionnaireAnswerPayload(
  questionnaire: QuestionnaireDef,
  localValues: Readonly<Record<string, unknown>>,
): QuestionnaireAnswerPayload {
  const payload: QuestionnaireAnswerPayload = {};
  for (const section of questionnaire.sections) {
    for (const question of section.questions) {
      const value = localValues[question.id];
      if (typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value))) {
        payload[question.id] = value;
      }
    }
  }
  return payload;
}
