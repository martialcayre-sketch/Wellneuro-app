import type { JalonMomentum, NiveauPreuveBesoin, StrateCode } from '../equilibre/types';

export const VERSION_SCHEMA_CLINICAL_SNAPSHOT = 'c1-clinical-snapshot-v1' as const;
export const VERSION_MAPPING_BESOINS = 'besoins-v1' as const;
export const VERSION_OBJETS_CLINIQUES = 'objets-cliniques-v1' as const;
export const VERSION_CLINICAL_REVIEW = 'c1-clinical-review-v1' as const;
export const VERSION_DECISION_CARD = 'c1-decision-card-v1' as const;
export const VERSION_PROTOCOL_DRAFT = 'c1-protocol-draft-v1' as const;

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

export type ConfirmedAssessmentEpisode = AssessmentEpisodeBase & {
  status: 'confirmed';
  confirmedAt: string;
};

export type AssessmentEpisode = ProposedAssessmentEpisode | ConfirmedAssessmentEpisode;

export type PatientContext = {
  mainReason: string | null;
  priorityGoal: string | null;
  expectations: string[];
  constraints: string[];
};

export type QuestionnaireFinding = AssessmentResponseRef & {
  evaluability: 'calculable' | 'not_calculable';
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
  | 'supplement_exploration';

export type ProtocolAction = {
  actionId: string;
  type: ProtocolActionType;
  title: string;
  idealPlan: string;
  minimalPlan: string;
  rescuePlan: string;
  limitations: string[];
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
  version: typeof VERSION_PROTOCOL_DRAFT;
  status: 'draft' | 'practitioner_reviewed';
  purpose: string;
  followUpCriterion: string;
  adviceSheetRef: string | null;
  actions: ProtocolAction[];
  therapeuticLoad: TherapeuticLoad;
  review: ProtocolReview | null;
  limitations: string[];
  inputHash: string;
};
