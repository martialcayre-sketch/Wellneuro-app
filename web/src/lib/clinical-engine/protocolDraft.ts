import { canonicalSha256 } from './canonical';
import { VERSION_PROTOCOL_DRAFT, VERSION_PROTOCOL_DRAFT_V3, VERSION_PROTOCOL_DRAFT_V4 } from './types';
import type {
  DecisionCard,
  ProtocolAction,
  ProtocolDraft,
  ProtocolPhase,
  ProtocolReview,
  ProtocolWaitFor,
  SupplementCatalogRef,
  TherapeuticLoad,
} from './types';

const ACTION_TYPES = [
  'food', 'chronobiology', 'calming_routine', 'gentle_activity',
  'hydration', 'advice_sheet', 'biological_exploration', 'supplement_exploration',
  'observation', 'medical_referral',
] as const;
const INTERVENTION_STATUSES = [
  'active', 'conditionnelle_biologie', 'differee', 'contre_indiquee', 'non_indiquee_actuellement',
] as const;
const WAIT_FOR_FIELDS = ['type', 'cible', 'echeance'];
const PHASE_FIELDS = ['phaseId', 'duree', 'objectifs', 'actionIds', 'mesures', 'prerequis', 'reviewAt'];
const LOAD_LEVELS = ['light', 'moderate', 'loaded', 'excessive'] as const;
const FORBIDDEN_SUPPLEMENT_FIELDS = ['product', 'produit', 'form', 'forme', 'dose', 'brand', 'marque'];
const SUPPLEMENT_CATALOG_REF_FIELDS = ['ingredientId', 'ruleId', 'ruleVersion', 'productId', 'justification'];

// Garde unique des champs libres interdits sur une intention de complément —
// appliquée à la construction (toute version) comme à l'assertion V3 : ni
// produit, ni forme, ni dose, ni marque en texte libre, contrat V3 compris.
function assertNoForbiddenSupplementFields(action: ProtocolAction): void {
  const keys = Object.keys(action as unknown as Record<string, unknown>);
  if (keys.some(key => FORBIDDEN_SUPPLEMENT_FIELDS.includes(key.toLowerCase()))) {
    throw new TypeError('Une intention de complément ne peut contenir ni produit, forme, marque ou dose.');
  }
}

function nonEmpty(value: string, field: string): string {
  if (!value.trim()) throw new TypeError(`${field} est requis.`);
  return value.trim();
}

function canonicalIso(value: string, field: string): string {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime()) || date.toISOString() !== value) {
    throw new TypeError(`${field} doit être une date ISO canonique valide.`);
  }
  return value;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
}

function validateDecisionCard(card: DecisionCard): string {
  if (card.abstention.status !== 'not_required') {
    throw new TypeError('Le protocole exige une évaluation explicite sans abstention requise.');
  }
  if (card.safetyFindingIds.length > 0) {
    throw new TypeError('Les constats de sécurité doivent être revus avant de préparer le protocole.');
  }
  const selectedId = card.selectedMainPriority?.candidateId;
  if (!selectedId || !card.priorityCandidates.some(candidate => candidate.candidateId === selectedId)) {
    throw new TypeError('Le protocole exige une priorité sélectionnée par le praticien.');
  }
  return selectedId;
}

// Contrat V4 (`D-056`) — une attente est toujours nommée : ni cible vide, ni
// champ surnuméraire, ni échéance approximative. Le seul type représentable est
// `biologie` ; tout autre est refusé plutôt que traduit.
function normalizeWaitFor(waitFor: ProtocolWaitFor): ProtocolWaitFor {
  const unknownKey = Object.keys(waitFor as unknown as Record<string, unknown>)
    .find(key => !WAIT_FOR_FIELDS.includes(key));
  if (unknownKey !== undefined) {
    throw new TypeError(`Attente d’intervention : champ inconnu « ${unknownKey} ».`);
  }
  if (waitFor.type !== 'biologie') {
    throw new TypeError('Attente d’intervention : seul le type « biologie » est représentable.');
  }
  const cible = nonEmpty(waitFor.cible, 'cible de l’attente');
  if (waitFor.echeance === undefined) return { type: 'biologie', cible };
  return { type: 'biologie', cible, echeance: canonicalIso(waitFor.echeance, 'échéance de l’attente') };
}

