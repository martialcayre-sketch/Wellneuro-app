import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { SaxesParser } from 'saxes';

export const CIQUAL_DATASET_VERSION = 'ciqual-2025-v1';
export const CIQUAL_COMPOSITION_MD5 = '2da725585946434df320d8041631998b';
export const CIQUAL_CONSTITUENTS_MD5 = 'd8f2f25fdacb887bc993a6eeaf80f203';
export const CIQUAL_EXPECTED_FOODS = 3_484;
export const CIQUAL_EXPECTED_ROWS = 55_744;
export const CIQUAL_IMPORT_CONFIRMATION = 'C5-LOT02-IMPORT-MC-2026-07-18-v1';
export const CIQUAL_SOURCE_REF =
  'doi:10.57745/RDMHWY#compo_2025_11_03.xml';

export type CiqualUnit = 'g/100 g' | 'mg/100 g';
export type CiqualValueStatus = 'exact' | 'trace' | 'below_limit' | 'missing';

export interface CiqualImportRow {
  id: string;
  ciqualCode: string;
  nutrientCode: string;
  value: string | null;
  valueStatus: CiqualValueStatus;
  unit: CiqualUnit;
  datasetVersion: string;
  sourceRef: string;
  sourceHash: string;
}

export interface CiqualStatusCounts {
  exact: number;
  trace: number;
  below_limit: number;
  missing: number;
}

export interface CiqualDryRunReport {
  datasetVersion: string;
  compositionMd5: string;
  constituentsMd5: string;
  foods: number;
  nutrients: number;
  rows: number;
  duplicateKeys: number;
  maxDecimalScale: number;
  statusCounts: Record<string, CiqualStatusCounts>;
  units: Record<string, CiqualUnit>;
}

export const CIQUAL_NUTRIENTS: ReadonlyArray<{
  code: string;
  unit: CiqualUnit;
}> = [
  { code: '25000', unit: 'g/100 g' },
  { code: '31000', unit: 'g/100 g' },
  { code: '32000', unit: 'g/100 g' },
  { code: '34100', unit: 'g/100 g' },
  { code: '40302', unit: 'g/100 g' },
  { code: '40303', unit: 'g/100 g' },
  { code: '40304', unit: 'g/100 g' },
  { code: '41833', unit: 'g/100 g' },
  { code: '42053', unit: 'g/100 g' },
  { code: '42263', unit: 'g/100 g' },
  { code: '10004', unit: 'g/100 g' },
  { code: '10110', unit: 'mg/100 g' },
  { code: '10120', unit: 'mg/100 g' },
  { code: '10150', unit: 'mg/100 g' },
  { code: '10190', unit: 'mg/100 g' },
  { code: '10200', unit: 'mg/100 g' },
] as const;

// Empreinte fonctionnelle du XML officiel. Elle complète le MD5 en rendant
// visibles les volumes exacts de valeurs, traces, bornes et absences.
export const CIQUAL_EXPECTED_STATUS_COUNTS: Readonly<
  Record<string, CiqualStatusCounts>
> = {
  '25000': { exact: 3451, trace: 4, below_limit: 0, missing: 29 },
  '31000': { exact: 3272, trace: 134, below_limit: 8, missing: 70 },
  '32000': { exact: 2996, trace: 205, below_limit: 60, missing: 223 },
  '34100': { exact: 3239, trace: 45, below_limit: 130, missing: 70 },
  '40302': { exact: 3093, trace: 8, below_limit: 135, missing: 248 },
  '40303': { exact: 2567, trace: 9, below_limit: 144, missing: 764 },
  '40304': { exact: 2554, trace: 9, below_limit: 147, missing: 774 },
  '41833': { exact: 1892, trace: 3, below_limit: 212, missing: 1377 },
  '42053': { exact: 1636, trace: 2, below_limit: 910, missing: 936 },
  '42263': { exact: 1560, trace: 10, below_limit: 955, missing: 959 },
  '10004': { exact: 3141, trace: 2, below_limit: 151, missing: 190 },
  '10110': { exact: 2929, trace: 4, below_limit: 149, missing: 402 },
  '10120': { exact: 2566, trace: 0, below_limit: 19, missing: 899 },
  '10150': { exact: 2488, trace: 2, below_limit: 52, missing: 942 },
  '10190': { exact: 2604, trace: 0, below_limit: 13, missing: 867 },
  '10200': { exact: 2676, trace: 1, below_limit: 23, missing: 784 },
};

