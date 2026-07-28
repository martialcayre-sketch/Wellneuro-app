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

export type MicroBatchDefinition = readonly (readonly string[])[];

const MICRO_BATCH_REGISTRY: Readonly<Record<string, MicroBatchDefinition>> = Object.freeze({
  Q_NEU_03: Object.freeze([
    Object.freeze(['SIGH_Q001', 'SIGH_Q002', 'SIGH_Q003']),
    Object.freeze(['SIGH_Q004', 'SIGH_Q005', 'SIGH_Q006', 'SIGH_Q007']),
    Object.freeze(['SIGH_Q008', 'SIGH_Q009', 'SIGH_Q010']),
    Object.freeze(['SIGH_Q011', 'SIGH_Q012', 'SIGH_Q013']),
    Object.freeze(['SIGH_Q014']),
    Object.freeze(['SIGH_Q015', 'SIGH_Q016']),
    Object.freeze(['SIGH_Q017', 'SIGH_Q018', 'SIGH_Q019', 'SIGH_Q020', 'SIGH_Q021']),
    Object.freeze(['SIGH_Q022', 'SIGH_Q023', 'SIGH_Q024']),
    Object.freeze(['SIGH_Q025']),
  ]),
});

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

/**
 * Renderer d'une définition RÉELLEMENT SERVIE — à appeler côté serveur, et à
 * transmettre au client avec la définition.
 *
 * `getEnabledRenderer` ne connaît qu'un identifiant. Or `Q_ALI_01` désigne deux
 * formes selon `WN_ALI_01_SIIN57` : le dépistage court à 14 items, et l'Enquête
 * alimentaire SIIN à 57. Seule la seconde justifie la grille — et le drapeau qui
 * les départage n'existe QUE côté serveur. Laisser le client trancher lui ferait
 * lire `undefined`, donc choisir la disposition de l'autre forme.
 *
 * D'où la règle : le serveur décide de ce qu'il sert, le client l'applique.
 */
export function getRendererPourDefinition(
  questionnaireId: string,
  def: { sections?: ReadonlyArray<{ questions: ReadonlyArray<unknown> }> } | null | undefined,
): RendererProfile {
  const policy = getDisplayPolicy(questionnaireId);
  if (policy.activation === 'enabled') return policy.renderer;

  // Le gate de `Q_ALI_01` est « certification documentaire et fixture de scoring
  // requises ». La forme SIIN à 57 items apporte les deux ; la forme courte,
  // non certifiée, reste donc au rendu standard. On reconnaît la première au
  // nombre d'items servis plutôt qu'au drapeau : c'est la même information,
  // lue sur ce qui est effectivement rendu.
  if (questionnaireId === 'Q_ALI_01' && policy.renderer === 'guided_sections') {
    const nbItems = (def?.sections ?? []).reduce((n, s) => n + s.questions.length, 0);
    if (nbItems === 57) return 'guided_sections';
  }
  return 'standard';
}

export function getMicroBatches(questionnaireId: string): MicroBatchDefinition {
  return getEnabledRenderer(questionnaireId) === 'micro_batch'
    ? (MICRO_BATCH_REGISTRY[questionnaireId] ?? Object.freeze([]))
    : Object.freeze([]);
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
