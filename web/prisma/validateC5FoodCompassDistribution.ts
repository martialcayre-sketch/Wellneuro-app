/**
 * Preuve reproductible C5 LOT-03, sans base ni écriture : reconstruit la
 * distribution signée et les douze fixtures praticien depuis les XML officiels.
 */
import { buildCiqualImport } from './ciqualImport';
import {
  buildFoodCompassDistribution,
  buildIntrinsicFoodProfile,
  type CiqualNutrientDatum,
  type IntrinsicProfileStatus,
} from '@/lib/food-compass';

const SIGNED_FIXTURES: ReadonlyArray<{
  ciqualCode: string;
  label: string;
  status: IntrinsicProfileStatus;
  completenessPct: number;
  pral: number | null;
  aggregateScore: number;
}> = [
  { ciqualCode: '26034', label: 'Sardine', status: 'complete', completenessPct: 100, pral: 9.681, aggregateScore: 61.734453 },
  { ciqualCode: '26051', label: 'Maquereau', status: 'partial_data', completenessPct: 91, pral: 7.95664, aggregateScore: 57.667221 },
  { ciqualCode: '17270', label: "Huile d'olive", status: 'partial_data', completenessPct: 64.8, pral: null, aggregateScore: 39.25221 },
  { ciqualCode: '17130', label: 'Huile de colza', status: 'partial_data', completenessPct: 76.5, pral: null, aggregateScore: 38.757805 },
  { ciqualCode: '20360', label: 'Lentilles', status: 'partial_data', completenessPct: 88.3, pral: 4.9247, aggregateScore: 63.335628 },
  { ciqualCode: '20507', label: 'Pois chiches', status: 'partial_data', completenessPct: 88.3, pral: 3.6019, aggregateScore: 63.627915 },
  { ciqualCode: '15005', label: 'Noix', status: 'partial_data', completenessPct: 74.8, pral: 6.192, aggregateScore: 70.715749 },
  { ciqualCode: '32140', label: "Flocons d'avoine", status: 'complete', completenessPct: 100, pral: 8.72, aggregateScore: 57.685279 },
  { ciqualCode: '7110', label: 'Pain complet', status: 'partial_data', completenessPct: 88.3, pral: 2.7536, aggregateScore: 53.284213 },
  { ciqualCode: '20351', label: 'Brocoli', status: 'partial_data', completenessPct: 88.3, pral: -1.8959, aggregateScore: 51.13505 },
  { ciqualCode: '20027', label: 'Épinards', status: 'partial_data', completenessPct: 84.7, pral: -8.5024, aggregateScore: 44.158973 },
  { ciqualCode: '13028', label: 'Myrtille', status: 'partial_data', completenessPct: 93.7, pral: -0.9807, aggregateScore: 42.643487 },
];

function argumentValue(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value || value.startsWith('--')) throw new Error(`${name} est requis`);
  return value;
}

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) throw new Error(`${label}: ${String(actual)} au lieu de ${String(expected)}`);
}

async function main(): Promise<void> {
  const { rows } = await buildCiqualImport(
    argumentValue('--source'),
    argumentValue('--const-source'),
  );
  const engineRows: CiqualNutrientDatum[] = rows.map(row => ({
    datasetVersion: row.datasetVersion,
    ciqualCode: row.ciqualCode,
    nutrientCode: row.nutrientCode,
    value: row.value === null ? null : Number(row.value),
    valueStatus: row.valueStatus,
    unit: row.unit,
    sourceRef: row.sourceRef,
    sourceHash: row.sourceHash,
  }));
  const distribution = buildFoodCompassDistribution(engineRows);
  for (const expected of SIGNED_FIXTURES) {
    const profile = buildIntrinsicFoodProfile({
      ciqualCode: expected.ciqualCode,
      foodLabel: expected.label,
      rows: engineRows.filter(row => row.ciqualCode === expected.ciqualCode),
      distribution,
    });
    assertEqual(profile.status, expected.status, `${expected.ciqualCode}/status`);
    assertEqual(profile.completenessPct, expected.completenessPct, `${expected.ciqualCode}/complétude`);
    assertEqual(profile.pral.valueMeqPer100g, expected.pral, `${expected.ciqualCode}/PRAL`);
    assertEqual(profile.aggregateScore, expected.aggregateScore, `${expected.ciqualCode}/agrégat`);
  }
  const complete = SIGNED_FIXTURES.filter(fixture => fixture.status === 'complete').length;
  console.log(JSON.stringify({
    datasetVersion: distribution.datasetVersion,
    foods: distribution.foodCount,
    fixtures: SIGNED_FIXTURES.length,
    complete,
    partial: SIGNED_FIXTURES.length - complete,
    distributionHash: distribution.inputHash,
  }));
}

main().catch(error => {
  console.error('Validation C5 LOT-03 interrompue :', error instanceof Error ? error.message : error);
  process.exit(1);
});
