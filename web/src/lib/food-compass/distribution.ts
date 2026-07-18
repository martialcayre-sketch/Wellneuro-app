import { canonicalSha256 } from '@/lib/clinical-engine/canonical';
import {
  C5_DATASET_VERSION,
  C5_MAPPING_VERSION,
  C5_PERCENTILE_VERSION,
  type CiqualNutrientDatum,
  type DirectNutrientCode,
  type FoodCompassDistribution,
  type PercentileBounds,
  type ReferenceNutrientCode,
} from './types';
import {
  DIRECT_NUTRIENT_CODES,
  EXPECTED_UNITS,
  PRAL_INPUT_CODES,
  REFERENCE_NUTRIENT_CODES,
} from './mapping';

export const C5_OFFICIAL_FOOD_COUNT = 3_484;
export const C5_OFFICIAL_SOURCE_REF = 'doi:10.57745/RDMHWY#compo_2025_11_03.xml';
export const C5_OFFICIAL_SOURCE_HASH = '2da725585946434df320d8041631998b';

const SIGNED_NUTRIENT_BOUNDS: Readonly<Record<DirectNutrientCode, PercentileBounds>> = {
  '25000': { p5: 0.000025, p95: 26, exactCount: 3451 },
  '31000': { p5: 0, p95: 69.645, exactCount: 3272 },
  '32000': { p5: 0, p95: 37.625, exactCount: 2996 },
  '34100': { p5: 0, p95: 9, exactCount: 3239 },
  '40302': { p5: 0, p95: 17.9, exactCount: 3093 },
  '40303': { p5: 0, p95: 15.1, exactCount: 2567 },
  '40304': { p5: 0, p95: 6.2605, exactCount: 2554 },
  '41833': { p5: 0, p95: 0.6935, exactCount: 1892 },
  '42053': { p5: 0, p95: 0.29, exactCount: 1636 },
  '42263': { p5: 0, p95: 0.48, exactCount: 1560 },
  '10004': { p5: 0.0042, p95: 2.33, exactCount: 3141 },
  '10110': { p5: 1.74, p95: 945.6, exactCount: 2929 },
};
const SIGNED_PRAL_BOUNDS: PercentileBounds = { p5: -8.70089, p95: 14.69258, exactCount: 2347 };

function round6(value: number): number {
  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
}

function exactValue(row: CiqualNutrientDatum | undefined): number | null {
  if (!row || row.valueStatus !== 'exact' || row.value === null || !Number.isFinite(row.value)) {
    return null;
  }
  if (row.value < 0) throw new TypeError('Une teneur Ciqual exacte ne peut pas être négative.');
  return row.value;
}

export function percentileLinear(values: readonly number[], percentile: number): number {
  if (percentile < 0 || percentile > 1 || !Number.isFinite(percentile)) {
    throw new TypeError('Le percentile doit être compris entre 0 et 1.');
  }
  if (values.length === 0) throw new TypeError('Une distribution vide ne peut pas être normalisée.');
  const sorted = [...values].sort((left, right) => left - right);
  const rank = (sorted.length - 1) * percentile;
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  if (lower === upper) return sorted[lower];
  const fraction = rank - lower;
  return sorted[lower] + (sorted[upper] - sorted[lower]) * fraction;
}

function boundsFrom(values: readonly number[], label: string): PercentileBounds {
  const p5 = round6(percentileLinear(values, 0.05));
  const p95 = round6(percentileLinear(values, 0.95));
  if (!(p95 > p5)) throw new TypeError(`Bornes non normalisables pour ${label} : p95 doit dépasser p5.`);
  return { p5, p95, exactCount: values.length };
}

export function calculatePral100g(input: {
  proteinG: number;
  phosphorusMg: number;
  potassiumMg: number;
  magnesiumMg: number;
  calciumMg: number;
}): number {
  const values = Object.values(input);
  if (values.some(value => !Number.isFinite(value) || value < 0)) {
    throw new TypeError('Les cinq intrants PRAL doivent être des teneurs exactes non négatives.');
  }
  return (0.49 * input.proteinG)
    + (0.037 * input.phosphorusMg)
    - (0.021 * input.potassiumMg)
    - (0.026 * input.magnesiumMg)
    - (0.013 * input.calciumMg);
}

