// Phase 2b — Ingestion dev-local des claims rédigés (draft-*.json) contre la base
// pilote pgvector réelle (wn_rag_pilote : 26 chunks verbatim + migration claims).
//
// Réutilise le VRAI contrat serveur (parseRagClaimsIngestPayload) et réplique le
// SQL de web/src/lib/rag/claims/store.ts + verification.ts (prouvé par
// devlocal.mjs). Embeddings SYNTHÉTIQUES (1536 dims, déterministes) : on prouve
// la chaîne parse → stockage → vérification → barrière, pas la pertinence
// sémantique. Aucune clé requise, aucune écriture prod.
//
//   node --import ./tools/corpus/lib/register-alias.mjs \
//     tools/corpus/claims/ingest-devlocal.mjs \
//     --draft ~/.wellneuro/corpus/claims/draft-LOT_001_2026-07-22.json \
//     [--pgurl postgresql://postgres@localhost:55432/wn_rag_pilote]

import fs from 'node:fs/promises';
import pg from 'pg';

const { parseRagClaimsIngestPayload } = await import('@/lib/rag/claims/validation');

const EMBEDDING_DIMENSIONS = 1536;
const CLAIM_INGEST_STATUT = 'EN_ATTENTE_VALIDATION';
const RAG_MAX_BATCH = 64;

function parseArgs() {
  const a = process.argv.slice(2);
  const o = { draft: null, pgurl: process.env.WN_PG_URL || 'postgresql://postgres@localhost:55432/wn_rag_pilote' };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--draft') o.draft = a[++i];
    else if (a[i] === '--pgurl') o.pgurl = a[++i];
  }
  return o;
}

// Embedding synthétique déterministe (par hash du texte) — reproductible.
function embeddingFromText(txt) {
  let x = 0;
  for (let i = 0; i < txt.length; i++) x = (x * 31 + txt.charCodeAt(i)) & 0x7fffffff;
  x = x || 1;
  const v = new Array(EMBEDDING_DIMENSIONS);
  let norm = 0;
  for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) {
    x = (1103515245 * x + 12345) & 0x7fffffff;
    const val = x / 0x7fffffff - 0.5;
    v[i] = val; norm += val * val;
  }
  norm = Math.sqrt(norm) || 1;
  return v.map((c) => c / norm);
}
const vectorLiteral = (v) => `[${v.join(',')}]`;

// Réplique fidèle de upsertRagClaims (store.ts) : version immuable, liens réservés
// aux claims neufs, pin du sha du chunk cité.
async function upsertClaim(client, claim, embedding) {
  const id = `${claim.claimId}@${claim.versionClaim}`;
  const existing = await client.query(
    `SELECT content_sha256::text, source_id, typologie_lecture, prescriptif,
            classe_autorite, niveau_preuve, modele_reviseur
     FROM public.rag_corpus_claims WHERE claim_id=$1 AND version_claim=$2 LIMIT 1`,
    [claim.claimId, claim.versionClaim]);
  if (existing.rows[0]) {
    const prev = existing.rows[0];
    if (prev.content_sha256 !== claim.contentSha256) throw new Error(`VERSION_CONFLICT ${id}`);
    const divergent =
      prev.source_id !== claim.sourceId ||
      prev.typologie_lecture !== claim.typologieLecture ||
      prev.prescriptif !== claim.prescriptif ||
      (prev.classe_autorite ?? null) !== (claim.classeAutorite ?? null) ||
      (prev.niveau_preuve ?? null) !== (claim.niveauPreuve ?? null) ||
      (prev.modele_reviseur ?? null) !== (claim.modeleReviseur ?? null);
    if (divergent) throw new Error(`CLAIM_IMMUABLE ${id} attributs`);
    const links = await client.query(
      `SELECT chunk_id, version_chunk FROM public.rag_corpus_claim_sources WHERE claim_pk=$1`, [id]);
    const ex = new Set(links.rows.map((l) => `${l.chunk_id}@${l.version_chunk}`));
    const inc = new Set(claim.sources.map((s) => `${s.chunkId}@${s.versionChunk}`));
    if (ex.size !== inc.size || ![...inc].every((k) => ex.has(k))) throw new Error(`CLAIM_IMMUABLE ${id} sources`);
    return { id, inserted: false };
  }
  for (const s of claim.sources) {
    const r = await client.query(
      `SELECT content_sha256::text FROM public.rag_corpus_chunks WHERE chunk_id=$1 AND version_chunk=$2 LIMIT 1`,
      [s.chunkId, s.versionChunk]);
    if (!r.rows[0]) throw new Error(`CHUNK_INTROUVABLE ${s.chunkId}@${s.versionChunk}`);
    s._sha = r.rows[0].content_sha256;
  }
  await client.query(
    `INSERT INTO public.rag_corpus_claims (
       id, claim_id, source_id, version_claim, texte_normalise, content_sha256,
       classe_autorite, niveau_preuve, typologie_lecture, prescriptif, modele_reviseur,
       statut, embedding_model, embedding_dimensions, embedding, patient_identifiable,
       compartment, metadata, active, indexed_at, superseded_at, created_at, updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::extensions.vector,
       false,'ACTIF',$16::jsonb,true,now(),null,now(),now())
     ON CONFLICT (claim_id, version_claim) DO NOTHING`,
    [id, claim.claimId, claim.sourceId, claim.versionClaim, claim.texteNormalise, claim.contentSha256,
     claim.classeAutorite ?? null, claim.niveauPreuve ?? null, claim.typologieLecture, claim.prescriptif,
     claim.modeleReviseur ?? null, CLAIM_INGEST_STATUT, 'synthetic-test', EMBEDDING_DIMENSIONS,
     vectorLiteral(embedding), JSON.stringify(claim.metadata ?? {})]);
  for (const s of claim.sources) {
    await client.query(
      `INSERT INTO public.rag_corpus_claim_sources (claim_pk, chunk_id, version_chunk, source_content_sha256, created_at)
       VALUES ($1,$2,$3,$4,now()) ON CONFLICT (claim_pk, chunk_id, version_chunk) DO NOTHING`,
      [id, s.chunkId, s.versionChunk, s._sha]);
  }
  return { id, inserted: true };
}

