import type { JalonMomentum, NiveauPreuveBesoin, StrateCode } from '../equilibre/types';

export const VERSION_SCHEMA_CLINICAL_SNAPSHOT = 'c1-clinical-snapshot-v1' as const;
export const VERSION_MAPPING_BESOINS = 'besoins-v1' as const;
export const VERSION_OBJETS_CLINIQUES = 'objets-cliniques-v1' as const;

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
