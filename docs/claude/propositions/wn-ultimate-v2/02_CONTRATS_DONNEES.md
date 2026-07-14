---
id: "wellneuro-contrats-donnees-v2"
version: "2.0"
date_source_declaree: "2026-07-14"
integre_le: "2026-07-13"
statut_integration: "proposition_non_executable_a_valider"
statut: "a_valider_avant_codage"
---

# Contrats de données

## 1. Règle

Les contrats TypeScript et les tests purs précèdent toute migration Prisma.

## 2. Provenance

```ts
type MeasurementEvidence = "A" | "B" | "C" | "D" | "NON_MESURE";

type ObservationStatus =
  | "declared"
  | "observed"
  | "calculated"
  | "hypothesis"
  | "to_verify"
  | "confirmed";

type SourceRef = {
  sourceType:
    | "questionnaire"
    | "anamnesis"
    | "medication"
    | "supplement"
    | "food_diary"
    | "checkin"
    | "external_document"
    | "practitioner"
    | "clinical_corpus";
  sourceId: string;
  sourceVersion?: string;
  observedAt?: string;
  evidence?: MeasurementEvidence;
  status: ObservationStatus;
};
```

## 3. Épisode et mesure d’équilibre

```ts
type AssessmentMilestone = "T0" | "J21" | "J42" | "J90" | "OTHER";

type AssessmentEpisode = {
  assessmentEpisodeId: string;
  patientId: string;
  milestone: AssessmentMilestone;
  openedAt: string;
  closedAt?: string;
  responseIds: string[];
  status: "open" | "complete" | "partial" | "expired";
  sourceDateRange?: { min: string; max: string };
};

type NeedAssessment = {
  needId: number;
  coverage: number | null;
  evaluability: "measured" | "partial" | "not_measured";
  questionnaireRefs: string[];
};

type BalanceAssessment = {
  assessmentId: string;
  assessmentEpisodeId?: string;
  measuredAt: string;
  globalScore: number | null;
  globalScoreBeforeCap: number | null;
  scoreVersion: string;
  mappingVersion: string;
  strata: Array<{
    code: "CORPS" | "ANCRAGE" | "ESPRIT";
    coverage: number | null;
  }>;
  needs: NeedAssessment[];
  criticalFoundations: Array<{
    needId: number;
    coverage: number;
    ruleId: string;
    ruleVersion: string;
  }>;
  limitations: string[];
};
```

## 4. Objets cliniques et momentum

```ts
type ClinicalObjectFinding = {
  code:
    | "GLOBAL_BALANCE"
    | "CLARITY"
    | "ADAPTATION_RESERVE"
    | "METABOLIC_STABILITY"
    | "MOMENTUM";
  value: number | null;
  unit: "ratio" | "score_100" | "delta";
  definitionVersion: string;
  sourceRefs: SourceRef[];
  limitations: string[];
};

type MomentumFinding = {
  fromMilestone: AssessmentMilestone;
  toMilestone: AssessmentMilestone;
  delta: number | null;
  fromScoreVersion?: string;
  toScoreVersion?: string;
  comparable: boolean;
  nonComparabilityReasons: string[];
};
```

## 5. ClinicalSnapshot

```ts
type ClinicalSnapshotVersions = {
  snapshotSchema: string;
  questionnaireScoring: string;
  balanceScore: string;
  needMapping: string;
  clinicalObjects: string;
  signalRules: string;
  safetyRules: string;
  clinicalCorpus?: string;
  knowledgeCompiler?: string;
  retrievalPolicy?: string;
  foodDiarySchema?: string;
  foodDiaryAggregation?: string;
  foodCompass?: string;
};

type ClinicalSnapshot = {
  snapshotId: string;
  patientId: string;
  asOf: string;
  assessmentEpisodeId?: string;
  versions: ClinicalSnapshotVersions;

  patientContext: {
    mainReason?: string;
    priorityGoal?: string;
    expectations: string[];
    medications: CurrentSubstance[];
    supplements: CurrentSubstance[];
    allergies: string[];
    preferences: Record<string, unknown>;
    constraints: Record<string, unknown>;
  };

  questionnaireFindings: QuestionnaireFinding[];
  balanceAssessment?: BalanceAssessment;
  clinicalObjects: ClinicalObjectFinding[];
  dietaryTrajectory?: DietaryTrajectoryFinding;
  checkinFindings?: CheckinFinding[];
  safetyFindings: SafetyFinding[];

  completeness: {
    availableDomains: string[];
    missingDomains: string[];
    staleSources: string[];
    sourceDateRange?: { min: string; max: string };
  };

  sourceRefs: SourceRef[];
  inputHash: string;
};
```

