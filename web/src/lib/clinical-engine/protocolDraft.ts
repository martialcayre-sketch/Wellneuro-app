import { canonicalSha256 } from './canonical';
import { assertRefAssietteDIndication } from '../food-compass/plates';
import {
  ACTION_ID_ORIENTATION,
  TEXTE_ORIENTATION,
  estActionOrientation,
  orientationRequise,
} from './orientationAdressage';
import {
  MAX_ACTIONS_PROTOCOLE_21J,
  VERSION_PROTOCOL_DRAFT,
  VERSION_PROTOCOL_DRAFT_V3,
  VERSION_PROTOCOL_DRAFT_V4,
} from './types';
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

// L'ASSIETTE POSÉE SUR UNE ACTION — trois termes, et aucun n'est décoratif
// ([[D-240]]).
//
// **LE CONTRAT.** V4 explicite, comme `foodCompassRef` exige V2 et
// `supplementCatalogRef` V3. La version ne se déduit jamais d'un champ présent :
// c'est la doctrine de ce module, et la déduire laisserait le client choisir son
// contrat par omission.
//
// **LE TYPE D'ACTION.** `food` seule. Le précédent est `supplementCatalogRef`,
// réservé à `supplement_exploration` — une référence typée se lie à un type
// d'action, faute de quoi elle devient un champ libre que n'importe quelle
// action transporte. Une assiette est un repas : `advice_sheet` aurait ouvert
// la fiche conseil, que [[D-200]] §2 a précisément FERMÉE à l'écriture et dont
// aucun écran patient ne rend le contenu. Le cadrage écrivait « `advice_sheet`
// ou `food` » ; c'est `food`, et l'autre branche reste fermée jusqu'à ce qu'une
// fiche conseil existe pour de bon.
//
// **L'AXE, ET C'EST LUI QUI RECALCULE.** `assertRefAssietteDIndication` ne
// valide pas la référence soumise : elle la RE-DÉRIVE du catalogue et rend la
// copie officielle. Un `contentHash` réécrit, un `catalogVersion` périmé, un
// repère de moment de repas — les trois sortent ici. C'est la leçon de
// [[D-239]] appliquée d'emblée : entre valider ce qu'on reçoit et recalculer ce
// qu'on sait, seul le second ne se laisse pas soumettre.
function normalizePlateRef(
  action: ProtocolAction,
  version: ProtocolDraft['version'],
): Pick<ProtocolAction, 'recommendedPlateRef'> {
  if (action.recommendedPlateRef === undefined) return {};
  if (version !== VERSION_PROTOCOL_DRAFT_V4) {
    throw new TypeError('Une référence d’assiette exige un payload protocole V4 explicite.');
  }
  if (action.type !== 'food') {
    throw new TypeError('Une référence d’assiette exige une action alimentaire.');
  }
  return { recommendedPlateRef: assertRefAssietteDIndication(action.recommendedPlateRef) };
}

/**
 * LA RÉFÉRENCE C5 À L'ÉCRITURE — et elle a désormais la MÊME FORME que celle de
 * l'assiette juste au-dessus, constat de revue.
 *
 * MA PREMIÈRE RÉDACTION OUVRAIT V4 SANS CONTRÔLER LE TYPE D'ACTION, et c'est
 * exactement l'asymétrie que ce lot existe pour fermer, rejouée d'un cran plus
 * loin. `assertProtocolDraftC5Structure` refuse une référence C5 portée par une
 * action non alimentaire — à la RELECTURE. L'écriture, elle, l'acceptait : on
 * pouvait donc persister une version que plus personne ne savait relire. Un
 * refus à l'écriture est un message au praticien ; un refus à la relecture est
 * un protocole mort.
 *
 * Les deux autres chemins portaient déjà ce terme (`refValidation.ts` en
 * lecture, `protocol.ts` pour le constructeur V2) : c'était le seul des trois à
 * ne pas l'avoir.
 */
function normalizeFoodCompassRef(
  action: ProtocolAction,
  version: ProtocolDraft['version'],
): Pick<ProtocolAction, 'foodCompassRef'> {
  if (action.foodCompassRef === undefined) return {};
  // V4 SEULEMENT, ET LA CONDITION NE S'ÉLARGIT PAS À V2. Un payload V2 ne porte
  // jamais ses références SUR l'action quand il passe ici :
  // `buildFoodCompassProtocolV2FromSource` construit un brouillon sans elles,
  // puis les réinjecte — et c'est lui qui contrôle alors le type d'action
  // (`protocol.ts`). Admettre V2 ici n'ouvrirait donc aucun chemin utile, et
  // élargirait une garde que ce lot n'a pas mandat de toucher.
  if (version !== VERSION_PROTOCOL_DRAFT_V4) {
    throw new TypeError('Une référence C5 portée par une action exige un payload protocole V4 explicite.');
  }
  if (action.type !== 'food') {
    throw new TypeError('Une référence C5 exige une action alimentaire.');
  }
  // SANS CE RETOUR, LA RÉFÉRENCE DISPARAÎTRAIT EN SILENCE : `normalizeActions`
  // RECONSTRUIT chaque action depuis une liste blanche, et un champ qu'elle
  // ignore n'est ni refusé ni persisté. C'est le piège que [[D-240]] a nommé, et
  // il vaut ici mot pour mot.
  return { foodCompassRef: action.foodCompassRef };
}