type XmlRecord = Record<string, string>;

async function parseXmlRecords(
  filePath: string,
  recordTag: 'COMPO' | 'CONST',
  onRecord: (record: XmlRecord) => void,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    let current: XmlRecord | null = null;
    let text = '';
    const parser = new SaxesParser();
    const stream = createReadStream(filePath, { encoding: 'utf8' });
    const fail = (error: unknown) => {
      stream.destroy();
      reject(error);
    };

    parser.on('opentag', tag => {
      text = '';
      if (tag.name === recordTag) current = {};
    });
    parser.on('text', value => {
      text += value;
    });
    parser.on('closetag', tag => {
      const name = tag.name;
      if (current && name !== recordTag) current[name] = text.trim();
      if (name === recordTag && current) {
        onRecord(current);
        current = null;
      }
      text = '';
    });
    parser.on('error', fail);

    stream.on('data', chunk => {
      try {
        parser.write(chunk);
      } catch (error) {
        fail(error);
      }
    });
    stream.on('end', () => {
      try {
        parser.close();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
    stream.on('error', reject);
  });
}

export async function md5File(filePath: string): Promise<string> {
  const hash = createHash('md5');
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', resolve);
    stream.on('error', reject);
  });
  return hash.digest('hex');
}

export function unitFromConstituentLabel(label: string): CiqualUnit | null {
  if (/\(mg\/100\s*g\)/i.test(label)) return 'mg/100 g';
  if (/\(g\/100\s*g\)/i.test(label)) return 'g/100 g';
  return null;
}

export async function parseConstituentUnits(
  filePath: string,
): Promise<Record<string, CiqualUnit>> {
  const selectedCodes = new Set(CIQUAL_NUTRIENTS.map(item => item.code));
  const units: Record<string, CiqualUnit> = {};

  await parseXmlRecords(filePath, 'CONST', record => {
    const code = record.const_code?.trim();
    if (!code || !selectedCodes.has(code)) return;
    if (units[code]) throw new Error(`Code constituant dupliqué : ${code}`);
    const unit = unitFromConstituentLabel(record.const_nom_fr ?? '');
    if (!unit) throw new Error(`Unité officielle non résolue pour ${code}`);
    units[code] = unit;
  });

  for (const expected of CIQUAL_NUTRIENTS) {
    if (units[expected.code] !== expected.unit) {
      throw new Error(
        `Unité inattendue pour ${expected.code} : ${units[expected.code] ?? 'absente'} ` +
          `(attendu ${expected.unit})`,
      );
    }
  }
  return units;
}

export function parseCiqualValue(rawInput: string): {
  value: string | null;
  status: CiqualValueStatus;
  decimalScale: number;
} {
  const raw = rawInput.trim();
  if (raw === '' || raw === '-') {
    return { value: null, status: 'missing', decimalScale: 0 };
  }
  if (/^traces?$/i.test(raw)) {
    return { value: null, status: 'trace', decimalScale: 0 };
  }
  if (/^</.test(raw)) {
    return { value: null, status: 'below_limit', decimalScale: 0 };
  }
  if (!/^\d+(?:,\d+)?$/.test(raw)) {
    throw new Error(`Teneur Ciqual non reconnue : "${raw}"`);
  }

  const normalized = raw.replace(',', '.');
  const decimalScale = normalized.includes('.')
    ? normalized.length - normalized.indexOf('.') - 1
    : 0;
  if (decimalScale > 6) {
    throw new Error(`Précision supérieure à 6 décimales : "${raw}"`);
  }
  const numericValue = Number(normalized);
  if (!Number.isFinite(numericValue) || numericValue < 0 || numericValue >= 100_000_000) {
    throw new Error(`Valeur incompatible avec numeric(14,6) : "${raw}"`);
  }
  return { value: normalized, status: 'exact', decimalScale };
}

function emptyCounts(): CiqualStatusCounts {
  return { exact: 0, trace: 0, below_limit: 0, missing: 0 };
}

