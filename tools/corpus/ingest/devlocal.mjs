// Phase 2 — Ingestion dev-local par harnais DIRECT pgvector.
//
// Réplique fidèlement le SQL de web/src/lib/rag/store.ts (SELECT existant →
// UPDATE supersession → INSERT ON CONFLICT) et le test de récupération de
// verification.ts, contre une base Postgres éphémère. Embeddings réels via
// l'API OpenAI (mêmes paramètres que web/src/lib/rag/embeddings.ts).
//
// Ce n'est pas le serveur Next : le contrat d'ingest (parseRagIngestPayload)
// est prouvé séparément par ingest.mjs --validate. Ici on prouve la chaîne
// embeddings → stockage pgvector → récupération sur données réelles.
//
//   node --env-file=<...>/web/.env.local tools/corpus/ingest/devlocal.mjs \
//     --pilote WN-SRC-0056,… [--batch 900] [--pgurl postgresql://postgres@localhost:55432/wn_rag_pilote]
//
// Aucune donnée patient ; compartiment ACTIF, patient_identifiable false.

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import pg from 'pg';
import { chunksDeSource, batchId } from '../chunk/chunk.mjs';

const home = os.homedir();
const EXTRACTED = path.join(home, '.wellneuro', 'corpus', 'extracted');
const MANIFEST = path.join(home, '.wellneuro', 'corpus', 'manifest.json');

const EMBEDDING_MODEL = process.env.RAG_EMBEDDING_MODEL || 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

function parseArgs() {
  const a = process.argv.slice(2);
  const o = {
    pilote: [], batch: '900', date: null,
    pgurl: process.env.WN_PG_URL || 'postgresql://postgres@localhost:55432/wn_rag_pilote',
    query: 'Quelle est la dose maximale tolérable de vitamine A ?',
  };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--pilote') o.pilote = a[++i].split(',').map((s) => s.trim());
    else if (a[i] === '--batch') o.batch = a[++i];
    else if (a[i] === '--date') o.date = a[++i];
    else if (a[i] === '--pgurl') o.pgurl = a[++i];
    else if (a[i] === '--query') o.query = a[++i];
  }
  return o;
}

// Embeddings — mêmes paramètres que web/src/lib/rag/embeddings.ts.
async function createEmbeddings(inputs) {
  if (inputs.length === 0) return [];
  const key = process.env.OPENAI_API_KEY?.trim();
  const base = (process.env.OPENAI_BASE_URL?.trim() || 'https://api.openai.com/v1').replace(/\/$/, '');
  const r = await fetch(`${base}/embeddings`, {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: inputs, dimensions: EMBEDDING_DIMENSIONS, encoding_format: 'float' }),
    cache: 'no-store',
  });
  const payload = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(payload.error?.message || `Échec embeddings HTTP ${r.status}`);
  const ordered = [...(payload.data ?? [])].sort((a, b) => a.index - b.index);
  if (ordered.length !== inputs.length) throw new Error(`Embeddings incohérents : ${ordered.length}/${inputs.length}`);
  return ordered.map((it) => it.embedding);
}

// Corps soumis à l'embedding : sans front matter (comme embeddingTextForChunk).
function embeddingText(content) {
  if (!content.startsWith('---\n')) return content;
  const end = content.indexOf('\n---\n', 4);
  return end < 0 ? content : content.slice(end + 5);
}

const vectorLiteral = (v) => `[${v.join(',')}]`;

// Réplique EXACTE de upsertRagChunks (store.ts) sur un client pg en transaction.
async function upsert(client, chunk, embedding) {
  const id = `${chunk.chunkId}@${chunk.versionChunk}`;
  const emb = vectorLiteral(embedding);
  const meta = JSON.stringify(chunk.metadata ?? {});

  const existing = await client.query(
    `SELECT content_sha256::text FROM public.rag_corpus_chunks WHERE chunk_id=$1 AND version_chunk=$2 LIMIT 1`,
    [chunk.chunkId, chunk.versionChunk],
  );
  if (existing.rows[0] && existing.rows[0].content_sha256 !== chunk.contentSha256) {
    throw new Error(`VERSION_CONFLICT ${id}`);
  }
  await client.query(
    `UPDATE public.rag_corpus_chunks SET active=false, superseded_at=now(), updated_at=now()
     WHERE chunk_id=$1 AND version_chunk<>$2 AND active=true`,
    [chunk.chunkId, chunk.versionChunk],
  );
  await client.query(
    `INSERT INTO public.rag_corpus_chunks (
       id,batch_id,source_id,chunk_id,version_source,version_chunk,notebook,section,content,content_sha256,
       source_drive_id,llm_amendment_model,validation_evidence,metadata,embedding_model,embedding_dimensions,embedding,
       compartment,indexation_autorisee,patient_identifiable,active,indexed_at,superseded_at,updated_at
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15,$16,$17::extensions.vector,
       'ACTIF',true,false,true,now(),null,now()
     )
     ON CONFLICT (chunk_id,version_chunk) DO UPDATE SET
       batch_id=EXCLUDED.batch_id, source_id=EXCLUDED.source_id, version_source=EXCLUDED.version_source,
       notebook=EXCLUDED.notebook, section=EXCLUDED.section, content=EXCLUDED.content,
       source_drive_id=EXCLUDED.source_drive_id, llm_amendment_model=EXCLUDED.llm_amendment_model,
       validation_evidence=EXCLUDED.validation_evidence, metadata=EXCLUDED.metadata,
       embedding_model=EXCLUDED.embedding_model, embedding_dimensions=EXCLUDED.embedding_dimensions,
       embedding=EXCLUDED.embedding, compartment='ACTIF', indexation_autorisee=true, patient_identifiable=false,
       active=true, indexed_at=now(), superseded_at=null, updated_at=now()`,
    [id, chunk.batchId, chunk.sourceId, chunk.chunkId, chunk.versionSource, chunk.versionChunk,
     chunk.notebook, chunk.section, chunk.content, chunk.contentSha256,
     chunk.sourceDriveId ?? null, chunk.llmAmendmentModel ?? null, chunk.validationEvidence ?? null,
     meta, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS, emb],
  );
  return id;
}