## 6. Signaux, manques, discordances et sécurité

```ts
type ClinicalSignal = {
  signalId: string;
  code: string;
  domain: string;
  label: string;
  direction: "favorable" | "vulnerability" | "alert" | "unknown";
  intensity: "low" | "moderate" | "high" | "critical";
  ruleId: string;
  ruleVersion: string;
  rationale: string;
  sourceRefs: SourceRef[];
  claimRefs: string[];
  knowledgeCardRefs: string[];
  limitations: string[];
};

type MissingDataRequirement = {
  code: string;
  label: string;
  domain: string;
  priority: "critical" | "useful" | "optional";
  reason: string;
  decisionImpact: string;
  acquisitionMode:
    | "questionnaire"
    | "interview"
    | "measurement"
    | "journal"
    | "exploration_to_discuss"
    | "external_document";
  blocker: boolean;
  ruleId: string;
  ruleVersion: string;
};

type ClinicalDiscordance = {
  discordanceId: string;
  code: string;
  description: string;
  sourceRefs: SourceRef[];
  questionToAsk: string;
  possibleImpact: string;
  status: "open" | "explained" | "resolved";
};

type SafetyFinding = {
  findingId: string;
  severity: "info" | "caution" | "blocker" | "medical_referral";
  code: string;
  label: string;
  sourceRefs: SourceRef[];
  ruleId: string;
  ruleVersion: string;
  requiredAction: string;
};
```

## 7. Décision et protocole

```ts
type DecisionCard = {
  decisionId: string;
  snapshotId: string;
  mainPriority: {
    code: string;
    label: string;
    rationale: string;
    dominoClass?: "foundation" | "intermediate" | "peripheral";
  };
  secondaryPriorities: Array<{
    code: string;
    label: string;
    status: "monitor" | "explore" | "defer";
  }>;
  convergentSignalIds: string[];
  discordanceIds: string[];
  missingDataCodes: string[];
  safetyFindingIds: string[];
  counterfactuals: string[];
  phaseGoal: string;
  observableAtJ21: string[];
  ruleRefs: string[];
  claimRefs: string[];
  corpusVersion?: string;
  status:
    | "engine_draft"
    | "ai_draft"
    | "practitioner_modified"
    | "practitioner_validated"
    | "rejected";
};

type ProtocolAction = {
  actionId: string;
  intentCode: string;
  domain:
    | "food"
    | "rhythm"
    | "activity"
    | "regulation"
    | "supplement"
    | "exploration"
    | "referral";
  label: string;
  rationale: string;
  idealPlan: string;
  minimalPlan: string;
  rescuePlan?: string;
  observableCriteria: string[];
  safetyFindingIds: string[];
  burdenPoints: number;
  interventionBlockRef?: string;
  claimRefs: string[];
  dietaryTarget?: DietaryActionTarget;
};

type ProtocolDraft = {
  protocolDraftId: string;
  decisionId: string;
  phaseNumber: number;
  phaseGoal: string;
  startDate?: string;
  endDate?: string;
  actions: ProtocolAction[];
  therapeuticLoad: {
    score: number;
    level: "light" | "moderate" | "high" | "excessive";
    reasons: string[];
    overrideJustification?: string;
  };
  status:
    | "draft"
    | "practitioner_validated"
    | "active"
    | "completed"
    | "stopped";
  validation?: ClinicalValidation;
};
```

## 8. Journal alimentaire