async function main() {
  const o = parseArgs();
  if (!o.draft) { console.error('Usage : --draft <chemin draft-*.json>'); process.exit(1); }
  const doc = JSON.parse(await fs.readFile(o.draft.replace(/^~/, process.env.HOME), 'utf8'));
  const claimsBruts = doc.claims || [];
  console.log(`Draft : ${claimsBruts.length} claims — base ${o.pgurl}\n`);

  // Conformité au VRAI contrat, par lots ≤ 64 (comme la route).
  const lots = [];
  for (let i = 0; i < claimsBruts.length; i += RAG_MAX_BATCH) {
    lots.push(parseRagClaimsIngestPayload({ claims: claimsBruts.slice(i, i + RAG_MAX_BATCH) }).claims);
  }

  const client = new pg.Client({ connectionString: o.pgurl });
  await client.connect();
  await client.query('SET search_path TO public, extensions, pg_temp');

  let inseres = 0, existants = 0, verifOk = 0;
  await client.query('BEGIN');
  try {
    for (const lot of lots) {
      for (const claim of lot) {
        const res = await upsertClaim(client, claim, embeddingFromText(claim.texteNormalise));
        if (res.inserted) inseres++; else existants++;
      }
    }
    await client.query('COMMIT');
  } catch (e) { await client.query('ROLLBACK'); console.error('Ingestion annulée :', e.message); process.exit(1); }

  // Vérification structurelle sur l'ensemble (répliquant verifyRagClaimsBatch).
  for (const lot of lots) {
    for (const claim of lot) {
      const id = `${claim.claimId}@${claim.versionClaim}`;
      const r = (await client.query(
        `SELECT extensions.vector_dims(embedding) AS dims, statut, active,
                (SELECT count(*) FROM public.rag_corpus_claim_sources s WHERE s.claim_pk=c.id) AS liens
         FROM public.rag_corpus_claims c WHERE c.id=$1`, [id])).rows[0];
      if (r && Number(r.dims) === EMBEDDING_DIMENSIONS && r.statut === CLAIM_INGEST_STATUT && r.active && Number(r.liens) >= 1) verifOk++;
    }
  }

  const health = (await client.query(
    `SELECT count(*) total, count(*) FILTER (WHERE statut='EN_ATTENTE_VALIDATION') attente,
            count(*) FILTER (WHERE statut='VALIDE') valide, count(DISTINCT source_id) sources,
            (SELECT count(*) FROM public.rag_corpus_claim_sources) liens
     FROM public.rag_corpus_claims`)).rows[0];
  const barriere = (await client.query(
    `SELECT count(*)::int n FROM public.match_wellneuro_rag_claims($1::extensions.vector, 8, -1.0, NULL, NULL)`,
    [vectorLiteral(embeddingFromText(claimsBruts[0]?.texteNormalise || 'x'))])).rows[0].n;

  await client.end();
  console.log(`Insérés : ${inseres} | déjà présents : ${existants} | vérif OK : ${verifOk}/${claimsBruts.length}`);
  console.log(`Santé claims : ${JSON.stringify(health)}`);
  console.log(`Barrière D-003 : ${barriere} claim(s) remontent (attendu 0 — tous EN_ATTENTE)`);
  const ok = verifOk === claimsBruts.length && barriere === 0;
  console.log(`\n=== ${ok ? 'CHAÎNE VERBATIM→CLAIMS PROUVÉE (dev-local)' : 'ANOMALIE'} ===`);
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