function assertStatusCounts(actual: Record<string, CiqualStatusCounts>): void {
  for (const nutrient of CIQUAL_NUTRIENTS) {
    const expected = CIQUAL_EXPECTED_STATUS_COUNTS[nutrient.code];
    const found = actual[nutrient.code];
    if (!expected || JSON.stringify(found) !== JSON.stringify(expected)) {
      throw new Error(
        `Volumes inattendus pour ${nutrient.code} : ${JSON.stringify(found)} ` +
          `(attendu ${JSON.stringify(expected)})`,
      );
    }
  }
}

export async function buildCiqualImport(
  compositionPath: string,
  constituentsPath: string,
): Promise<{ rows: CiqualImportRow[]; report: CiqualDryRunReport }> {
  const [compositionMd5, constituentsMd5, units] = await Promise.all([
    md5File(compositionPath),
    md5File(constituentsPath),
    parseConstituentUnits(constituentsPath),
  ]);
  if (compositionMd5 !== CIQUAL_COMPOSITION_MD5) {
    throw new Error(
      `MD5 composition invalide : ${compositionMd5} (attendu ${CIQUAL_COMPOSITION_MD5})`,
    );
  }
  if (constituentsMd5 !== CIQUAL_CONSTITUENTS_MD5) {
    throw new Error(
      `MD5 constituants invalide : ${constituentsMd5} (attendu ${CIQUAL_CONSTITUENTS_MD5})`,
    );
  }

  const selectedCodes = new Set(CIQUAL_NUTRIENTS.map(item => item.code));
  const foodCodes = new Set<string>();
  const values = new Map<string, string>();
  let duplicateKeys = 0;

  await parseXmlRecords(compositionPath, 'COMPO', record => {
    const ciqualCode = record.alim_code?.trim();
    const nutrientCode = record.const_code?.trim();
    if (!ciqualCode || !nutrientCode) {
      throw new Error('Ligne COMPO sans code aliment ou constituant');
    }
    foodCodes.add(ciqualCode);
    if (!selectedCodes.has(nutrientCode)) return;

    const key = `${ciqualCode}:${nutrientCode}`;
    if (values.has(key)) {
      duplicateKeys += 1;
      return;
    }
    values.set(key, record.teneur ?? '');
  });

  if (foodCodes.size !== CIQUAL_EXPECTED_FOODS) {
    throw new Error(
      `Nombre d'aliments inattendu : ${foodCodes.size} (attendu ${CIQUAL_EXPECTED_FOODS})`,
    );
  }
  if (duplicateKeys !== 0) {
    throw new Error(`${duplicateKeys} clé(s) aliment/constituant dupliquée(s)`);
  }

  const statusCounts = Object.fromEntries(
    CIQUAL_NUTRIENTS.map(item => [item.code, emptyCounts()]),
  ) as Record<string, CiqualStatusCounts>;
  let maxDecimalScale = 0;
  const rows: CiqualImportRow[] = [];
  const sortedFoodCodes = [...foodCodes].sort((a, b) => Number(a) - Number(b));

  for (const ciqualCode of sortedFoodCodes) {
    for (const nutrient of CIQUAL_NUTRIENTS) {
      const parsed = parseCiqualValue(values.get(`${ciqualCode}:${nutrient.code}`) ?? '');
      statusCounts[nutrient.code][parsed.status] += 1;
      maxDecimalScale = Math.max(maxDecimalScale, parsed.decimalScale);
      rows.push({
        id: `c5-${CIQUAL_DATASET_VERSION}-${ciqualCode}-${nutrient.code}`,
        ciqualCode,
        nutrientCode: nutrient.code,
        value: parsed.value,
        valueStatus: parsed.status,
        unit: units[nutrient.code],
        datasetVersion: CIQUAL_DATASET_VERSION,
        sourceRef: CIQUAL_SOURCE_REF,
        sourceHash: compositionMd5,
      });
    }
  }

  if (rows.length !== CIQUAL_EXPECTED_ROWS) {
    throw new Error(`Nombre de lignes inattendu : ${rows.length} (attendu ${CIQUAL_EXPECTED_ROWS})`);
  }
  assertStatusCounts(statusCounts);

  return {
    rows,
    report: {
      datasetVersion: CIQUAL_DATASET_VERSION,
      compositionMd5,
      constituentsMd5,
      foods: foodCodes.size,
      nutrients: CIQUAL_NUTRIENTS.length,
      rows: rows.length,
      duplicateKeys,
      maxDecimalScale,
      statusCounts,
      units,
    },
  };
}
