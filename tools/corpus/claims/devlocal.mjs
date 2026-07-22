// Phase 2b — Preuve dev-local de la couche CLAIMS contre une base pgvector réelle.
//
// Réutilise le VRAI contrat serveur (parseRagClaimsIngestPayload,
// sha256WellneuroText — chargés via l'alias `@/`) et réplique fidèlement le SQL
// de web/src/lib/rag/claims/store.ts + verification.ts contre la base pilote
// (celle qui porte déjà les 26 chunks verbatim et la migration claims). Prouve,
// de façon exécutable, ce que les tests unitaires ne peuvent pas atteindre sans
// base :
//   - ingestion d'un claim EN_ATTENTE_VALIDATION + lien source (sha épinglé) ;
//   - vérification structurelle (dimension d'embedding, liens, hash, statut) ;
//   - immuabilité d'une version : identique = no-op ; texte/attributs/sources
//     divergents = VERSION_CONFLICT / CLAIM_IMMUABLE ; source absente =
//     CHUNK_INTROUVABLE ;
//   - refus au contrat d'un statut VALIDE injecté ;
//   - BARRIÈRE D-003 : match_wellneuro_rag_claims ne remonte le claim qu'une fois
//     passé à VALIDE ET adossé à ≥1 lien source — jamais avant.
//
// Aucune clé OpenAI requise : les embeddings sont synthétiques (1536 dims). Ne
// touche que des claims de test (préfixe WN-CL-9999-), nettoyés en début et fin.
//
//   node --import ./tools/corpus/lib/register-alias.mjs \
//     tools/corpus/claims/devlocal.mjs \
//     [--pgurl postgresql://postgres@localhost:55432/wn_rag_pilote]

import pg from 'pg';

// Contrat serveur réel (résolus en .ts via l'alias `@/`, sans client Prisma).
const { parseRagClaimsIngestPayload } = await import('@/lib/rag/claims/validation');
const { sha256WellneuroText, normalizeWellneuroText } = await import('@/lib/rag/validation');

const EMBEDDING_DIMENSIONS = 1536;
const CLAIM_INGEST_STATUT = 'EN_ATTENTE_VALIDATION';

function parseArgs() {
  const a = process.argv.slice(2);
  const o = { pgurl: process.env.WN_PG_URL || 'postgresql://postgres@localhost:55432/wn_rag_pilote' };
  for (let i = 0; i < a.length; i++) if (a[i] === '--pgurl') o.pgurl = a[++i];
  return o;
}

// Vecteur unité synthétique déterministe par graine (reproductible, sans OpenAI).
function embeddingFromSeed(seed) {
  let x = seed >>> 0 || 1;
  const v = new Array(EMBEDDING_DIMENSIONS);
  let norm = 0;
  for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) {
    x = (1103515245 * x + 12345) & 0x7fffffff;
    const val = x / 0x7fffffff - 0.5;
    v[i] = val;
    norm += val * val;
  }
  norm = Math.sqrt(norm) || 1;
  return v.map((c) => c / norm);
}
const vectorLiteral = (v) => `[${v.join(',')}]`;

let echecs = 0;
function attendu(nom, condition, detail = '') {
  if (condition) console.log(`  ✓ ${nom}`);
  else { console.log(`  ✗ ${nom} ${detail}`); echecs++; }
}
async function attenduRejet(nom, motif, fn) {
  try { await fn(); console.log(`  ✗ ${nom} : aucun rejet`); echecs++; }
  catch (e) {
    if (String(e.message).includes(motif)) console.log(`  ✓ ${nom} (${motif})`);
    else { console.log(`  ✗ ${nom} : rejet inattendu — ${e.message}`); echecs++; }
  }
}