```ts
type FoodDiaryProgram = {
  programId: string;
  patientId: string;
  protocolDraftId?: string;
  protocolActionIds: string[];
  startDate: string;
  endDate: string;
  status: "prepared" | "active" | "completed" | "interrupted";
  targets: DietaryActionTarget[];
  versions: {
    schema: string;
    markerRegistry: string;
    aggregation: string;
    coveragePolicy: string;
    reliabilityPolicy: string;
    questionnaireProjection: string;
    actionEvaluation: string;
  };
};

type CaptureMode =
  | "quick"
  | "favorite"
  | "copy"
  | "voice_confirmed"
  | "photo_confirmed"
  | "recall_simplified";

type FoodDiaryEntry = {
  entryId: string;
  programId: string;
  date: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack" | "other";
  captureMode: CaptureMode;
  markers: Array<{
    markerCode: FoodMarkerCode;
    portion?: "small" | "usual" | "large" | "presence_only";
    details?: string[];
  }>;
  confirmedByPatient: boolean;
  clientMutationId: string;
  clientUpdatedAt: string;
  serverVersion?: number;
};

type FoodDiaryCoverage = {
  expectedDays: number;
  daysWithData: number;
  closedDays: number;
  representativeDays: number;
  recalledDays: number;
  partialDays: number;
  missingDays: number;
  coverageRatio: number;
  level: "insufficient" | "limited" | "usable" | "good";
};

type DataReliability = {
  level: "low" | "moderate" | "good";
  reasons: string[];
  recallRatio: number;
  atypicalRatio: number;
  partialRatio: number;
};

type QuestionnaireProjectionStatus =
  | "estimable"
  | "proxy_only"
  | "not_inferable"
  | "insufficient_data";

type DietaryTrajectoryFinding = {
  findingId: string;
  programId: string;
  period: { start: string; end: string };
  coverage: FoodDiaryCoverage;
  reliability: DataReliability;
  markerMetrics: MarkerMetric[];
  axes: FoodAxisFinding[];
  actionOutcomes: DietaryActionOutcome[];
  questionnaireProjections: QuestionnaireProjection[];
  discordances: ClinicalDiscordance[];
  limitations: string[];
  sourceRefs: SourceRef[];
  versions: FoodDiaryProgram["versions"];
  inputHash: string;
};
```

## 9. Neuf axes alimentaires V1

```ts
type FoodAxisCode =
  | "plant_density"
  | "carbohydrate_quality"
  | "fat_quality"
  | "protein_quality"
  | "processing"
  | "meal_rhythm"
  | "culinary_quality"
  | "hydration"
  | "eating_context";
```

La diversité polyphénolique, la saisonnalité et la qualité des achats sont des métriques candidates, pas des axes V1 tant qu’elles ne sont pas validées.

## 10. Corpus clinique

```ts
type SourceDocument = {
  sourceId: string;
  driveFileId?: string;
  title: string;
  documentType: string;
  importance: "canonical" | "secondary";
  audience: Array<"practitioner" | "patient" | "physician" | "internal">;
  authorityClass: string;
  contentHash: string;
  sourceVersion: string;
  rightsStatus:
    | "to_verify"
    | "internal_only"
    | "runtime_allowed"
    | "restricted";
  lifecycleStatus:
    | "raw"
    | "reviewed"
    | "published"
    | "deprecated"
    | "quarantined";
  clinicalReviewStatus:
    | "not_reviewed"
    | "in_review"
    | "validated"
    | "rejected";
};

type SourceClaim = {
  claimId: string;
  sourceId: string;
  sourceVersion: string;
  pageStart?: number;
  pageEnd?: number;
  sectionPath: string[];
  normalizedClaim: string;
  claimType:
    | "definition"
    | "mechanism"
    | "threshold"
    | "indication"
    | "contraindication"
    | "interaction"
    | "documentary_dosage"
    | "monitoring"
    | "patient_message";
  authorityClass: string;
  population: string[];
  limitations: string[];
  validationStatus:
    | "draft"
    | "extracted"
    | "document_reviewed"
    | "clinically_validated"
    | "published"
    | "deprecated"
    | "quarantined";
};

type SourceConflict = {
  conflictId: string;
  claimIds: string[];
  conflictType:
    | "threshold"
    | "dose"
    | "indication"
    | "contraindication"
    | "terminology"
    | "version"
    | "scope";
  clinicalImpact: "low" | "moderate" | "high" | "blocking";
  status: "open" | "arbitrated" | "accepted_nuance" | "closed";
};

type CorpusBuildManifest = {
  corpusVersion: string;
  generatedAt: string;
  sourceManifestHash: string;
  compilerVersion: string;
  documentsIncluded: string[];
  claimsIncluded: string[];
  rulesIncluded: string[];
  unresolvedBlockingConflicts: number;
  validationStatus: "candidate" | "published" | "rejected" | "rolled_back";
};
```

## 11. Documents et validation

```ts
type ClinicalValidation = {
  validationId: string;
  actorId: string;
  actorRole: "practitioner";
  validatedAt: string;
  status: "validated" | "modified" | "rejected";
  comment?: string;
};

type DocumentInstance = {
  documentId: string;
  audience: "patient" | "practitioner" | "physician";
  snapshotId: string;
  decisionId?: string;
  protocolDraftId?: string;
  phaseReviewId?: string;
  corpusVersion?: string;
  promptVersion: string;
  modelVersion?: string;
  sourceObjectRefs: string[];
  status: "draft" | "validated" | "published" | "revoked";
};
```
