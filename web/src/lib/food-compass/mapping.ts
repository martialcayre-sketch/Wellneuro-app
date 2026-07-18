import type {
  DirectNutrientCode,
  PralMineralCode,
  ReferenceNutrientCode,
  ScoredNutrientCode,
} from './types';

export type NutrientMapping = {
  nutrientCode: DirectNutrientCode;
  label: string;
  unit: 'g/100 g' | 'mg/100 g';
  role: 'required' | 'optional' | 'descriptive';
  direction: 'favorable' | 'limiting' | 'descriptive';
  effectiveWeightPct: number | null;
};

export const NUTRIENT_MAPPINGS: readonly NutrientMapping[] = [
  { nutrientCode: '25000', label: 'Protéines', unit: 'g/100 g', role: 'required', direction: 'favorable', effectiveWeightPct: 18 },
  { nutrientCode: '31000', label: 'Glucides', unit: 'g/100 g', role: 'descriptive', direction: 'descriptive', effectiveWeightPct: null },
  { nutrientCode: '32000', label: 'Sucres', unit: 'g/100 g', role: 'optional', direction: 'limiting', effectiveWeightPct: 9 },
  { nutrientCode: '34100', label: 'Fibres', unit: 'g/100 g', role: 'required', direction: 'favorable', effectiveWeightPct: 13.5 },
  { nutrientCode: '40302', label: 'AG saturés', unit: 'g/100 g', role: 'required', direction: 'limiting', effectiveWeightPct: 9 },
  { nutrientCode: '40303', label: 'AG monoinsaturés', unit: 'g/100 g', role: 'required', direction: 'favorable', effectiveWeightPct: 4.5 },
  { nutrientCode: '40304', label: 'AG polyinsaturés', unit: 'g/100 g', role: 'required', direction: 'favorable', effectiveWeightPct: 4.5 },
  { nutrientCode: '41833', label: 'ALA', unit: 'g/100 g', role: 'optional', direction: 'favorable', effectiveWeightPct: 6.3 },
  { nutrientCode: '42053', label: 'EPA', unit: 'g/100 g', role: 'optional', direction: 'favorable', effectiveWeightPct: 5.4 },
  { nutrientCode: '42263', label: 'DHA', unit: 'g/100 g', role: 'optional', direction: 'favorable', effectiveWeightPct: 6.3 },
  { nutrientCode: '10004', label: 'Sel', unit: 'g/100 g', role: 'optional', direction: 'limiting', effectiveWeightPct: 13.5 },
  { nutrientCode: '10110', label: 'Sodium', unit: 'mg/100 g', role: 'descriptive', direction: 'descriptive', effectiveWeightPct: null },
] as const;

export const DIRECT_NUTRIENT_CODES = NUTRIENT_MAPPINGS.map(item => item.nutrientCode);
export const SCORED_NUTRIENT_CODES = NUTRIENT_MAPPINGS
  .filter((item): item is NutrientMapping & { nutrientCode: ScoredNutrientCode } => item.effectiveWeightPct !== null)
  .map(item => item.nutrientCode);
export const REQUIRED_NUTRIENT_CODES = NUTRIENT_MAPPINGS
  .filter((item): item is NutrientMapping & { nutrientCode: ScoredNutrientCode } => item.role === 'required')
  .map(item => item.nutrientCode);
export const OPTIONAL_NUTRIENT_CODES = NUTRIENT_MAPPINGS
  .filter((item): item is NutrientMapping & { nutrientCode: ScoredNutrientCode } => item.role === 'optional')
  .map(item => item.nutrientCode);

export const PRAL_INPUT_CODES = ['25000', '10120', '10150', '10190', '10200'] as const;
export const PRAL_MINERAL_CODES: readonly PralMineralCode[] = ['10120', '10150', '10190', '10200'];
export const REFERENCE_NUTRIENT_CODES: readonly ReferenceNutrientCode[] = [
  ...DIRECT_NUTRIENT_CODES,
  ...PRAL_MINERAL_CODES,
];

export const EXPECTED_UNITS: Readonly<Record<ReferenceNutrientCode, 'g/100 g' | 'mg/100 g'>> = {
  '25000': 'g/100 g',
  '31000': 'g/100 g',
  '32000': 'g/100 g',
  '34100': 'g/100 g',
  '40302': 'g/100 g',
  '40303': 'g/100 g',
  '40304': 'g/100 g',
  '41833': 'g/100 g',
  '42053': 'g/100 g',
  '42263': 'g/100 g',
  '10004': 'g/100 g',
  '10110': 'mg/100 g',
  '10120': 'mg/100 g',
  '10150': 'mg/100 g',
  '10190': 'mg/100 g',
  '10200': 'mg/100 g',
};

const nutritionalWeight = NUTRIENT_MAPPINGS.reduce(
  (sum, item) => sum + (item.effectiveWeightPct ?? 0),
  0,
);
if (nutritionalWeight !== 90) {
  throw new Error(`Pondération nutritionnelle C5 incohérente : ${nutritionalWeight}.`);
}
