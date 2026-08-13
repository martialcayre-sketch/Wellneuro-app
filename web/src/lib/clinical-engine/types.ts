import type { JalonMomentum, NiveauPreuveBesoin, StrateCode } from '../equilibre/types';
import type { FoodCompassActionRef } from '../food-compass/types';

export const VERSION_SCHEMA_CLINICAL_SNAPSHOT = 'c1-clinical-snapshot-v1' as const;
// v1 → v2 (2026-07-28) : le besoin 3 « Rythme alimentaire » gagne une source.
// Cette étiquette entre dans `ClinicalSnapshot.inputHash`, donc dans la chaîne
// de provenance persistée — la laisser à v1 ferait porter deux mappings par une
// même étiquette, le défaut que `VERSION_SCORE_EQUILIBRE` existe pour empêcher
// côté score. Coût mesuré avant bump : `protocol_drafts`,
// `protocol_diffusion_approvals` et `assessment_episodes` sont VIDES en
// production, aucun hash persisté ne bouge.
export const VERSION_MAPPING_BESOINS = 'besoins-v2' as const;
// v1 → v2 (2026-08-12, [[D-052]]) : `ConfirmedAssessmentEpisode` gagne
// `preconditionOverrides`, la trace des conditions souples contournées.
//
// CE QUE CETTE ÉTIQUETTE TOUCHE, vérifié plutôt que supposé (une première
// rédaction invoquait `protocol_drafts.contract_version`, qui porte en réalité
// `draft.version` et jamais cette constante — le contrôle ne pouvait rien
// trouver). Elle entre dans `versions.clinicalObjects` du snapshot, donc dans
// `snapshot.inputHash` → `decisionCard.inputHash` → `draft.inputHash` →
// `versionId`, et dans `assessment_episodes.contract_version`.
//
// Deux raisons pour lesquelles aucun hash persisté ne bouge : en production,
// `assessment_episodes` est VIDE (0 ligne au 2026-08-12) ; et une version de
// protocole déjà écrite est relue par `reconstructProtocolDraft`, qui recalcule
// son empreinte DEPUIS LE PAYLOAD STOCKÉ, sans réinjecter cette constante.
//
// CE QUI BOUGERAIT sur un fil déjà persisté : le premier enregistrement après
// déploiement compterait comme changement clinique sans changement clinique
// (`clinicalContentHash` inclut `decisionCardInputHash`). Zéro fil concerné
// aujourd'hui — dit ici parce que ce serait invisible autrement.
export const VERSION_OBJETS_CLINIQUES = 'objets-cliniques-v2' as const;
export const VERSION_CLINICAL_REVIEW = 'c1-clinical-review-v1' as const;
export const VERSION_DECISION_CARD = 'c1-decision-card-v1' as const;
export const VERSION_PROTOCOL_DRAFT = 'c1-protocol-draft-v1' as const;
export const VERSION_PROTOCOL_DRAFT_V2 = 'c1-protocol-draft-v2' as const;
export const VERSION_PROTOCOL_DRAFT_V3 = 'c1-protocol-draft-v3' as const;
export const VERSION_PROTOCOL_DRAFT_V4 = 'c1-protocol-draft-v4' as const;
export const VERSION_PATIENT_PROTOCOL_VIEW = 'c1-patient-protocol-view-v1' as const;

export type MeasurementUnit = 'ratio' | 'score_100' | 'delta';

export type Measurement = {
  value: number | null;
  unit: MeasurementUnit;
};

export type QuestionnaireResponseInput = {
  responseId: string;
  questionnaireId: string;
  observedAt: string;
  scoresJson: unknown;
  scoreVersion: string | null;
};

export type AssessmentResponseRef = {
  responseId: string;
  questionnaireId: string;
  observedAt: string;
  scoreVersion: string | null;
};

export type SourceDateRange = { min: string; max: string };

type AssessmentEpisodeBase = {
  assessmentEpisodeId: string;
  patientId: string;
  milestone: JalonMomentum;
  targetAt: string;
  window: { start: string; end: string; toleranceDays: number };
  candidateResponses: AssessmentResponseRef[];
  inWindowResponseIds: string[];
  outOfWindowResponseIds: string[];
  includedResponseIds: string[];
  sourceDateRange: SourceDateRange | null;
};

export type ProposedAssessmentEpisode = AssessmentEpisodeBase & {
  status: 'proposed';
};

