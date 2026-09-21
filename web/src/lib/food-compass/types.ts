export const C5_AXIS_CODE = 'equilibre_assiette' as const;
export const C5_DATASET_VERSION = 'ciqual-2025-v1' as const;
export const C5_MAPPING_VERSION = 'c5a-b1-mapping-v1' as const;
export const C5_SCORE_VERSION = 'c5a-b1-score-v1' as const;
export const C5_PRAL_VERSION = 'c5a-pral-remer-manz-v1' as const;
export const C5_PERCENTILE_VERSION = 'c5a-percentile-linear-v1' as const;
export const C5_INTRINSIC_PROFILE_VERSION = 'c5a-intrinsic-food-profile-v1' as const;
export const C5_CONTEXTUAL_READING_VERSION = 'c5b-contextual-food-reading-v1' as const;
export const C5_ACTION_REF_VERSION = 'c5-food-compass-action-ref-v1' as const;
export const C5_PATIENT_VIEW_VERSION = 'c5-patient-food-compass-view-v1' as const;
export const C5_RECOMMENDED_PLATE_REF_VERSION = 'c5-recommended-plate-ref-v1' as const;

export type CiqualValueStatus = 'exact' | 'trace' | 'below_limit' | 'missing';
export type CiqualConfidenceCode = 'A' | 'B' | 'C' | 'D';
export type CiqualUnit = 'g/100 g' | 'mg/100 g';

export type DirectNutrientCode =
  | '25000'
  | '31000'
  | '32000'
  | '34100'
  | '40302'
  | '40303'
  | '40304'
  | '41833'
  | '42053'
  | '42263'
  | '10004'
  | '10110';

export type PralMineralCode = '10120' | '10150' | '10190' | '10200';
export type ReferenceNutrientCode = DirectNutrientCode | PralMineralCode;
export type ScoredNutrientCode = Exclude<DirectNutrientCode, '31000' | '10110'>;

export type CiqualNutrientDatum = {
  datasetVersion: string;
  ciqualCode: string;
  nutrientCode: string;
  value: number | null;
  valueStatus: CiqualValueStatus;
  unit: CiqualUnit;
  sourceRef: string;
  sourceHash: string;
  confidenceCode?: CiqualConfidenceCode | null;
};

export type PercentileBounds = {
  p5: number;
  p95: number;
  exactCount: number;
};

export type FoodCompassDistribution = {
  datasetVersion: typeof C5_DATASET_VERSION;
  mappingVersion: typeof C5_MAPPING_VERSION;
  percentileVersion: typeof C5_PERCENTILE_VERSION;
  foodCount: number;
  sourceRef: string;
  sourceHash: string;
  nutrientBounds: Record<DirectNutrientCode, PercentileBounds>;
  pralBounds: PercentileBounds;
  inputHash: string;
};

export type IntrinsicProfileStatus = 'complete' | 'partial_data' | 'insufficient_data';

export type IntrinsicFoodComponent = {
  nutrientCode: DirectNutrientCode;
  label: string;
  value: number | null;
  valueStatus: CiqualValueStatus;
  unit: CiqualUnit;
  confidenceCode: CiqualConfidenceCode | null;
  evidenceLevel: 'B';
  role: 'required' | 'optional' | 'descriptive';
  direction: 'favorable' | 'limiting' | 'descriptive';
  effectiveWeightPct: number | null;
  normalized: number | null;
  alignment: number | null;
};

export type IntrinsicFoodProfile = {
  contractVersion: typeof C5_INTRINSIC_PROFILE_VERSION;
  axisCode: typeof C5_AXIS_CODE;
  foodRef: string;
  ciqualCode: string;
  foodLabel: string;
  datasetVersion: typeof C5_DATASET_VERSION;
  mappingVersion: typeof C5_MAPPING_VERSION;
  scoreVersion: typeof C5_SCORE_VERSION;
  pralVersion: typeof C5_PRAL_VERSION;
  percentileVersion: typeof C5_PERCENTILE_VERSION;
  sourceRef: string;
  sourceHash: string;
  distributionHash: string;
  status: IntrinsicProfileStatus;
  completenessPct: number;
  aggregateScore: number | null;
  components: IntrinsicFoodComponent[];
  pral: {
    status: 'available' | 'insufficient_data';
    valueMeqPer100g: number | null;
    normalized: number | null;
    alignment: number | null;
    effectiveWeightPct: 10;
    inputCodes: readonly ['25000', '10120', '10150', '10190', '10200'];
  };
  missingRequiredCodes: ScoredNutrientCode[];
  missingOptionalCodes: Array<ScoredNutrientCode | 'PRAL'>;
  availableComponentSetHash: string;
  limitations: string[];
  inputHash: string;
};

