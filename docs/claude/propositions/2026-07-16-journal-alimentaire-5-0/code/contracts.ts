export type IsoDate = string;
export type IsoDateTime = string;

export type ObservationMode = 'panoramic' | 'focused' | 'hybrid';
export type ObservationIntensity = 'light' | 'standard' | 'minimal';
export type EpisodeStatus = 'prepared' | 'active' | 'paused' | 'closed' | 'interrupted';
export type MealMoment = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other';
export type CaptureMode =
  | 'instant'
  | 'signature'
  | 'copy_difference'
  | 'manual_markers'
  | 'voice_confirmed'
  | 'photo_confirmed'
  | 'recall_simplified';

export type EvidenceOrigin =
  | 'patient_confirmed'
  | 'assistant_proposed'
  | 'derived_deterministic'
  | 'recalled_simplified'
  | 'unknown';

export type ObservationSufficiency =
  | 'insufficient'
  | 'exploratory'
  | 'sufficient_for_phase_question'
  | 'high_confidence';

export type AdherenceWeather = 'regular' | 'fragile' | 'interrupted';

export interface SourceRef {
  sourceType: 'questionnaire' | 'meal_event' | 'daily_state' | 'check_in' | 'rule' | 'corpus';
  sourceId: string;
  observedAt?: IsoDateTime;
  version?: string;
}

export interface ObservationWindow {
  windowId: string;
  from: IsoDate;
  to: IsoDate;
  intensity: ObservationIntensity;
  requiredMarkerCodes: string[];
  requiredContextCodes: string[];
  rationalePatient: string;
  rationalePractitioner: string;
}

export interface ObservationPolicy {
  policyId: string;
  version: string;
  mode: ObservationMode;
  questionType: string;
  windows: ObservationWindow[];
  maxPromptsPerDay: number;
  allowMinimalPlan: boolean;
  sufficientObservationRuleId: string;
}

export interface DietaryActionTarget {
  actionId: string;
  labelPatient: string;
  behaviorCode: string;
  mealMoments?: MealMoment[];
  targetFrequency?: { count: number; period: 'day' | 'week' | 'episode' };
  idealPlan: string;
  minimalPlan: string;
  rescuePlan?: string;
  observableOpportunityRuleId: string;
}

export interface FoodObservationEpisode {
  episodeId: string;
  patientId: string;
  assessmentEpisodeId?: string;
  protocolDraftId?: string;
  decisionId?: string;
  startDate: IsoDate;
  endDate: IsoDate;
  status: EpisodeStatus;
  phaseQuestion: string;
  policy: ObservationPolicy;
  actionTargets: DietaryActionTarget[];
  versions: {
    schema: string;
    markerRegistry: string;
    coverageEngine: string;
    questionnaireProjection: string;
    foodCompassMapping?: string;
    corpusBuild?: string;
  };
}

export interface MarkerObservation {
  markerCode: string;
  presence: boolean;
  portion?: 'small' | 'usual' | 'generous' | 'presence_only';
  details?: string[];
  origin: EvidenceOrigin;
  confidence: number;
}

export interface RawAssetPolicy {
  kind: 'none' | 'voice' | 'photo';
  retained: boolean;
  deletionPlannedAt?: IsoDateTime;
  consentEventId?: string;
}

export interface MealObservationEvent {
  eventId: string;
  episodeId: string;
  occurredAt?: IsoDateTime;
  localDate: IsoDate;
  mealMoment: MealMoment;
  captureMode: CaptureMode;
  signatureId?: string;
  markers: MarkerObservation[];
  contextCodes: string[];
  patientConfirmed: boolean;
  rawAssetPolicy: RawAssetPolicy;
  createdAt: IsoDateTime;
  supersedesEventId?: string;
  schemaVersion: string;
}

export interface MealSignature {
  signatureId: string;
  patientId: string;
  label: string;
  defaultMealMoment?: MealMoment;
  markers: Omit<MarkerObservation, 'origin' | 'confidence'>[];
  contextCodes: string[];
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  archivedAt?: IsoDateTime;
}

export interface MinimalPlanEvent {
  eventId: string;
  episodeId: string;
  from: IsoDate;
  to: IsoDate;
  activatedBy: 'patient' | 'practitioner';
  rationaleRequired: false;
  createdAt: IsoDateTime;
}

export interface CoverageFinding {
  sufficiency: ObservationSufficiency;
  relevantOpportunities: number;
  documentedOpportunities: number;
  confirmedEvents: number;
  recalledEvents: number;
  contextDiversity: number;
  temporalDistribution: number;
  missingContexts: string[];
  limitations: string[];
  ruleId: string;
  ruleVersion: string;
}

export interface QuestionnaireItemProjection {
  questionnaireId: 'Q_ALI_01' | 'Q_ALI_02';
  itemId: string;
  status: 'supported' | 'contradicted' | 'undetermined' | 'non_inferable';
  observedSummary?: string;
  sourceRefs: SourceRef[];
  limitations: string[];
}

export interface DietaryDiscordance {
  discordanceId: string;
  code: string;
  label: string;
  left: SourceRef[];
  right: SourceRef[];
  description: string;
  questionToAsk: string;
  possibleImpact: string;
  limitations: string[];
}

export interface AdherenceWeatherFinding {
  state: AdherenceWeather;
  causeCodes: string[];
  causeLabels: string[];
  sourceRefs: SourceRef[];
  generatedAt: IsoDateTime;
  visibleToPatient: false;
  ruleVersion: string;
}

export interface FoodTrajectorySnapshot {
  snapshotId: string;
  episodeId: string;
  generatedAt: IsoDateTime;
  coverage: CoverageFinding;
  actionFindings: Array<{
    actionId: string;
    documentedOpportunities: number;
    achievedOpportunities: number;
    notPossibleOpportunities: number;
    summary: string;
    limitations: string[];
  }>;
  axisFindings: Array<{
    axisCode: string;
    status: 'supporting' | 'to_strengthen' | 'not_documented';
    summary: string;
    sourceRefs: SourceRef[];
    limitations: string[];
  }>;
  questionnaireProjections: QuestionnaireItemProjection[];
  discordances: DietaryDiscordance[];
  adherenceWeather?: AdherenceWeatherFinding;
  missingData: string[];
  globalLimitations: string[];
  versions: FoodObservationEpisode['versions'];
}