// Réplique fidèle de upsertRagClaims (store.ts) : version immuable, ajout de
// liens réservé aux claims neufs, pin du sha du chunk cité.
async function upsertClaim(client, claim, embedding) {
  const id = `${claim.claimId}@${claim.versionClaim}`;
  const existing = await client.query(
    `SELECT content_sha256::text, source_id, typologie_lecture, prescriptif,
            classe_autorite, niveau_preuve, modele_reviseur
     FROM public.rag_corpus_claims WHERE claim_id=$1 AND version_claim=$2 LIMIT 1`,
    [claim.claimId, claim.versionClaim],
  );
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
    return { id, inserted: false, sources: links.rows.length };
  }
  const pins = [];
  for (const s of claim.sources) {
    const r = await client.query(
      `SELECT content_sha256::text FROM public.rag_corpus_chunks WHERE chunk_id=$1 AND version_chunk=$2 LIMIT 1`,
      [s.chunkId, s.versionChunk]);
    if (!r.rows[0]) throw new Error(`CHUNK_INTROUVABLE ${s.chunkId}@${s.versionChunk}`);
    pins.push({ ...s, sha: r.rows[0].content_sha256 });
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
  for (const p of pins) {
    await client.query(
      `INSERT INTO public.rag_corpus_claim_sources (claim_pk, chunk_id, version_chunk, source_content_sha256, created_at)
       VALUES ($1,$2,$3,$4,now()) ON CONFLICT (claim_pk, chunk_id, version_chunk) DO NOTHING`,
      [id, p.chunkId, p.versionChunk, p.sha]);
  }
  return { id, inserted: true, sources: pins.length };
}

// Réplique de verifyRagClaimsBatch (verification.ts).
async function verify(client, id, expectedSha, inserted) {
  const r = await client.query(
    `SELECT content_sha256::text AS sha, statut, active,
            extensions.vector_dims(embedding) AS dims,
            (SELECT count(*) FROM public.rag_corpus_claim_sources s WHERE s.claim_pk=c.id) AS liens
     FROM public.rag_corpus_claims c WHERE c.id=$1`, [id]);
  const row = r.rows[0];
  if (!row) return { ok: false };
  const statutOk = inserted ? row.statut === CLAIM_INGEST_STATUT : true;
  const active = inserted ? row.active : true;
  const embeddingOk = Number(row.dims) === EMBEDDING_DIMENSIONS;
  const hashOk = row.sha === expectedSha;
  return { ok: statutOk && active && embeddingOk && Number(row.liens) >= 1 && hashOk, row };
}

async function matchCount(client, queryEmbedding) {
  const r = await client.query(
    `SELECT count(*)::int AS n FROM public.match_wellneuro_rag_claims($1::extensions.vector, 8, -1.0, NULL, NULL)`,
    [vectorLiteral(queryEmbedding)]);
  return r.rows[0].n;
}

function claimBrut(chunks, over = {}) {
  const texte = normalizeWellneuroText(over.texte || 'Les acides gras oméga-3 participent à la structure des membranes neuronales.');
  return {
    claimId: 'WN-CL-9999-001', sourceId: 'WN-SRC-9999', versionClaim: 'v1.0',
    texteNormalise: texte, contentSha256: sha256WellneuroText(texte),
    typologieLecture: 'interprété', metadata: { proof: true },
    sources: (over.sources || [chunks[0]]).map((c) => ({ chunkId: c.chunk_id, versionChunk: c.version_chunk })),
    patientIdentifiable: false, compartment: 'ACTIF', ...over.champs,
  };
}