// Le statut d'intervention ne se devine pas : requis sur toute action V4,
// interdit avant. Une action sans statut dans un payload V4 est un refus, jamais
// un « active » par défaut — `DC-24`, une donnée absente n'est ni zéro ni
// normale, et « active » est précisément la valeur la plus engageante.
function normalizeInterventionStatus(
  action: ProtocolAction,
  version: ProtocolDraft['version'],
): Pick<ProtocolAction, 'interventionStatus' | 'waitFor'> {
  if (version !== VERSION_PROTOCOL_DRAFT_V4) {
    if (action.interventionStatus !== undefined) {
      throw new TypeError('Un statut d’intervention exige un payload protocole V4 explicite.');
    }
    if (action.waitFor !== undefined) {
      throw new TypeError('Une attente d’intervention exige un payload protocole V4 explicite.');
    }
    return {};
  }
  const status = action.interventionStatus;
  if (status === undefined) {
    throw new TypeError('Un payload protocole V4 exige un statut d’intervention sur chaque action.');
  }
  if (!(INTERVENTION_STATUSES as readonly string[]).includes(status)) {
    throw new TypeError('Statut d’intervention inconnu.');
  }
  if (status === 'conditionnelle_biologie') {
    if (action.waitFor === undefined) {
      throw new TypeError('Une intervention conditionnelle à la biologie exige une attente explicite.');
    }
    return { interventionStatus: status, waitFor: normalizeWaitFor(action.waitFor) };
  }
  if (action.waitFor !== undefined) {
    throw new TypeError('Une attente d’intervention n’a de sens que sur un statut « conditionnelle_biologie ».');
  }
  return { interventionStatus: status };
}

function normalizeActions(actions: ProtocolAction[], version: ProtocolDraft['version']): ProtocolAction[] {
  if (actions.length > 3) throw new TypeError('Un protocole 21 jours ne peut contenir que trois actions maximum.');
  const ids = new Set<string>();
  return actions.map(action => {
    const actionId = nonEmpty(action.actionId, 'actionId');
    if (ids.has(actionId)) throw new TypeError(`Action dupliquée : ${actionId}.`);
    ids.add(actionId);
    if (!(ACTION_TYPES as readonly string[]).includes(action.type)) throw new TypeError('Type d’action inconnu.');
    if (action.foodCompassRef !== undefined) {
      throw new TypeError('Une référence C5 exige un payload protocole V2 explicite.');
    }
    if (action.supplementCatalogRef !== undefined
      && version !== VERSION_PROTOCOL_DRAFT_V3
      && version !== VERSION_PROTOCOL_DRAFT_V4) {
      throw new TypeError('Une référence catalogue de compléments exige un payload protocole V3 explicite.');
    }
    if (action.type === 'supplement_exploration') {
      assertNoForbiddenSupplementFields(action);
    }
    return {
      actionId,
      type: action.type,
      title: nonEmpty(action.title, 'intitulé d’action'),
      idealPlan: nonEmpty(action.idealPlan, 'plan idéal'),
      minimalPlan: nonEmpty(action.minimalPlan, 'plan minimal'),
      rescuePlan: nonEmpty(action.rescuePlan, 'plan de secours'),
      limitations: uniqueSorted(action.limitations),
      ...normalizeInterventionStatus(action, version),
    };
  });
}

// Phases V1 (`D-056`) : la phase cite des `actionId` du protocole, jamais des
// copies d'actions — une action ne peut pas diverger d'elle-même. Une phase sans
// action n'est pas une phase ; une phase citant une action inexistante est un
// refus, pas un silence.
function normalizePhases(
  phases: ProtocolPhase[],
  actions: ProtocolAction[],
  version: ProtocolDraft['version'],
): ProtocolPhase[] | undefined {
  if (version !== VERSION_PROTOCOL_DRAFT_V4) {
    if (phases.length > 0) throw new TypeError('Des phases exigent un payload protocole V4 explicite.');
    return undefined;
  }
  if (phases.length === 0) return undefined;
  const knownActionIds = new Set(actions.map(action => action.actionId));
  const phaseIds = new Set<string>();
  return phases.map(phase => {
    const unknownKey = Object.keys(phase as unknown as Record<string, unknown>)
      .find(key => !PHASE_FIELDS.includes(key));
    if (unknownKey !== undefined) {
      throw new TypeError(`Phase de protocole : champ inconnu « ${unknownKey} ».`);
    }
    const phaseId = nonEmpty(phase.phaseId, 'phaseId');
    if (phaseIds.has(phaseId)) throw new TypeError(`Phase dupliquée : ${phaseId}.`);
    phaseIds.add(phaseId);
    if (!Array.isArray(phase.actionIds) || phase.actionIds.length === 0) {
      throw new TypeError(`Phase « ${phaseId} » : au moins une action est requise.`);
    }
    const actionIds = uniqueSorted(phase.actionIds.map(id => nonEmpty(id, 'actionId de phase')));
    const inconnu = actionIds.find(id => !knownActionIds.has(id));
    if (inconnu !== undefined) {
      throw new TypeError(`Phase « ${phaseId} » : action inconnue « ${inconnu} ».`);
    }
    return {
      phaseId,
      duree: nonEmpty(phase.duree, 'durée de phase'),
      objectifs: uniqueSorted(phase.objectifs ?? []),
      actionIds,
      mesures: uniqueSorted(phase.mesures ?? []),
      prerequis: uniqueSorted(phase.prerequis ?? []),
      reviewAt: canonicalIso(phase.reviewAt, 'reviewAt de phase'),
    };
  });
}