export type ContextualFoodReading = {
  contractVersion: typeof C5_CONTEXTUAL_READING_VERSION;
  status: 'practitioner_review_required' | 'insufficient_data';
  foodRef: string;
  intrinsicProfileHash: string;
  intrinsicProfileStatus: IntrinsicProfileStatus;
  selectedPriority: { priorityId: string; label: string };
  activeProtocol: { protocolDraftId: string; inputHash: string };
  automaticRecommendation: false;
  patientDiffusionAllowed: false;
  limitations: string[];
  inputHash: string;
};

export type FoodCompassActionRef = {
  contractVersion: typeof C5_ACTION_REF_VERSION;
  foodRef: string;
  axisCode: typeof C5_AXIS_CODE;
  datasetVersion: typeof C5_DATASET_VERSION;
  mappingVersion: typeof C5_MAPPING_VERSION;
  scoreVersion: typeof C5_SCORE_VERSION;
  selectedPriorityId: string;
  sourceProtocolDraftId: string;
  sourceProtocolInputHash: string;
  intrinsicProfileHash: string;
  contextualReadingHash: string;
  sourceHash: string;
  refHash: string;
};

export type PatientFoodCompassView = {
  contractVersion: typeof C5_PATIENT_VIEW_VERSION;
  foodRef: string;
  foodLabel: string;
  qualitativeSummary: string;
  reasons: string[];
  sourceLabel: string;
  limitations: string[];
  alternative: string | null;
  protocolInputHash: string;
  actionRefHash: string;
  inputHash: string;
};

/**
 * LE DEGRÉ D'UN REPLI — « proche » n'est pas « en dernier recours », et le
 * mécanisme doit savoir le dire ([[D-241]]).
 */
export type DegreDeRepli = 'proche' | 'acceptable' | 'dernier_recours';

/**
 * UNE RELATION DE REPLI, RÉDUITE À CE QUI LA REND ORIENTÉE.
 *
 * Ce type vit ici, et non dans la table clinique, pour une raison de
 * dépendances : `lib/clinical/replisAssietteV1.ts` importe `plates.ts`, donc
 * `plates.ts` ne peut pas importer la table en retour. Le vocabulaire commun
 * descend dans le module qui n'importe rien — `types.ts` — et les deux côtés
 * s'y adossent. La table ÉTEND ce type avec ce qu'elle seule porte : l'identité
 * de ligne, l'indication visée, le raccourci assumé et le statut.
 */
export type RepliAssietteDeclare = {
  /** L'assiette PRESCRITE qu'on ne peut pas suivre. */
  depuis: string;
  /** Ce vers quoi elle se replie. L'inverse n'est jamais vrai par symétrie. */
  vers: string;
  /**
   * POUR QUELLE INDICATION ce repli vaut — l'`id` d'une ligne d'indication.
   *
   * ELLE EST DANS LE TYPE PARTAGÉ, ET PAS SEULEMENT DANS LA TABLE — constat de
   * revue, et il visait une négligence réelle : la première rédaction faisait
   * de `indication` un champ OBLIGATOIRE de la ligne, puis le laissait tomber
   * partout en aval. Deux replis de même direction et de conditions
   * différentes devenaient alors indiscernables, et la décision choisissait
   * silencieusement le premier. C'est exactement la classe de défaut que ce lot
   * existe pour fermer — corrigée sur la direction, reproduite sur la
   * condition.
   */
  indication: string;
  degre: DegreDeRepli;
};

export type RecommendedPlateRef = {
  contractVersion: typeof C5_RECOMMENDED_PLATE_REF_VERSION;
  plateCode: string;
  catalogVersion: string;
  contentHash: string;
  refHash: string;
};