/**
 * Contournement d'une condition souple de confirmation T0 ([[D-052]]).
 *
 * `decidePar` et `decideLe` sont POSÉS PAR LE SERVEUR à la confirmation
 * (`api/praticien/cockpit`). L'épisode transitant ensuite par le navigateur,
 * les deux points de persistance les RECOUPENT champ par champ contre la
 * session — ils les vérifient plutôt qu'ils ne les réécrivent, car réécrire
 * ferait diverger l'épisode de celui qui a été haché dans `snapshot.inputHash`.
 * Un contournement dont l'auteur n'est pas la session, dont la date n'est pas
 * une date, ou dont la condition n'est pas en défaut, est refusé en 422.
 */
export type PreconditionOverride = {
  /** Identifiant de la condition souple contournée (`contradictions_ouvertes`…). */
  conditionId: string;
  /** Justification saisie par le praticien. Obligatoire, non vide. */
  motif: string;
  /** Adresse du praticien, issue de la session serveur. */
  decidePar: string;
  /** Horloge serveur, comme `confirmedAt`. */
  decideLe: string;
};

export type ConfirmedAssessmentEpisode = AssessmentEpisodeBase & {
  status: 'confirmed';
  confirmedAt: string;
  /**
   * Porté par la forme CONFIRMÉE seulement, et optionnel : sur
   * `AssessmentEpisodeBase`, `proposeAssessmentEpisode` devrait l'inventer et
   * tous les `proposalHash` déjà émis se déplaceraient.
   */
  preconditionOverrides?: PreconditionOverride[];
};

export type AssessmentEpisode = ProposedAssessmentEpisode | ConfirmedAssessmentEpisode;

export type PatientContext = {
  mainReason: string | null;
  priorityGoal: string | null;
  expectations: string[];
  constraints: string[];
};

export type QuestionnaireFinding = AssessmentResponseRef & {
  // `not_interpretable` est un troisième état, et pas un synonyme du deuxième :
  // `not_calculable` dit que les réponses brutes manquent ou sont incomplètes,
  // `not_interpretable` dit qu'elles sont là, complètes, mais que l'instrument
  // servi ne correspond pas à sa source publiée — le résultat n'est donc pas la
  // mesure que son titre annonce. Les confondre ferait affirmer « la réponse ne
  // contient pas de données brutes exploitables » sur une passation qui en
  // porte vingt (`Q_SOM_07`, mesuré en production le 2026-07-27).
  evaluability: 'calculable' | 'not_calculable' | 'not_interpretable';
  limitations: string[];
};

export type NeedAssessment = {
  needId: number;
  strata: StrateCode;
  measurement: Measurement;
  evaluability: 'measured' | 'partial' | 'not_measured';
  evidence: NiveauPreuveBesoin;
  questionnaireIds: string[];
};

export type BalanceAssessment = {
  global: Measurement;
  globalBeforeCap: Measurement;
  strata: Array<{ code: StrateCode; measurement: Measurement }>;
  needs: NeedAssessment[];
  criticalFoundations: Array<{ needId: number; measurement: Measurement }>;
  limitations: string[];
};

export type ClinicalObjectCode =
  | 'GLOBAL_BALANCE'
  | 'METABOLIC_STABILITY'
  | 'ADAPTATION_RESERVE'
  | 'CLARITY'
  | 'MOMENTUM';

export type ClinicalObjectFinding = {
  code: ClinicalObjectCode;
  measurement: Measurement;
  definitionVersion: string;
  sourceResponseIds: string[];
  limitations: string[];
};

export type ClinicalSnapshotVersions = {
  snapshotSchema: string;
  questionnaireScoring: Array<{ responseId: string; questionnaireId: string; version: string | null }>;
  balanceScore: string;
  needMapping: string;
  clinicalObjects: string;
};

export type ClinicalSourceRef = AssessmentResponseRef & {
  sourceType: 'questionnaire';
  status: 'calculated' | 'to_verify';
  limitations: string[];
};

export type ClinicalSnapshot = {
  snapshotId: string;
  patientId: string;
  asOf: string;
  assessmentEpisode: ConfirmedAssessmentEpisode;
  patientContext: PatientContext;
  questionnaireFindings: QuestionnaireFinding[];
  balanceAssessment: BalanceAssessment;
  clinicalObjects: ClinicalObjectFinding[];
  completeness: {
    availableDomains: string[];
    missingDomains: string[];
    staleSources: string[];
    sourceDateRange: SourceDateRange | null;
  };
  sourceRefs: ClinicalSourceRef[];
  versions: ClinicalSnapshotVersions;
  limitations: string[];
  inputHash: string;
};