function pralFromFood(rows: ReadonlyMap<string, CiqualNutrientDatum>): number | null {
  const proteinG = exactValue(rows.get('25000'));
  const magnesiumMg = exactValue(rows.get('10120'));
  const phosphorusMg = exactValue(rows.get('10150'));
  const potassiumMg = exactValue(rows.get('10190'));
  const calciumMg = exactValue(rows.get('10200'));
  if ([proteinG, magnesiumMg, phosphorusMg, potassiumMg, calciumMg].some(value => value === null)) {
    return null;
  }
  return calculatePral100g({
    proteinG: proteinG as number,
    phosphorusMg: phosphorusMg as number,
    potassiumMg: potassiumMg as number,
    magnesiumMg: magnesiumMg as number,
    calciumMg: calciumMg as number,
  });
}

function sealFoodCompassDistribution(input: Omit<FoodCompassDistribution, 'inputHash'>): FoodCompassDistribution {
  if (input.datasetVersion !== C5_DATASET_VERSION
    || input.mappingVersion !== C5_MAPPING_VERSION
    || input.percentileVersion !== C5_PERCENTILE_VERSION) {
    throw new TypeError('Versions de distribution C5 incompatibles.');
  }
  for (const code of DIRECT_NUTRIENT_CODES) {
    const bounds = input.nutrientBounds[code];
    if (!bounds || !Number.isFinite(bounds.p5) || !Number.isFinite(bounds.p95) || !(bounds.p95 > bounds.p5)) {
      throw new TypeError(`Bornes invalides pour ${code}.`);
    }
  }
  if (!(input.pralBounds.p95 > input.pralBounds.p5)) throw new TypeError('Bornes PRAL invalides.');
  if (input.foodCount !== C5_OFFICIAL_FOOD_COUNT
    || input.sourceRef !== C5_OFFICIAL_SOURCE_REF
    || input.sourceHash !== C5_OFFICIAL_SOURCE_HASH
    || canonicalSha256(input.nutrientBounds) !== canonicalSha256(SIGNED_NUTRIENT_BOUNDS)
    || canonicalSha256(input.pralBounds) !== canonicalSha256(SIGNED_PRAL_BOUNDS)) {
    throw new TypeError('Distribution C5 V1 différente de la référence clinique signée.');
  }
  return { ...input, inputHash: canonicalSha256(input) };
}

export function getSignedFoodCompassDistribution(): FoodCompassDistribution {
  return sealFoodCompassDistribution({
    datasetVersion: C5_DATASET_VERSION,
    mappingVersion: C5_MAPPING_VERSION,
    percentileVersion: C5_PERCENTILE_VERSION,
    foodCount: C5_OFFICIAL_FOOD_COUNT,
    sourceRef: C5_OFFICIAL_SOURCE_REF,
    sourceHash: C5_OFFICIAL_SOURCE_HASH,
    nutrientBounds: Object.fromEntries(
      Object.entries(SIGNED_NUTRIENT_BOUNDS).map(([code, bounds]) => [code, { ...bounds }]),
    ) as Record<DirectNutrientCode, PercentileBounds>,
    pralBounds: { ...SIGNED_PRAL_BOUNDS },
  });
}

export function assertFoodCompassDistribution(distribution: FoodCompassDistribution): void {
  const sealed = sealFoodCompassDistribution({
    datasetVersion: distribution.datasetVersion,
    mappingVersion: distribution.mappingVersion,
    percentileVersion: distribution.percentileVersion,
    foodCount: distribution.foodCount,
    sourceRef: distribution.sourceRef,
    sourceHash: distribution.sourceHash,
    nutrientBounds: distribution.nutrientBounds,
    pralBounds: distribution.pralBounds,
  });
  if (sealed.inputHash !== distribution.inputHash) {
    throw new TypeError('Empreinte de distribution C5 incohérente.');
  }
}

