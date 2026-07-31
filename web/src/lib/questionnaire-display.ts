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

/**
 * Levée du gate pour UNE forme servie, déclarée dans le registre.
 *
 * Un identifiant peut désigner deux formes — `Q_ALI_01` sert le dépistage court
 * à 14 items ou l'Enquête SIIN à 57 selon `WN_ALI_01_SIIN57`, et le gate
 * (« certification documentaire et fixture de scoring ») n'est satisfait que par
 * la seconde. `activation` ne connaît qu'un identifiant : elle ne peut donc pas
 * exprimer cette condition, et la coder dans le résolveur revenait à CONTOURNER
 * le gate au lieu de le lever — le registre continuait d'annoncer « bloqué »
 * pendant qu'une exception nominative rendait la grille.
 *
 * D'où ce champ : la condition est DÉCLARÉE là où le gate l'est, et le résolveur
 * la lit sans connaître aucun instrument.
 *
 * Le discriminant est `scoring.maxTotal`, jamais le nombre d'items. `maxTotal`
 * porte déjà tout le lot — `VERSION_SCORE_EQUILIBRE`, `BESOIN_SOURCES[1].max`,
 * `formeAlimentaireServie.guard.test.ts` — donc une dérive y devient un test
 * rouge existant. Un compte d'items serait un proxy isolé : ajouter un item
 * ferait retomber le rendu en `standard` en silence.
 */
export type LeveeConditionnelle = Readonly<{
  discriminant: 'scoring.maxTotal';
  valeur: number;
  motif: string;
}>;

export type DisplayPolicy = Readonly<{
  administration: AdministrationPolicy;
  renderer: RendererProfile;
  itemOrder: 'fixed';
  optionOrder: OptionOrderPolicy;
  activation: 'enabled' | 'blocked' | 'candidate';
  gate?: string;
  leveeConditionnelle?: LeveeConditionnelle;
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
    // Reste `blocked` : l'identifiant sert DEUX formes, et le dépistage court à
    // 14 items ne satisfait toujours pas le gate. Passer à `enabled` lui
    // ouvrirait la grille — la forme non certifiée, rendue comme la certifiée.
    activation: 'blocked',
    gate: "Certification documentaire et fixture de scoring requises. LEVÉ pour l'Enquête SIIN à 57 items, cotée /90 : sources WN-SRC-0470 et WN-SRC-0471, banc de scoring dédié tournant dans les deux positions du drapeau. Le dépistage court à 14 items, coté /42, n'apporte ni l'une ni l'autre et reste au rendu standard.",
    leveeConditionnelle: Object.freeze({
      discriminant: 'scoring.maxTotal',
      valeur: 90,
      motif: "Forme SIIN certifiée — le /90 est le discriminant qui porte déjà le barème servi et l'étiquette de version du score.",
    }),
  }),
  Q_ALI_03: Object.freeze({
    administration: 'strict',
    // `guided_sections` et non plus `compact_repeated_scale` : reconstruit le
    // 2026-07-31, l'instrument n'a plus AUCUNE échelle répétée — ce sont 21
    // saisies chiffrées réparties en dix blocs, dont la périodicité change d'un
    // bloc à l'autre. Le profil restait inerte (`activation: 'candidate'`, donc
    // rendu `standard`) : il aurait été faux le jour de son activation.
    renderer: 'guided_sections',
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

/** Ce que le résolveur lit d'une définition servie : son barème, rien d'autre. */
export type DefinitionServie = { scoring?: { maxTotal?: unknown } } | null | undefined;

/**
 * Résolveur PUR — ne connaît aucun identifiant d'instrument.
 *
 * Anti-tautologie : ne jamais écrire un attendu de test qui recalcule le
 * discriminant depuis la policy testée. Les deux membres bougeraient ensemble, et
 * c'est exactement ce qui avait rendu `ALI01_SERT_UNE_CONDUITE` vert alors qu'une
 * perte clinique réelle passait. Les attendus sont des littéraux.
 */
export function resoudreRenderer(policy: DisplayPolicy, def: DefinitionServie): RendererProfile {
  if (policy.activation === 'enabled') return policy.renderer;
  const levee = policy.leveeConditionnelle;
  // Le `discriminant` est VÉRIFIÉ, pas seulement déclaré. Sans ce test, le champ
  // serait décoratif : élargir l'union à `'items.count'` et déclarer
  // `{discriminant:'items.count', valeur:57}` compilerait, et le résolveur
  // comparerait quand même `scoring.maxTotal === 57` — un instrument coté /57
  // ouvrirait la grille. Fail-open silencieux ; ici la levée inconnue ne lève rien.
  if (levee?.discriminant === 'scoring.maxTotal' && def?.scoring?.maxTotal === levee.valeur) {
    return policy.renderer;
  }
  return 'standard';
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
  def: DefinitionServie,
): RendererProfile {
  return resoudreRenderer(getDisplayPolicy(questionnaireId), def);
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