export type QualitativeConfidence = 'solide' | 'probable' | 'fragile' | 'à_documenter';
export type MissingDataPriority = 'critical_for_decision' | 'useful_not_urgent' | 'optional' | null;

export type ClinicalFindingProvenance = {
  responseIds: string[];
  needIds: number[];
  clinicalObjectCodes: ClinicalObjectCode[];
};

export type CandidateClinicalRuleRef = {
  ruleId: string;
  version: string;
  lifecycle: 'candidate';
};

export type ValidatedClinicalRuleRef = {
  ruleId: string;
  version: string;
  lifecycle: 'clinically_validated';
  validation: {
    validatedAt: string;
    validatorRole: 'practitioner';
    sourceReference: string;
  };
};

export type ClinicalRuleRef = CandidateClinicalRuleRef | ValidatedClinicalRuleRef;

type ClinicalFindingBase = {
  findingId: string;
  confidence: QualitativeConfidence;
  provenance: ClinicalFindingProvenance;
  ruleId: string | null;
  limitations: string[];
};

export type MissingDataFinding = ClinicalFindingBase & {
  kind: 'missing_data';
  priority: MissingDataPriority;
  uncertaintyExplanation: string;
  potentialDecisionImpact: string;
};

export type DiscordanceFinding = ClinicalFindingBase & {
  kind: 'discordance';
  audience: 'practitioner_only';
  interpretation: 'point_to_explore';
  signal: string;
  questionToExplore: string;
  possibleProtocolImpact: string;
  ruleId: string;
};

export type SafetyFinding = ClinicalFindingBase & {
  kind: 'safety';
  disposition: 'requires_practitioner_review';
  rationale: string;
  ruleId: string;
};

export type AbstentionAssessment =
  | { status: 'not_evaluated'; ruleIds: []; limitations: string[] }
  | { status: 'not_required' | 'required'; ruleIds: string[]; limitations: string[] };

export type ClinicalReview = {
  reviewId: string;
  snapshotId: string;
  snapshotInputHash: string;
  createdAt: string;
  version: typeof VERSION_CLINICAL_REVIEW;
  rules: ClinicalRuleRef[];
  missingData: MissingDataFinding[];
  discordances: DiscordanceFinding[];
  safetyFindings: SafetyFinding[];
  abstention: AbstentionAssessment;
  limitations: string[];
  inputHash: string;
};

export type DecisionPriorityCandidate = {
  candidateId: string;
  origin: 'engine';
  label: string;
  rank: number;
  confidence: QualitativeConfidence;
  ruleId: string;
  rationale: string;
  provenance: ClinicalFindingProvenance;
  limitations: string[];
};

export type DecisionPrioritySelection = {
  candidateId: string;
  selectedAt: string;
  selectedBy: 'practitioner';
  rationale: string;
};

export type DecisionCounterfactual = {
  counterfactualId: string;
  candidateId: string;
  condition: string;
  expectedImpact: string;
  provenance: ClinicalFindingProvenance;
  limitations: string[];
};

export type DecisionCard = {
  decisionCardId: string;
  snapshotId: string;
  snapshotInputHash: string;
  reviewId: string;
  reviewInputHash: string;
  createdAt: string;
  version: typeof VERSION_DECISION_CARD;
  status: 'draft';
  priorityCandidates: DecisionPriorityCandidate[];
  proposedMainPriorityId: string | null;
  selectedMainPriority: DecisionPrioritySelection | null;
  counterfactuals: DecisionCounterfactual[];
  missingDataFindingIds: string[];
  discordanceFindingIds: string[];
  safetyFindingIds: string[];
  abstention: AbstentionAssessment;
  limitations: string[];
  inputHash: string;
};

export type ProtocolActionType =
  | 'food'
  | 'chronobiology'
  | 'calming_routine'
  | 'gentle_activity'
  | 'hydration'
  | 'advice_sheet'
  | 'biological_exploration'
  | 'supplement_exploration'
  /** Recueil sans intervention : agenda du sommeil, journal alimentaire. */
  | 'observation'
  /** Orientation vers le médecin traitant — jamais une prescription. */
  | 'medical_referral';

/**
 * Statut d'intervention d'une action de protocole (contrat V4, `D-056`).
 *
 * Il ne se déduit d'aucun autre champ : une action V4 le déclare, faute de quoi
 * la construction échoue. Une action des contrats V1 à V3 n'en porte pas — son
 * absence se lit « contrat antérieur au statut », jamais « active » implicite.
 */
export type ProtocolInterventionStatus =
  | 'active'
  | 'conditionnelle_biologie'
  | 'differee'
  | 'contre_indiquee'
  | 'non_indiquee_actuellement';