export function buildFoodCompassDistribution(
  rows: readonly CiqualNutrientDatum[],
): FoodCompassDistribution {
  const foods = new Map<string, Map<string, CiqualNutrientDatum>>();
  const sourceHashes = new Set<string>();
  const sourceRefs = new Set<string>();
  for (const row of rows) {
    if (row.datasetVersion !== C5_DATASET_VERSION) throw new TypeError('Version Ciqual incompatible.');
    if (!(REFERENCE_NUTRIENT_CODES as readonly string[]).includes(row.nutrientCode)) {
      throw new TypeError(`Constituant hors contrat C5 : ${row.nutrientCode}.`);
    }
    const code = row.nutrientCode as ReferenceNutrientCode;
    if (row.unit !== EXPECTED_UNITS[code]) throw new TypeError(`Unité incompatible pour ${code}.`);
    if (row.valueStatus === 'exact') {
      if (row.value === null || !Number.isFinite(row.value) || row.value < 0) {
        throw new TypeError(`Valeur exacte invalide pour ${code}.`);
      }
    } else if (row.value !== null) {
      throw new TypeError(`La valeur ${code} doit rester nulle hors statut exact.`);
    }
    const food = foods.get(row.ciqualCode) ?? new Map<string, CiqualNutrientDatum>();
    if (food.has(code)) throw new TypeError(`Clé Ciqual dupliquée : ${row.ciqualCode}/${code}.`);
    food.set(code, row);
    foods.set(row.ciqualCode, food);
    sourceHashes.add(row.sourceHash);
    sourceRefs.add(row.sourceRef);
  }
  if (foods.size !== C5_OFFICIAL_FOOD_COUNT) {
    throw new TypeError(`Distribution incomplète : ${foods.size}/${C5_OFFICIAL_FOOD_COUNT} aliments.`);
  }
  if (sourceHashes.size !== 1 || sourceRefs.size !== 1) {
    throw new TypeError('La distribution doit provenir d’une source Ciqual unique.');
  }
  for (const [foodCode, foodRows] of foods) {
    if (foodRows.size !== REFERENCE_NUTRIENT_CODES.length) {
      throw new TypeError(`Distribution incomplète pour l’aliment ${foodCode}.`);
    }
  }

  const nutrientBounds = {} as Record<DirectNutrientCode, PercentileBounds>;
  for (const code of DIRECT_NUTRIENT_CODES) {
    const values = [...foods.values()]
      .map(food => exactValue(food.get(code)))
      .filter((value): value is number => value !== null);
    nutrientBounds[code] = boundsFrom(values, code);
  }
  const pralValues = [...foods.values()]
    .map(pralFromFood)
    .filter((value): value is number => value !== null);
  const pralBounds = boundsFrom(pralValues, 'PRAL');

  return sealFoodCompassDistribution({
    datasetVersion: C5_DATASET_VERSION,
    mappingVersion: C5_MAPPING_VERSION,
    percentileVersion: C5_PERCENTILE_VERSION,
    foodCount: foods.size,
    sourceRef: [...sourceRefs][0],
    sourceHash: [...sourceHashes][0],
    nutrientBounds,
    pralBounds,
  });
}

export function calculatePlatePral(
  portions: ReadonlyArray<{ pral100g: number | null; grams: number }>,
): {
  status: 'available'; pralTotalMeq: number; pralDensityMeqPer100g: number;
} | {
  status: 'insufficient_data'; pralTotalMeq: null; pralDensityMeqPer100g: null;
} {
  if (portions.length === 0
    || portions.some(portion => portion.pral100g === null
      || !Number.isFinite(portion.pral100g)
      || !Number.isFinite(portion.grams)
      || portion.grams <= 0)) {
    return { status: 'insufficient_data', pralTotalMeq: null, pralDensityMeqPer100g: null };
  }
  const totalGrams = portions.reduce((sum, portion) => sum + portion.grams, 0);
  if (!Number.isFinite(totalGrams) || totalGrams <= 0) {
    return { status: 'insufficient_data', pralTotalMeq: null, pralDensityMeqPer100g: null };
  }
  const pralTotalMeq = portions.reduce(
    (sum, portion) => sum + ((portion.pral100g as number) * portion.grams / 100),
    0,
  );
  return {
    status: 'available',
    pralTotalMeq: round6(pralTotalMeq),
    pralDensityMeqPer100g: round6(pralTotalMeq / totalGrams * 100),
  };
}

export const PRAL_REQUIRED_INPUT_CODES = PRAL_INPUT_CODES;
