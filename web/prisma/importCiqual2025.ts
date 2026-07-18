/**
 * C5 LOT-02 — import append-only du référentiel Ciqual 2025 V1.
 *
 * Sans argument, le script télécharge les deux XML officiels, vérifie leurs
 * MD5, construit les 55 744 lignes et s'arrête sans connexion à la base.
 *
 * L'écriture exige simultanément :
 *   --apply
 *   --confirmation C5-LOT02-IMPORT-MC-2026-07-18-v1
 *   WN_C5_CIQUAL_IMPORT_CONFIRMATION=C5-LOT02-IMPORT-MC-2026-07-18-v1
 *   MIGRATE_DATABASE_URL=<connexion PostgreSQL de migration>
 *
 * En dehors de Vercel Production, --allow-non-production est en plus requis ;
 * cette exception sert uniquement au replay sur PostgreSQL éphémère.
 */
import { createWriteStream } from 'node:fs';
import { mkdtemp, rename, rm, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { Client } from 'pg';
import { stripSslParams, supabasePoolSsl } from '@/lib/postgres';
import {
  buildCiqualImport,
  CIQUAL_DATASET_VERSION,
  CIQUAL_EXPECTED_FOODS,
  CIQUAL_EXPECTED_ROWS,
  CIQUAL_EXPECTED_STATUS_COUNTS,
  CIQUAL_IMPORT_CONFIRMATION,
  CIQUAL_NUTRIENTS,
  type CiqualDryRunReport,
  type CiqualImportRow,
  type CiqualStatusCounts,
  type CiqualUnit,
} from './ciqualImport';

const COMPOSITION_URL =
  'https://entrepot.recherche.data.gouv.fr/api/access/datafile/666249';
const CONSTITUENTS_URL =
  'https://entrepot.recherche.data.gouv.fr/api/access/datafile/666246';
const BATCH_SIZE = 500;

interface SourceFiles {
  compositionPath: string;
  constituentsPath: string;
  cleanup: () => Promise<void>;
}

interface TargetSummary {
  rows: number;
  foods: number;
  nutrients: number;
  sourceHashes: number;
}

function argumentValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`Valeur absente pour ${name}`);
  }
  return value;
}

async function download(url: string, destination: string): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const partial = `${destination}.part-${attempt}`;
    try {
      const response = await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(120_000),
      });
      if (!response.ok || !response.body) {
        throw new Error(`Téléchargement impossible (${response.status}) : ${url}`);
      }
      await pipeline(
        Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]),
        createWriteStream(partial, { flags: 'wx' }),
      );
      await rename(partial, destination);
      return;
    } catch (error) {
      lastError = error;
      await unlink(partial).catch(() => undefined);
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, attempt * 500));
      }
    }
  }
  throw lastError;
}