/**
 * Attente explicite qui suspend une intervention. Seule la biologie est
 * représentable en V1 du contrat ; `cible` nomme l'analyte attendu en clair et
 * `echeance`, quand elle est posée, est une date ISO canonique.
 */
export type ProtocolWaitFor = {
  type: 'biologie';
  cible: string;
  echeance?: string;
};

/**
 * Référence opaque et gouvernée vers une sélection du catalogue de compléments
 * (C4) : règle clinique versionnée + justification, posée uniquement par le
 * praticien — jamais générée par l'IA, jamais saisie en texte libre.
 * `productId` est optionnel : le schéma produit (`SupplementProduct`) arrive au
 * LOT-01 ; la validation d'existence (FK) du produit sera branchée à ce
 * moment-là. D'ici là, la référence est validée structurellement, sans
 * résolution.
 */
export type SupplementCatalogRef = {
  ingredientId: string;
  ruleId: string;
  ruleVersion: number;
  productId?: string;
  justification: string;
};

export type ProtocolAction = {
  actionId: string;
  type: ProtocolActionType;
  title: string;
  idealPlan: string;
  minimalPlan: string;
  rescuePlan: string;
  limitations: string[];
  /** Référence C5 uniquement dans un payload protocole V2. */
  foodCompassRef?: FoodCompassActionRef;
  /** Référence catalogue C4 uniquement dans un payload protocole V3 ou V4, sur une action `supplement_exploration` seule. */
  supplementCatalogRef?: SupplementCatalogRef;
  /** Requis sur toute action d'un payload V4 ; interdit avant (`D-056`). */
  interventionStatus?: ProtocolInterventionStatus;
  /** Requis si et seulement si `interventionStatus` vaut `conditionnelle_biologie`. */
  waitFor?: ProtocolWaitFor;
};

/**
 * Phase de protocole (V1 des phases, contrat V4). Les actions ne sont pas
 * recopiées : la phase cite les `actionId` du protocole, pour qu'une action
 * n'existe jamais en deux exemplaires divergents. `reviewAt` est la date ISO
 * canonique à laquelle la phase est censée être relue.
 */
export type ProtocolPhase = {
  phaseId: string;
  duree: string;
  objectifs: string[];
  actionIds: string[];
  mesures: string[];
  prerequis: string[];
  reviewAt: string;
};

export type TherapeuticLoad = {
  level: 'light' | 'moderate' | 'loaded' | 'excessive';
  source: 'practitioner';
  justification: string | null;
};

export type ProtocolReview = {
  reviewedAt: string;
  reviewerRole: 'practitioner';
  confirmation: 'content_reviewed';
};

export type ProtocolDraft = {
  protocolDraftId: string;
  decisionCardId: string;
  decisionCardInputHash: string;
  selectedPriorityId: string;
  createdAt: string;
  updatedAt: string;
  version:
    | typeof VERSION_PROTOCOL_DRAFT
    | typeof VERSION_PROTOCOL_DRAFT_V2
    | typeof VERSION_PROTOCOL_DRAFT_V3
    | typeof VERSION_PROTOCOL_DRAFT_V4;
  status: 'draft' | 'practitioner_reviewed';
  purpose: string;
  followUpCriterion: string;
  adviceSheetRef: string | null;
  actions: ProtocolAction[];
  /** Phases uniquement dans un payload V4 ; absentes ailleurs (`D-056`). */
  phases?: ProtocolPhase[];
  therapeuticLoad: TherapeuticLoad;
  review: ProtocolReview | null;
  limitations: string[];
  inputHash: string;
};

export type ProtocolDiffusionApproval = {
  decisionCardInputHash: string;
  protocolDraftInputHash: string;
  approvedAt: string;
  approvedBy: 'practitioner';
  confirmation: 'content_approved_for_diffusion';
};

export type PatientProtocolAction = {
  actionId: string;
  type: ProtocolActionType;
  title: string;
  minimalPlan: string;
};

export type PatientProtocolView = {
  decisionCardId: string;
  decisionCardInputHash: string;
  protocolDraftId: string;
  protocolDraftInputHash: string;
  selectedPriorityId: string;
  priorityLabel: string;
  version: typeof VERSION_PATIENT_PROTOCOL_VIEW;
  diffusionStatus: 'approved_for_diffusion';
  deliveryStatus: 'not_transmitted';
  approvedAt: string;
  purpose: string;
  followUpCriterion: string;
  adviceSheetRef: string | null;
  actions: PatientProtocolAction[];
  limitations: string[];
  inputHash: string;
};
