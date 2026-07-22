// Phase 2 — Étage ingest : construit les chunks d'une ou plusieurs sources et
// les POSTe vers /api/internal/rag/ingest (par lots ≤ 64, un seul batchId).
//
// Deux modes :
//   --validate            hors-ligne : fait passer les chunks par le VRAI
//                         parseRagIngestPayload du serveur (aucun réseau, aucune
//                         base) — prouve la conformité au contrat.
//   (par défaut)          POST réel vers $WN_RAG_URL (défaut http://localhost:3000).
//
//   node --import ./tools/corpus/lib/register-alias.mjs \
//     tools/corpus/ingest/ingest.mjs --pilote WN-SRC-0056,… [--validate] [--batch 013]
//
// Requiert (mode POST) : RAG_INTERNAL_SECRET. Aucune donnée patient ; le serveur
// re-vérifie hash, compartiment et absence de donnée identifiable.

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chunksDeSource, batchId } from '../chunk/chunk.mjs';

const home = os.homedir();
const EXTRACTED = path.join(home, '.wellneuro', 'corpus', 'extracted');
const MANIFEST = path.join(home, '.wellneuro', 'corpus', 'manifest.json');
const RAG_MAX_BATCH = 64;

function parseArgs() {
  const a = process.argv.slice(2);
  const o = { pilote: [], validate: false, batch: null, date: null, url: process.env.WN_RAG_URL || 'http://localhost:3000' };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--pilote') o.pilote = a[++i].split(',').map((s) => s.trim());
    else if (a[i] === '--validate') o.validate = true;
    else if (a[i] === '--batch') o.batch = a[++i];
    else if (a[i] === '--date') o.date = a[++i];
    else if (a[i] === '--url') o.url = a[++i];
  }
  return o;
}

function decouperLots(chunks) {
  const lots = [];
  for (let i = 0; i < chunks.length; i += RAG_MAX_BATCH) lots.push(chunks.slice(i, i + RAG_MAX_BATCH));
  return lots;
}

async function construireChunks(sourceIds, bId) {
  const man = JSON.parse(await fs.readFile(MANIFEST, 'utf8')).manifeste;
  const reg = JSON.parse(await fs.readFile(path.resolve('docs/claude/corpus/source_registry.json'), 'utf8'));
  const byId = Object.fromEntries(reg.map((n) => [n.sourceId, n]));
  const out = [];
  for (const sid of sourceIds) {
    const canonicalPath = path.join(EXTRACTED, sid, 'canonical.md');
    let canonicalMd;
    try { canonicalMd = await fs.readFile(canonicalPath, 'utf8'); }
    catch { console.error(`  ${sid} : canonical.md absent (extraire d'abord) — ignoré`); continue; }
    const notice = byId[sid] || {};
    const chunks = chunksDeSource({
      batchId: bId,
      sourceId: sid,
      notebook: notice.primaryNotebook || '',
      titre: notice.title || sid,
      canonicalMd,
      registre: notice,
      llmAmendmentModel: 'claude-sonnet-5 + gpt-5.4 (croisé, verbatim)',
      validationEvidence: `banc invariants 2 IA — ${man[sid]?.sha256?.slice(0, 12) || 'n/a'}`,
    });
    out.push({ sid, chunks });
  }
  return out;
}

async function modeValidate(parSource) {
  const alias = process.env.WN_ALIAS_READY;
  const serveurUrl = new URL('../../../web/src/lib/rag/validation.ts', import.meta.url);
  let parse;
  try {
    ({ parseRagIngestPayload: parse } = await import(serveurUrl.href));
  } catch (e) {
    console.error('Impossible de charger le validateur serveur (lancer avec --import register-alias) :', e.message.split('\n')[0]);
    process.exit(2);
  }
  let total = 0, okLots = 0, koLots = 0;
  for (const { sid, chunks } of parSource) {
    for (const lot of decouperLots(chunks)) {
      total += lot.length;
      try {
        const parsed = parse({ chunks: lot });
        okLots++;
        console.log(`  ✓ ${sid} : lot de ${parsed.chunks.length} chunks conforme (parseRagIngestPayload)`);
      } catch (e) {
        koLots++;
        console.log(`  ✗ ${sid} : REJET — ${e.message}`);
      }
    }
  }
  console.log(`\nValidation hors-ligne : ${total} chunks, ${okLots} lot(s) conformes, ${koLots} rejeté(s).`);
  if (koLots) process.exit(1);
}

async function modePost(parSource, url) {
  const secret = process.env.RAG_INTERNAL_SECRET?.trim();
  if (!secret) { console.error('RAG_INTERNAL_SECRET absent — impossible de POSTer.'); process.exit(1); }
  for (const { sid, chunks } of parSource) {
    for (const lot of decouperLots(chunks)) {
      const r = await fetch(`${url}/api/internal/rag/ingest`, {
        method: 'POST',
        headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
        body: JSON.stringify({ chunks: lot }),
      });
      const payload = await r.json().catch(() => ({}));
      if (r.ok) console.log(`  ✓ ${sid} : ${payload.status} — ${payload.indexedCount} chunks, test récup ${payload.retrieval?.ok ? 'OK' : 'ÉCHEC'}`);
      else console.log(`  ✗ ${sid} : HTTP ${r.status} — ${payload.error || JSON.stringify(payload)}`);
    }
  }
}

async function main() {
  const o = parseArgs();
  if (!o.pilote.length) { console.error('Usage : --pilote WN-SRC-0056,… [--validate] [--batch 013]'); process.exit(1); }
  const dateISO = o.date || new Date().toISOString().slice(0, 10);
  const numLot = o.batch || '900'; // 900+ réservé aux lots pilotes de test
  const bId = batchId(numLot, dateISO);
  console.log(`Lot : ${bId}\n`);

  const parSource = await construireChunks(o.pilote, bId);
  const totalChunks = parSource.reduce((s, x) => s + x.chunks.length, 0);
  console.log(`Sources : ${parSource.length}, chunks : ${totalChunks}\n`);

  if (o.validate) await modeValidate(parSource);
  else await modePost(parSource, o.url);
}

main().catch((e) => { console.error(e); process.exit(1); });