async function resolveSourceFiles(): Promise<SourceFiles> {
  const compositionPath = argumentValue('--source');
  const constituentsPath = argumentValue('--const-source');
  if (compositionPath || constituentsPath) {
    if (!compositionPath || !constituentsPath) {
      throw new Error('--source et --const-source doivent être fournis ensemble');
    }
    return { compositionPath, constituentsPath, cleanup: async () => undefined };
  }

  const directory = await mkdtemp(join(tmpdir(), 'wn-c5-ciqual-'));
  const downloadedComposition = join(directory, 'compo_2025_11_03.xml');
  const downloadedConstituents = join(directory, 'const_2025_11_03.xml');
  try {
    await Promise.all([
      download(COMPOSITION_URL, downloadedComposition),
      download(CONSTITUENTS_URL, downloadedConstituents),
    ]);
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
  return {
    compositionPath: downloadedComposition,
    constituentsPath: downloadedConstituents,
    cleanup: () => rm(directory, { recursive: true, force: true }),
  };
}

function printDryRun(report: CiqualDryRunReport): void {
  console.log('=== C5 LOT-02 — dry-run Ciqual 2025 V1 ===');
  console.log(JSON.stringify(report, null, 2));
  console.log('Aucune donnée brute conservée. Aucune écriture PostgreSQL effectuée.');
}

async function readTargetSummary(client: Client): Promise<TargetSummary> {
  const result = await client.query<{
    rows: number;
    foods: number;
    nutrients: number;
    source_hashes: number;
  }>(
    `SELECT
       count(*)::int AS rows,
       count(DISTINCT ciqual_code)::int AS foods,
       count(DISTINCT nutrient_code)::int AS nutrients,
       count(DISTINCT source_hash)::int AS source_hashes
     FROM ciqual_nutrient_values
     WHERE dataset_version = $1`,
    [CIQUAL_DATASET_VERSION],
  );
  const row = result.rows[0];
  if (!row) throw new Error('Résumé cible absent');
  return {
    rows: Number(row.rows),
    foods: Number(row.foods),
    nutrients: Number(row.nutrients),
    sourceHashes: Number(row.source_hashes),
  };
}

async function insertBatch(client: Client, rows: CiqualImportRow[]): Promise<void> {
  const columnsPerRow = 9;
  const values: Array<string | null> = [];
  const placeholders = rows.map((row, rowIndex) => {
    values.push(
      row.id,
      row.ciqualCode,
      row.nutrientCode,
      row.value,
      row.valueStatus,
      row.unit,
      row.datasetVersion,
      row.sourceRef,
      row.sourceHash,
    );
    const offset = rowIndex * columnsPerRow;
    return `(${Array.from({ length: columnsPerRow }, (_, index) => `$${offset + index + 1}`).join(', ')})`;
  });

  await client.query(
    `INSERT INTO ciqual_nutrient_values
       (id, ciqual_code, nutrient_code, value, value_status, unit,
        dataset_version, source_ref, source_hash)
     VALUES ${placeholders.join(', ')}`,
    values,
  );
}

function assertTargetSummary(summary: TargetSummary): void {
  if (
    summary.rows !== CIQUAL_EXPECTED_ROWS ||
    summary.foods !== CIQUAL_EXPECTED_FOODS ||
    summary.nutrients !== CIQUAL_NUTRIENTS.length ||
    summary.sourceHashes !== 1
  ) {
    throw new Error(`Intégrité cible invalide : ${JSON.stringify(summary)}`);
  }
}

async function assertTargetDetails(
  client: Client,
  expectedCompositionMd5: string,
  expectedRows: CiqualImportRow[],
): Promise<void> {
  const hashResult = await client.query<{ source_hash: string }>(
    `SELECT DISTINCT source_hash
     FROM ciqual_nutrient_values
     WHERE dataset_version = $1`,
    [CIQUAL_DATASET_VERSION],
  );
  if (
    hashResult.rows.length !== 1 ||
    hashResult.rows[0]?.source_hash !== expectedCompositionMd5
  ) {
    throw new Error('Empreinte source cible incohérente');
  }

  const countResult = await client.query<{
    nutrient_code: string;
    value_status: keyof CiqualStatusCounts;
    count: number;
  }>(
    `SELECT nutrient_code, value_status, count(*)::int AS count
     FROM ciqual_nutrient_values
     WHERE dataset_version = $1
     GROUP BY nutrient_code, value_status`,
    [CIQUAL_DATASET_VERSION],
  );
  const counts = Object.fromEntries(
    CIQUAL_NUTRIENTS.map(item => [
      item.code,
      { exact: 0, trace: 0, below_limit: 0, missing: 0 },
    ]),
  ) as Record<string, CiqualStatusCounts>;
  for (const row of countResult.rows) {
    if (!counts[row.nutrient_code] || !(row.value_status in counts[row.nutrient_code])) {
      throw new Error(`Statut cible inattendu : ${JSON.stringify(row)}`);
    }
    counts[row.nutrient_code][row.value_status] = Number(row.count);
  }
  for (const nutrient of CIQUAL_NUTRIENTS) {
    if (
      JSON.stringify(counts[nutrient.code]) !==
      JSON.stringify(CIQUAL_EXPECTED_STATUS_COUNTS[nutrient.code])
    ) {
      throw new Error(`Volumes cible incohérents pour ${nutrient.code}`);
    }
  }

  const unitResult = await client.query<{ nutrient_code: string; unit: CiqualUnit }>(
    `SELECT DISTINCT nutrient_code, unit
     FROM ciqual_nutrient_values
     WHERE dataset_version = $1`,
    [CIQUAL_DATASET_VERSION],
  );
  if (unitResult.rows.length !== CIQUAL_NUTRIENTS.length) {
    throw new Error(`Nombre de couples constituant/unité incohérent : ${unitResult.rows.length}`);
  }
  const targetUnits = new Map(unitResult.rows.map(row => [row.nutrient_code, row.unit]));
  for (const nutrient of CIQUAL_NUTRIENTS) {
    if (targetUnits.get(nutrient.code) !== nutrient.unit) {
      throw new Error(`Unité cible incohérente pour ${nutrient.code}`);
    }
  }

  const rowResult = await client.query<{
    id: string;
    ciqual_code: string;
    nutrient_code: string;
    value: string | null;
    value_status: string;
    unit: string;
    source_ref: string;
    source_hash: string;
  }>(
    `SELECT id, ciqual_code, nutrient_code, value::text, value_status, unit,
            source_ref, source_hash
     FROM ciqual_nutrient_values
     WHERE dataset_version = $1`,
    [CIQUAL_DATASET_VERSION],
  );
  if (rowResult.rows.length !== expectedRows.length) {
    throw new Error(`Volume détaillé cible incohérent : ${rowResult.rows.length}`);
  }
  const targetByKey = new Map(
    rowResult.rows.map(row => [`${row.ciqual_code}:${row.nutrient_code}`, row]),
  );
  for (const expected of expectedRows) {
    const target = targetByKey.get(`${expected.ciqualCode}:${expected.nutrientCode}`);
    const expectedValue =
      expected.value === null ? null : Number(expected.value).toFixed(6);
    if (
      !target ||
      target.id !== expected.id ||
      target.value !== expectedValue ||
      target.value_status !== expected.valueStatus ||
      target.unit !== expected.unit ||
      target.source_ref !== expected.sourceRef ||
      target.source_hash !== expected.sourceHash
    ) {
      throw new Error(
        `Ligne cible incohérente pour ${expected.ciqualCode}/${expected.nutrientCode}`,
      );
    }
  }

  const securityResult = await client.query<{
    rls_enabled: boolean;
    policies: number;
    data_api_grants: number;
  }>(
    `SELECT
       c.relrowsecurity AS rls_enabled,
       (SELECT count(*)::int FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'ciqual_nutrient_values') AS policies,
       (SELECT count(*)::int FROM information_schema.role_table_grants
        WHERE table_schema = 'public'
          AND table_name = 'ciqual_nutrient_values'
          AND grantee IN ('anon', 'authenticated', 'PUBLIC')) AS data_api_grants
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'ciqual_nutrient_values'`,
  );
  const security = securityResult.rows[0];
  if (
    !security?.rls_enabled ||
    Number(security.policies) !== 0 ||
    Number(security.data_api_grants) !== 0
  ) {
    throw new Error(`Posture RLS/grants invalide : ${JSON.stringify(security)}`);
  }
}

async function applyImport(rows: CiqualImportRow[], report: CiqualDryRunReport): Promise<void> {
  const confirmation = argumentValue('--confirmation');
  if (confirmation !== CIQUAL_IMPORT_CONFIRMATION) {
    throw new Error(`Confirmation CLI invalide ; attendu ${CIQUAL_IMPORT_CONFIRMATION}`);
  }
  if (process.env.WN_C5_CIQUAL_IMPORT_CONFIRMATION !== CIQUAL_IMPORT_CONFIRMATION) {
    throw new Error('Variable WN_C5_CIQUAL_IMPORT_CONFIRMATION absente ou invalide');
  }
  if (
    process.env.VERCEL_ENV !== 'production' &&
    !process.argv.includes('--allow-non-production')
  ) {
    throw new Error('--apply hors production exige --allow-non-production');
  }

  const databaseUrl = process.env.MIGRATE_DATABASE_URL;
  if (!databaseUrl) throw new Error('MIGRATE_DATABASE_URL est absente');

  const client = new Client({
    connectionString: stripSslParams(databaseUrl),
    ssl: supabasePoolSsl(databaseUrl),
  });
  await client.connect();
  let transactionOpen = false;
  try {
    await client.query('BEGIN');
    transactionOpen = true;
    await client.query("SET LOCAL lock_timeout = '10s'");
    await client.query("SET LOCAL statement_timeout = '180s'");
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
      `c5-ciqual-import:${CIQUAL_DATASET_VERSION}`,
    ]);
    await client.query('LOCK TABLE ciqual_nutrient_values IN SHARE ROW EXCLUSIVE MODE');

    const before = await readTargetSummary(client);
    if (before.rows !== 0 && before.rows !== CIQUAL_EXPECTED_ROWS) {
      throw new Error(
        `Import append-only refusé : cible partielle ou étrangère ${JSON.stringify(before)}`,
      );
    }

    let inserted = 0;
    if (before.rows === 0) {
      for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
        const batch = rows.slice(offset, offset + BATCH_SIZE);
        await insertBatch(client, batch);
        inserted += batch.length;
      }
    }

    const after = await readTargetSummary(client);
    assertTargetSummary(after);
    await assertTargetDetails(client, report.compositionMd5, rows);
    await client.query('COMMIT');
    transactionOpen = false;

    console.log('=== C5 LOT-02 — import PostgreSQL validé ===');
    console.log(
      JSON.stringify(
        {
          confirmation: CIQUAL_IMPORT_CONFIRMATION,
          datasetVersion: CIQUAL_DATASET_VERSION,
          inserted,
          idempotentNoop: before.rows === CIQUAL_EXPECTED_ROWS,
          target: after,
          rls: 'enabled',
          policies: 0,
          dataApiGrants: 0,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    if (transactionOpen) await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  const sources = await resolveSourceFiles();
  try {
    const { rows, report } = await buildCiqualImport(
      sources.compositionPath,
      sources.constituentsPath,
    );
    printDryRun(report);
    if (!apply) {
      console.log(
        `Mode dry-run. Pour écrire, les deux preuves ${CIQUAL_IMPORT_CONFIRMATION} sont requises.`,
      );
      return;
    }
    await applyImport(rows, report);
  } finally {
    await sources.cleanup();
  }
}

main().catch(error => {
  console.error('Import C5 LOT-02 interrompu :', error instanceof Error ? error.message : error);
  process.exit(1);
});