/**
 * L'ORIENTATION VERS LE MÉDECIN ([[D-257]] §8, LOT-05) : due dès qu'un constat
 * est adressé, en tête, au texte signé, et nulle part ailleurs.
 *
 * EXIGÉE, PAS INJECTÉE. Le moteur ne compose rien à la place du praticien : il
 * refuse un protocole qui ne l'ouvre pas — l'écran la pose, la route la
 * reçoit, et ce contrôle dit pourquoi un protocole sans elle ne part pas. Hors
 * de la levée, l'identifiant réservé est refusé : il servirait à loger une
 * quatrième action hors borne.
 */
function assertOrientation(actions: ProtocolAction[], requise: boolean): void {
  const reservees = actions.filter(action => action.actionId === ACTION_ID_ORIENTATION);
  if (!requise) {
    if (reservees.length > 0) {
      throw new TypeError('L’orientation vers le médecin n’ouvre un protocole que lorsqu’un signal d’alerte a été adressé.');
    }
    return;
  }
  const tete = actions[0];
  if (tete === undefined || !estActionOrientation(tete) || reservees.length !== 1) {
    throw new TypeError('Un signal d’alerte a été adressé : le protocole doit s’ouvrir sur l’orientation vers le médecin.');
  }
  if (tete.title !== TEXTE_ORIENTATION.title
    || tete.idealPlan !== TEXTE_ORIENTATION.idealPlan
    || tete.minimalPlan !== TEXTE_ORIENTATION.minimalPlan
    || tete.rescuePlan !== TEXTE_ORIENTATION.rescuePlan
    || (tete.limitations ?? []).length > 0) {
    throw new TypeError('L’orientation vers le médecin porte un texte signé : il ne se modifie pas.');
  }
  // NON RETIRABLE, Y COMPRIS PAR SON STATUT (A11, revue du 2026-10-03, P2-1).
  // Un statut V4 autre qu'`active` la ferait lire au patient « Écarté pour
  // vous » ou « Prévu pour plus tard » : retirée sans l'être. Aucune référence
  // (assiette, Boussole, complément, attente) ne s'y greffe non plus.
  if ((tete.interventionStatus !== undefined && tete.interventionStatus !== 'active')
    || tete.waitFor !== undefined
    || tete.recommendedPlateRef !== undefined
    || tete.foodCompassRef !== undefined
    || tete.supplementCatalogRef !== undefined) {
    throw new TypeError('L’orientation vers le médecin reste active et ne porte aucune référence : elle ne se suspend pas.');
  }
  // ELLE OUVRE UN PROTOCOLE, ELLE N'EN TIENT PAS LIEU (arbitrage du
  // 2026-10-03, Q4) : au moins une action du praticien la suit — la règle que
  // le constructeur appliquait déjà, désormais tenue au serveur.
  if (actions.length < 2) {
    throw new TypeError('L’orientation vers le médecin ouvre le protocole : au moins une action du praticien doit la suivre.');
  }
}

function normalizeActions(
  actions: ProtocolAction[],
  version: ProtocolDraft['version'],
  orientation = false,
): ProtocolAction[] {
  assertOrientation(actions, orientation);
  // L'ORIENTATION EST HORS BORNE (A4) : elle n'est pas une intervention. La
  // borne des trois porte sur les AUTRES actions, et sur elles seules.
  const interventions = actions.filter(action => !(orientation && estActionOrientation(action)));
  if (interventions.length > MAX_ACTIONS_PROTOCOLE_21J) {
    throw new TypeError('Un protocole 21 jours ne peut contenir que trois actions maximum.');
  }
  const ids = new Set<string>();
  return actions.map(action => {
    const actionId = nonEmpty(action.actionId, 'actionId');
    if (ids.has(actionId)) throw new TypeError(`Action dupliquée : ${actionId}.`);
    ids.add(actionId);
    if (!(ACTION_TYPES as readonly string[]).includes(action.type)) throw new TypeError('Type d’action inconnu.');
    // LA BOUSSOLE ET L'ASSIETTE CESSENT DE S'EXCLURE ([[D-243]]).
    //
    // CE REFUS ÉTAIT INCONDITIONNEL — la seule des quatre gardes voisines à
    // ignorer le paramètre `version` pourtant en portée. Le chemin V2 ne s'y
    // heurtait pas : `buildFoodCompassProtocolV2FromSource` construit d'abord
    // un brouillon SANS référence, puis les réinjecte. Conséquence : un
    // protocole V4 — donc tout protocole portant une assiette prescrite depuis
    // [[D-240]], ou une intention suspendue depuis [[D-056]] — ne pouvait
    // porter AUCUNE Boussole d'aliment. [[D-213]] §12 veut pourtant que « la
    // Boussole reste atteignable depuis le protocole » : elle cessait de
    // l'être dès qu'on y prescrivait une assiette.
    //
    // V4 SEULEMENT, ET EXPLICITEMENT. V1 et V3 gardent leur refus mot pour mot.
    // La relecture, elle, acceptait déjà un V4 porteur de référence — elle ne
    // nomme que V1 et V2 (`assertProtocolDraftC5Structure`) : ce lot aligne
    // l'écriture sur ce que la lecture tolérait, il n'élargit pas la lecture.
    //
    // CE QUI RESTE VRAI DE V2. Un payload V2 EXIGE au moins une référence, et
    // V4 n'en exige aucune : l'exclusivité était unilatérale, et seule la
    // moitié qui bloquait tombe. Aucun chemin existant ne change — un protocole
    // qui ne porte que des aliments reste servi en V2.
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
      ...normalizePlateRef(action, version),
      ...normalizeFoodCompassRef(action, version),
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
  const actions = normalizeActions(input.actions ?? [], requestedVersion, orientationRequise(input.decisionCard));
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
