import { canonicalSha256 } from '@/lib/clinical-engine/canonical';
import {
  C5_AXIS_CODE,
  C5_DATASET_VERSION,
  C5_INTRINSIC_PROFILE_VERSION,
  C5_MAPPING_VERSION,
  C5_PERCENTILE_VERSION,
  C5_PRAL_VERSION,
  C5_SCORE_VERSION,
  type CiqualNutrientDatum,
  type DirectNutrientCode,
  type FoodCompassDistribution,
  type IntrinsicFoodComponent,
  type IntrinsicFoodProfile,
  type ScoredNutrientCode,
} from './types';
import {
  EXPECTED_UNITS,
  NUTRIENT_MAPPINGS,
  PRAL_INPUT_CODES,
  REFERENCE_NUTRIENT_CODES,
} from './mapping';
import { assertFoodCompassDistribution, calculatePral100g } from './distribution';

function nonEmpty(value: string, field: string): string {
  if (!value.trim()) throw new TypeError(`${field} est requis.`);
  return value.trim();
}

function round6(value: number): number {
  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function normalize(value: number, p5: number, p95: number): number {
  if (!(p95 > p5)) throw new TypeError('p95 doit dépasser p5.');
  return clamp01((value - p5) / (p95 - p5));
}

function isExact(row: CiqualNutrientDatum | undefined): row is CiqualNutrientDatum & { value: number } {
  return Boolean(row && row.valueStatus === 'exact' && row.value !== null && Number.isFinite(row.value));
}

function validateDistribution(distribution: FoodCompassDistribution): void {
  assertFoodCompassDistribution(distribution);
}

export function buildIntrinsicFoodProfile(input: {
  ciqualCode: string;
  foodLabel: string;
  rows: readonly CiqualNutrientDatum[];
  distribution: FoodCompassDistribution;
}): IntrinsicFoodProfile {
  validateDistribution(input.distribution);
  const ciqualCode = nonEmpty(input.ciqualCode, 'ciqualCode');
  const foodLabel = nonEmpty(input.foodLabel, 'foodLabel');
  const byCode = new Map<string, CiqualNutrientDatum>();
  for (const row of input.rows) {
    if (row.ciqualCode !== ciqualCode) throw new TypeError('Une teneur appartient à un autre aliment.');
    if (row.datasetVersion !== C5_DATASET_VERSION) throw new TypeError('Version Ciqual incompatible.');
    if (row.sourceHash !== input.distribution.sourceHash || row.sourceRef !== input.distribution.sourceRef) {
      throw new TypeError('La provenance de l’aliment ne correspond pas à la distribution.');
    }
    if (!(REFERENCE_NUTRIENT_CODES as readonly string[]).includes(row.nutrientCode)) {
      throw new TypeError(`Constituant hors contrat C5 : ${row.nutrientCode}.`);
    }
    const expectedUnit = EXPECTED_UNITS[row.nutrientCode as keyof typeof EXPECTED_UNITS];
    if (row.unit !== expectedUnit) throw new TypeError(`Unité incompatible pour ${row.nutrientCode}.`);
    if (row.valueStatus === 'exact') {
      if (row.value === null || !Number.isFinite(row.value) || row.value < 0) {
        throw new TypeError(`Valeur exacte invalide pour ${row.nutrientCode}.`);
      }
    } else if (row.value !== null) {
      throw new TypeError(`Aucune valeur ne doit être imputée pour ${row.nutrientCode}.`);
    }
    if (byCode.has(row.nutrientCode)) throw new TypeError(`Constituant dupliqué : ${row.nutrientCode}.`);
    byCode.set(row.nutrientCode, row);
  }

  const components: IntrinsicFoodComponent[] = NUTRIENT_MAPPINGS.map(mapping => {
    const row = byCode.get(mapping.nutrientCode);
    const exact = isExact(row);
    const rawNormalized = exact
      ? normalize(
        row.value,
        input.distribution.nutrientBounds[mapping.nutrientCode].p5,
        input.distribution.nutrientBounds[mapping.nutrientCode].p95,
      )
      : null;
    const rawAlignment = rawNormalized === null || mapping.direction === 'descriptive'
      ? null
      : mapping.direction === 'favorable' ? rawNormalized : 1 - rawNormalized;
    return {
      nutrientCode: mapping.nutrientCode,
      label: mapping.label,
      value: exact ? row.value : null,
      valueStatus: row?.valueStatus ?? 'missing',
      unit: mapping.unit,
      confidenceCode: row?.confidenceCode ?? null,
      evidenceLevel: 'B' as const,
      role: mapping.role,
      direction: mapping.direction,
      effectiveWeightPct: mapping.effectiveWeightPct,
      normalized: rawNormalized === null ? null : round6(rawNormalized),
      alignment: rawAlignment === null ? null : round6(rawAlignment),
    };
  });

  const pralRows = PRAL_INPUT_CODES.map(code => byCode.get(code));
  const pralAvailable = pralRows.every(isExact);
  const rawPral = pralAvailable
    ? calculatePral100g({
      proteinG: pralRows[0].value,
      magnesiumMg: pralRows[1].value,
      phosphorusMg: pralRows[2].value,
      potassiumMg: pralRows[3].value,
      calciumMg: pralRows[4].value,
    })
    : null;
  const rawPralNormalized = rawPral === null
    ? null
    : normalize(rawPral, input.distribution.pralBounds.p5, input.distribution.pralBounds.p95);
  const rawPralAlignment = rawPralNormalized === null ? null : 1 - rawPralNormalized;

  const scored = components.filter(
    (component): component is IntrinsicFoodComponent & { nutrientCode: ScoredNutrientCode; effectiveWeightPct: number } =>
      component.effectiveWeightPct !== null,
  );
  const rawAlignmentByCode = new Map<ScoredNutrientCode, number | null>();
  for (const mapping of NUTRIENT_MAPPINGS) {
    if (mapping.effectiveWeightPct === null) continue;
    const component = scored.find(item => item.nutrientCode === mapping.nutrientCode);
    if (!component || component.value === null) {
      rawAlignmentByCode.set(mapping.nutrientCode as ScoredNutrientCode, null);
      continue;
    }
    const rawNormalized = normalize(
      component.value,
      input.distribution.nutrientBounds[mapping.nutrientCode].p5,
      input.distribution.nutrientBounds[mapping.nutrientCode].p95,
    );
    rawAlignmentByCode.set(
      mapping.nutrientCode as ScoredNutrientCode,
      mapping.direction === 'favorable' ? rawNormalized : 1 - rawNormalized,
    );
  }
  const missingRequiredCodes = scored
    .filter(component => component.role === 'required' && rawAlignmentByCode.get(component.nutrientCode) === null)
    .map(component => component.nutrientCode);
  const missingOptionalCodes: Array<ScoredNutrientCode | 'PRAL'> = scored
    .filter(component => component.role === 'optional' && rawAlignmentByCode.get(component.nutrientCode) === null)
    .map(component => component.nutrientCode);
  if (!pralAvailable) missingOptionalCodes.push('PRAL');

  const availableScored = scored
    .map(component => ({ component, alignment: rawAlignmentByCode.get(component.nutrientCode) ?? null }))
    .filter((item): item is typeof item & { alignment: number } => item.alignment !== null);
  const availableNutrientWeight = availableScored.reduce(
    (sum, item) => sum + item.component.effectiveWeightPct,
    0,
  );
  const completenessPct = round6(availableNutrientWeight + (pralAvailable ? 10 : 0));
  let aggregateScore: number | null = null;
  if (missingRequiredCodes.length === 0 && availableNutrientWeight > 0) {
    const nutrientEnvelope = pralAvailable ? 90 : 100;
    const nutrientScore = availableScored.reduce(
      (sum, item) => sum + (item.alignment * item.component.effectiveWeightPct / availableNutrientWeight * nutrientEnvelope),
      0,
    );
    aggregateScore = round6(nutrientScore + (pralAvailable ? (rawPralAlignment as number) * 10 : 0));
  }

  const status = missingRequiredCodes.length > 0
    ? 'insufficient_data' as const
    : completenessPct === 100 ? 'complete' as const : 'partial_data' as const;
  const availableComponentCodes = [
    ...availableScored.map(item => item.component.nutrientCode),
    ...(pralAvailable ? ['PRAL' as const] : []),
  ].sort();
  const availableComponentSetHash = canonicalSha256({
    mappingVersion: C5_MAPPING_VERSION,
    scoreVersion: C5_SCORE_VERSION,
    availableComponentCodes,
  });
  const limitations = [
    ...(status === 'partial_data' ? ['Profil partiel : aucune comparaison avec un ensemble de composantes différent.'] : []),
    ...(status === 'insufficient_data' ? ['Noyau obligatoire incomplet : aucun agrégat calculé.'] : []),
    ...(components.some(component => component.confidenceCode === null)
      ? ['Code de confiance Ciqual non disponible dans le référentiel runtime.']
      : []),
  ];
  const withoutHash = {
    contractVersion: C5_INTRINSIC_PROFILE_VERSION,
    axisCode: C5_AXIS_CODE,
    foodRef: `${C5_DATASET_VERSION}:${ciqualCode}`,
    ciqualCode,
    foodLabel,
    datasetVersion: C5_DATASET_VERSION,
    mappingVersion: C5_MAPPING_VERSION,
    scoreVersion: C5_SCORE_VERSION,
    pralVersion: C5_PRAL_VERSION,
    percentileVersion: C5_PERCENTILE_VERSION,
    sourceRef: input.distribution.sourceRef,
    sourceHash: input.distribution.sourceHash,
    distributionHash: input.distribution.inputHash,
    status,
    completenessPct,
    aggregateScore,
    components,
    pral: {
      status: pralAvailable ? 'available' as const : 'insufficient_data' as const,
      valueMeqPer100g: rawPral === null ? null : round6(rawPral),
      normalized: rawPralNormalized === null ? null : round6(rawPralNormalized),
      alignment: rawPralAlignment === null ? null : round6(rawPralAlignment),
      effectiveWeightPct: 10 as const,
      inputCodes: PRAL_INPUT_CODES,
    },
    missingRequiredCodes,
    missingOptionalCodes,
    availableComponentSetHash,
    limitations,
  };
  return { ...withoutHash, inputHash: canonicalSha256(withoutHash) };
}

export function areIntrinsicProfilesComparable(
  left: IntrinsicFoodProfile,
  right: IntrinsicFoodProfile,
): boolean {
  return left.status !== 'insufficient_data'
    && right.status !== 'insufficient_data'
    && left.datasetVersion === right.datasetVersion
    && left.mappingVersion === right.mappingVersion
    && left.scoreVersion === right.scoreVersion
    && left.pralVersion === right.pralVersion
    && left.percentileVersion === right.percentileVersion
    && left.distributionHash === right.distributionHash
    && left.availableComponentSetHash === right.availableComponentSetHash;
}