async function main() {
  const o = parseArgs();
  const client = new pg.Client({ connectionString: o.pgurl });
  await client.connect();
  await client.query('SET search_path TO public, extensions, pg_temp');
  console.log(`Base : ${o.pgurl}\n`);

  const nettoyer = () => client.query(`DELETE FROM public.rag_corpus_claims WHERE claim_id LIKE 'WN-CL-9999-%'`);
  await nettoyer();

  const chunks = (await client.query(
    `SELECT chunk_id, version_chunk FROM public.rag_corpus_chunks WHERE active ORDER BY chunk_id LIMIT 2`)).rows;
  if (chunks.length < 2) { console.error('Base pilote sans 2 chunks actifs — ingérer le verbatim d’abord.'); process.exit(2); }

  const emb = embeddingFromSeed(424242);

  console.log('1. Ingestion + vérification');
  const payload = parseRagClaimsIngestPayload({ claims: [claimBrut(chunks)] });
  const c = payload.claims[0];
  const r1 = await upsertClaim(client, c, emb);
  attendu('claim inséré (inserted=true, 1 source)', r1.inserted && r1.sources === 1, JSON.stringify(r1));
  const v1 = await verify(client, r1.id, c.contentSha256, true);
  attendu('vérification structurelle OK (EN_ATTENTE, dims=1536, ≥1 lien, hash)', v1.ok, JSON.stringify(v1.row));
  const pin = (await client.query(
    `SELECT s.source_content_sha256::text AS pin, k.content_sha256::text AS live
     FROM public.rag_corpus_claim_sources s JOIN public.rag_corpus_chunks k
       ON k.chunk_id=s.chunk_id AND k.version_chunk=s.version_chunk WHERE s.claim_pk=$1`, [r1.id])).rows[0];
  attendu('empreinte source épinglée = verbatim vivant', pin.pin === pin.live);

  console.log('\n2. Immuabilité de version');
  const r2 = await upsertClaim(client, parseRagClaimsIngestPayload({ claims: [claimBrut(chunks)] }).claims[0], emb);
  attendu('ré-ingestion identique = no-op (inserted=false)', r2.inserted === false && r2.sources === 1);
  await attenduRejet('sources divergentes → CLAIM_IMMUABLE', 'CLAIM_IMMUABLE', () =>
    upsertClaim(client, parseRagClaimsIngestPayload({ claims: [claimBrut(chunks, { sources: [chunks[0], chunks[1]] })] }).claims[0], emb));
  await attenduRejet('attribut divergent (prescriptif) → CLAIM_IMMUABLE', 'CLAIM_IMMUABLE', () =>
    upsertClaim(client, parseRagClaimsIngestPayload({ claims: [claimBrut(chunks, { champs: { prescriptif: true } })] }).claims[0], emb));
  await attenduRejet('texte divergent (même version) → VERSION_CONFLICT', 'VERSION_CONFLICT', () =>
    upsertClaim(client, parseRagClaimsIngestPayload({ claims: [claimBrut(chunks, { texte: 'Texte tout autre pour la même version.' })] }).claims[0], emb));
  // Claim NEUF (id distinct) : l'immuabilité ne s'applique pas, on atteint bien
  // la résolution des sources.
  await attenduRejet('source absente → CHUNK_INTROUVABLE', 'CHUNK_INTROUVABLE', () =>
    upsertClaim(client, parseRagClaimsIngestPayload({ claims: [claimBrut(chunks, { champs: { claimId: 'WN-CL-9999-002' }, sources: [{ chunk_id: 'WN-CH-9999-999', version_chunk: 'v1.0' }] })] }).claims[0], emb));

  console.log('\n3. Refus au contrat d’un statut injecté');
  await attenduRejet('statut=VALIDE dans le payload → refus', 'ne pose que', async () =>
    parseRagClaimsIngestPayload({ claims: [claimBrut(chunks, { champs: { statut: 'VALIDE' } })] }));

  console.log('\n4. Barrière D-003 (match_wellneuro_rag_claims)');
  attendu('claim EN_ATTENTE non remonté', (await matchCount(client, emb)) === 0);
  await client.query(
    `UPDATE public.rag_corpus_claims SET statut='VALIDE', validateur='proof', valide_at=now() WHERE id=$1`, [r1.id]);
  attendu('claim VALIDE + lien source → remonté', (await matchCount(client, emb)) === 1);
  await client.query(`DELETE FROM public.rag_corpus_claim_sources WHERE claim_pk=$1`, [r1.id]);
  attendu('claim VALIDE mais orphelin de source → non remonté (EXISTS)', (await matchCount(client, emb)) === 0);

  await nettoyer();
  await client.end();
  console.log(`\n=== ${echecs === 0 ? 'TOUT VERT' : echecs + ' ÉCHEC(S)'} ===`);
  process.exit(echecs === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