function normalizeLoad(load: TherapeuticLoad): TherapeuticLoad {
  if (!(LOAD_LEVELS as readonly string[]).includes(load.level)) throw new TypeError('Niveau de charge inconnu.');
  if (load.source !== 'practitioner') throw new TypeError('La charge doit être déclarée par le praticien.');
  const justification = load.justification?.trim() || null;
  if (load.level === 'excessive' && justification === null) {
    throw new TypeError('Une charge excessive exige une justification du praticien.');
  }
  return { level: load.level, source: 'practitioner', justification };
}

export function buildProtocolDraft(input: {
  protocolDraftId: string;
  decisionCard: DecisionCard;
  createdAt: string;
  updatedAt: string;
  purpose: string;
  followUpCriterion: string;
  adviceSheetRef?: string | null;
  actions?: ProtocolAction[];
  phases?: ProtocolPhase[];
  therapeuticLoad: TherapeuticLoad;
  review?: ProtocolReview | null;
  limitations?: string[];
  version?: ProtocolDraft['version'];
}): ProtocolDraft {
  const protocolDraftId = nonEmpty(input.protocolDraftId, 'protocolDraftId');
  const selectedPriorityId = validateDecisionCard(input.decisionCard);
  canonicalIso(input.createdAt, 'createdAt');
  canonicalIso(input.updatedAt, 'updatedAt');
  if (input.updatedAt < input.createdAt) throw new TypeError('updatedAt ne peut pas précéder createdAt.');
  let requestedVersion: ProtocolDraft['version'];
  if (input.version !== undefined) {
    requestedVersion = input.version;
  } else if (input.actions?.some(action => action.supplementCatalogRef !== undefined)) {
    throw new TypeError('Une référence catalogue de compléments exige un payload protocole V3 explicite.');
  } else {
    requestedVersion = VERSION_PROTOCOL_DRAFT;
  }
  const actions = normalizeActions(input.actions ?? [], requestedVersion);
  const phases = normalizePhases(input.phases ?? [], actions, requestedVersion);
  const therapeuticLoad = normalizeLoad(input.therapeuticLoad);
  let review = input.review ?? null;
  if (review !== null) {
    if (actions.length === 0) throw new TypeError('La revue praticien exige au moins une action.');
    if (review.reviewerRole !== 'practitioner' || review.confirmation !== 'content_reviewed') {
      throw new TypeError('La revue doit être confirmée explicitement par le praticien.');
    }
    canonicalIso(review.reviewedAt, 'reviewedAt');
    if (review.reviewedAt < input.updatedAt) throw new TypeError('La revue doit être postérieure à la dernière modification.');
    review = { ...review };
  }
  const withoutHash = {
    protocolDraftId,
    decisionCardId: input.decisionCard.decisionCardId,
    decisionCardInputHash: input.decisionCard.inputHash,
    selectedPriorityId,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    version: requestedVersion,
    status: review ? 'practitioner_reviewed' as const : 'draft' as const,
    purpose: nonEmpty(input.purpose, 'raison d’être'),
    followUpCriterion: nonEmpty(input.followUpCriterion, 'critère observable à J21'),
    adviceSheetRef: input.adviceSheetRef?.trim() || null,
    actions,
    // Clé absente hors V4 : `canonicalJson` ignore les valeurs `undefined`, donc
    // les empreintes des payloads V1 à V3 déjà persistés restent identiques.
    ...(phases === undefined ? {} : { phases }),
    therapeuticLoad,
    review,
    limitations: uniqueSorted(input.limitations ?? []),
  };
  const { protocolDraftId: _protocolDraftId, ...hashInput } = withoutHash;
  const builtDraft = { ...withoutHash, inputHash: canonicalSha256(hashInput) } as ProtocolDraft;
  if (builtDraft.version === VERSION_PROTOCOL_DRAFT_V3
    || builtDraft.version === VERSION_PROTOCOL_DRAFT_V4) {
    assertProtocolDraftSupplementStructure(builtDraft);
  }
  return builtDraft;
}