// Test de récupération (verification.ts) : chaque chunk doit se retrouver
// lui-même (sha256 identique, similarité ~1).
async function selfTest(client, chunkIds) {
  let ok = 0;
  for (const cid of chunkIds) {
    const r = await client.query(
      `SELECT s.content_sha256::text AS own,
              n.chunk_id AS near, n.content_sha256::text AS near_sha,
              1 - (s.embedding <=> n.embedding) AS sim
       FROM public.rag_corpus_chunks s
       JOIN LATERAL (
         SELECT chunk_id, content_sha256, embedding
         FROM public.rag_corpus_chunks
         WHERE active AND indexation_autorisee AND NOT patient_identifiable AND compartment='ACTIF'
         ORDER BY embedding <=> s.embedding LIMIT 1
       ) n ON true
       WHERE s.chunk_id=$1 AND s.active`,
      [cid],
    );
    const row = r.rows[0];
    if (row && row.near_sha === row.own && Number(row.sim) >= 0.999999) ok++;
  }
  return { ok, total: chunkIds.length };
}

async function main() {
  const o = parseArgs();
  if (!o.pilote.length) { console.error('Usage : --pilote WN-SRC-0056,…'); process.exit(1); }
  if (!process.env.OPENAI_API_KEY) { console.error('OPENAI_API_KEY absent (lancer avec --env-file).'); process.exit(1); }
  const dateISO = o.date || new Date().toISOString().slice(0, 10);
  const bId = batchId(o.batch, dateISO);

  const man = JSON.parse(await fs.readFile(MANIFEST, 'utf8')).manifeste;
  const reg = JSON.parse(await fs.readFile(path.resolve('docs/claude/corpus/source_registry.json'), 'utf8'));
  const byId = Object.fromEntries(reg.map((n) => [n.sourceId, n]));

  const client = new pg.Client({ connectionString: o.pgurl });
  await client.connect();
  // L'opérateur pgvector <=> vit dans le schéma `extensions` (comme en prod) ;
  // la fonction match_* fixe son propre search_path, mais nos requêtes brutes
  // de test doivent l'inclure explicitement.
  await client.query('SET search_path TO public, extensions, pg_temp');
  console.log(`Lot ${bId} → ${o.pgurl}\n`);

  let totalChunks = 0;
  const idsParSource = [];
  for (const sid of o.pilote) {
    let md;
    try { md = await fs.readFile(path.join(EXTRACTED, sid, 'canonical.md'), 'utf8'); }
    catch { console.log(`  ${sid} : canonical.md absent — ignoré`); continue; }
    const notice = byId[sid] || {};
    const chunks = chunksDeSource({
      batchId: bId, sourceId: sid, notebook: notice.primaryNotebook || '', titre: notice.title || sid,
      canonicalMd: md, registre: notice,
      llmAmendmentModel: 'claude-sonnet-5 + gpt-5.4 (croisé)',
      validationEvidence: `banc invariants 2 IA — ${man[sid]?.sha256?.slice(0, 12) || 'n/a'}`,
    });
    const embeddings = await createEmbeddings(chunks.map((c) => embeddingText(c.content)));
    await client.query('BEGIN');
    const ids = [];
    for (let i = 0; i < chunks.length; i++) { await upsert(client, chunks[i], embeddings[i]); ids.push(chunks[i].chunkId); }
    await client.query('COMMIT');
    const st = await selfTest(client, ids);
    totalChunks += chunks.length;
    idsParSource.push({ sid, n: chunks.length, self: st });
    console.log(`  ✓ ${sid} : ${chunks.length} chunks indexés, récupération ${st.ok}/${st.total}`);
  }

  // Santé + recherche sémantique réelle.
  const health = await client.query(`SELECT count(*) total, count(*) FILTER (WHERE active) active,
    count(DISTINCT batch_id) batches, count(DISTINCT source_id) sources FROM public.rag_corpus_chunks`);
  console.log(`\nSanté base : ${JSON.stringify(health.rows[0])}`);

  const [qEmb] = await createEmbeddings([o.query]);
  const res = await client.query(
    `SELECT * FROM public.match_wellneuro_rag_chunks($1::extensions.vector, 5, 0.2, NULL, NULL, NULL)`,
    [vectorLiteral(qEmb)],
  );
  console.log(`\nRecherche : « ${o.query} »`);
  for (const row of res.rows) {
    console.log(`  ${row.chunk_id} (sim ${Number(row.similarity).toFixed(3)}) § ${row.section} — p${row.metadata?.page_source ?? '?'}`);
  }

  await client.end();
  const totSelf = idsParSource.reduce((s, x) => s + x.self.ok, 0);
  console.log(`\n=== Bilan : ${totalChunks} chunks, récupération ${totSelf}/${totalChunks} ===`);
}

main().catch((e) => { console.error(e); process.exit(1); });
