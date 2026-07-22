// Phase 2b — Ingestion HTTP des claims rédigés (draft-*.json) vers la route
// /api/internal/rag/claims/ingest (par lots ≤ 64). Pendant claims du
// tools/corpus/ingest/ingest.mjs (chunks) : même contrat d'appel, même auth.
//
// Les chunks sources doivent déjà être ingérés sur la cible (FK version-épinglée :
// un chunk absent → CHUNK_INTROUVABLE, 422). Ré-envoi d'un lot identique = no-op
// (version de claim immuable côté serveur). Tous les claims entrent
// EN_ATTENTE_VALIDATION : la validation praticien (D-003) reste hors de cet outil.
//
// Deux modes :
//   --validate            hors-ligne : fait passer chaque lot par le VRAI
//                         parseRagClaimsIngestPayload du serveur (aucun réseau,
//                         aucune base) — prouve la conformité au contrat.
//   (par défaut)          POST réel vers $WN_RAG_URL (défaut http://localhost:3000).
//
//   node --import ./tools/corpus/lib/register-alias.mjs \
//     tools/corpus/claims/ingest.mjs \
//     --draft ~/.wellneuro/corpus/claims/draft-LOT_001_2026-07-22.json [--validate]
//
// Requiert (mode POST) : RAG_INTERNAL_SECRET. Jamais loggé, jamais écrit.

import fs from 'node:fs/promises';

const { parseRagClaimsIngestPayload } = await import('@/lib/rag/claims/validation');

const RAG_MAX_BATCH = 64;

function parseArgs() {
  const a = process.argv.slice(2);
  const o = { draft: null, validate: false, url: process.env.WN_RAG_URL || 'http://localhost:3000' };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--draft') o.draft = a[++i];
    else if (a[i] === '--validate') o.validate = true;
    else if (a[i] === '--url') o.url = a[++i];
  }
  return o;
}

function decouperLots(claims) {
  const lots = [];
  for (let i = 0; i < claims.length; i += RAG_MAX_BATCH) lots.push(claims.slice(i, i + RAG_MAX_BATCH));
  return lots;
}

function modeValidate(lots) {
  let total = 0, okLots = 0, koLots = 0;
  for (const [idx, lot] of lots.entries()) {
    total += lot.length;
    try {
      const parsed = parseRagClaimsIngestPayload({ claims: lot });
      okLots++;
      console.log(`  ✓ lot ${idx + 1} : ${parsed.claims.length} claims conformes (parseRagClaimsIngestPayload)`);
    } catch (e) {
      koLots++;
      console.log(`  ✗ lot ${idx + 1} : REJET — ${e.message}`);
    }
  }
  console.log(`\nValidation hors-ligne : ${total} claims, ${okLots} lot(s) conformes, ${koLots} rejeté(s).`);
  if (koLots) process.exit(1);
}

async function modePost(lots, url) {
  const secret = process.env.RAG_INTERNAL_SECRET?.trim();
  if (!secret) { console.error('RAG_INTERNAL_SECRET absent — impossible de POSTer.'); process.exit(1); }
  let total = 0;
  for (const [idx, lot] of lots.entries()) {
    const r = await fetch(`${url}/api/internal/rag/claims/ingest`, {
      method: 'POST',
      headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
      body: JSON.stringify({ claims: lot }),
    });
    const payload = await r.json().catch(() => ({}));
    if (!r.ok) {
      // Arrêt au premier échec : les lots suivants référencent le même socle de
      // chunks, ré-essayer sans comprendre ne ferait que répéter la faute.
      console.error(`  ✗ lot ${idx + 1} : HTTP ${r.status} — ${payload.error || JSON.stringify(payload)}`);
      process.exit(1);
    }
    total += payload.indexedCount ?? 0;
    console.log(
      `  ✓ lot ${idx + 1} : ${payload.status} — ${payload.indexedCount} claims, vérification ${payload.verification?.ok ? 'OK' : 'ÉCHEC'}`,
    );
  }
  console.log(`\nIngestion : ${total} claims indexés (EN_ATTENTE_VALIDATION).`);
}

async function main() {
  const o = parseArgs();
  if (!o.draft) { console.error('Usage : --draft <chemin draft-*.json> [--validate] [--url http://…]'); process.exit(1); }
  const draft = JSON.parse(await fs.readFile(o.draft, 'utf8'));
  if (!Array.isArray(draft.claims) || draft.claims.length === 0) {
    console.error('Le draft ne contient aucun claim.');
    process.exit(1);
  }
  const lots = decouperLots(draft.claims);
  console.log(`Lot : ${draft.batchId} — ${draft.claims.length} claims, ${lots.length} requête(s)\n`);
  if (o.validate) modeValidate(lots);
  else await modePost(lots, o.url);
}

main().catch((e) => { console.error(e); process.exit(1); });