// Contrat V3 (C4 LOT-04) — validation structurelle d'une référence catalogue de
// compléments. Référence opaque et gouvernée, posée par le praticien seul via
// l'instrument bibliothèque ; jamais générée par l'IA. `productId` est optionnel
// tant que le schéma produit (LOT-01) n'est pas branché : la validation
// d'existence (FK) du produit arrivera à ce branchement, seule la structure est
// vérifiée ici.
export function assertSupplementCatalogRef(ref: SupplementCatalogRef): void {
  const unknownKey = Object.keys(ref as unknown as Record<string, unknown>)
    .find(key => !SUPPLEMENT_CATALOG_REF_FIELDS.includes(key));
  if (unknownKey !== undefined) {
    throw new TypeError(`Référence catalogue de compléments : champ inconnu « ${unknownKey} ».`);
  }
  if (typeof ref.ingredientId !== 'string' || !ref.ingredientId.trim()) {
    throw new TypeError('Référence catalogue de compléments : ingredientId est requis.');
  }
  if (typeof ref.ruleId !== 'string' || !ref.ruleId.trim()) {
    throw new TypeError('Référence catalogue de compléments : ruleId est requis.');
  }
  if (typeof ref.ruleVersion !== 'number' || !Number.isInteger(ref.ruleVersion) || ref.ruleVersion <= 0) {
    throw new TypeError('Référence catalogue de compléments : ruleVersion doit être un entier strictement positif.');
  }
  if (ref.productId !== undefined && (typeof ref.productId !== 'string' || !ref.productId.trim())) {
    throw new TypeError('Référence catalogue de compléments : productId, s’il est fourni, ne peut pas être vide.');
  }
  if (typeof ref.justification !== 'string' || !ref.justification.trim()) {
    throw new TypeError('Référence catalogue de compléments : justification est requise.');
  }
}

// Assertion de structure d'un draft vis-à-vis du contrat V3 : toute référence
// catalogue exige un payload V3 explicite (même mécanique que foodCompassRef →
// V2) et ne peut viser qu'une action `supplement_exploration` ; un payload V3
// sans référence reste valide. La garde des champs libres interdits s'applique
// à toute version, V3 comprise.
export function assertProtocolDraftSupplementStructure(draft: ProtocolDraft): void {
  if (!Array.isArray(draft.actions)) {
    if (draft.version === VERSION_PROTOCOL_DRAFT_V3 || draft.version === VERSION_PROTOCOL_DRAFT_V4) {
      throw new TypeError('Actions protocole invalides.');
    }
    return;
  }

  draft.actions.forEach(action => {
    if (action.type === 'supplement_exploration') {
      assertNoForbiddenSupplementFields(action);
    }
    if (action.supplementCatalogRef === undefined) return;
    if (draft.version !== VERSION_PROTOCOL_DRAFT_V3 && draft.version !== VERSION_PROTOCOL_DRAFT_V4) {
      throw new TypeError('Une référence catalogue de compléments exige un payload protocole V3 explicite.');
    }
    if (action.type !== 'supplement_exploration') {
      throw new TypeError('Une référence catalogue de compléments ne peut viser qu’une intention de complément.');
    }
    assertSupplementCatalogRef(action.supplementCatalogRef);
  });
}

export function reviseProtocolDraft(input: {
  existing: ProtocolDraft;
  decisionCard: DecisionCard;
  updatedAt: string;
  purpose?: string;
  followUpCriterion?: string;
  adviceSheetRef?: string | null;
  actions?: ProtocolAction[];
  therapeuticLoad?: TherapeuticLoad;
}): ProtocolDraft {
  return buildProtocolDraft({
    protocolDraftId: input.existing.protocolDraftId,
    decisionCard: input.decisionCard,
    createdAt: input.existing.createdAt,
    updatedAt: input.updatedAt,
    purpose: input.purpose ?? input.existing.purpose,
    followUpCriterion: input.followUpCriterion ?? input.existing.followUpCriterion,
    adviceSheetRef: input.adviceSheetRef === undefined ? input.existing.adviceSheetRef : input.adviceSheetRef,
    actions: input.actions ?? input.existing.actions,
    phases: input.existing.phases,
    therapeuticLoad: input.therapeuticLoad ?? input.existing.therapeuticLoad,
    limitations: input.existing.limitations,
    review: null,
    version: input.existing.version,
  });
}
