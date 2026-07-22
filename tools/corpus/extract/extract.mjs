// Phase 2 — Étage extract : produit la COUCHE VERBATIM d'une source.
//
// Piloté par le manifeste (sourceId → localPath). Pour chaque page : lecture A
// (pdftotext, vérité des nombres), rendu image, lectures B (Claude) et C (GPT),
// invariants (dosages, couverture). Canonique verbatim = lecture B, garde-fou
// A/C : tout dosage de A absent de B est signalé (perdu des deux = alerte dure).
//
// Sortie hors dépôt : ~/.wellneuro/corpus/extracted/<sourceId>/
//   canonical.md        — verbatim page par page (marqueurs de page)
//   invariants.json     — dosages A, manquants B/C, couverture, par page
//
//   node extract.mjs --pilote WN-SRC-0056,WN-SRC-0063,…  [--pages N] [--force]
//
// Réutilise tools/corpus/bench/lib/lecteurs.mjs. Aucune donnée patient.

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { lectureA, lectureB, lectureC, rendrePage } from '../bench/lib/lecteurs.mjs';
import { extraireDosages, dosagesManquants, couvertureCaracteres } from '../bench/lib/invariants.mjs';

const execFileP = promisify(execFile);
const home = os.homedir();
const MANIFEST = path.join(home, '.wellneuro', 'corpus', 'manifest.json');
const OUT = path.join(home, '.wellneuro', 'corpus', 'extracted');

function parseArgs() {
  const a = process.argv.slice(2);
  const o = { pilote: [], pages: Infinity, force: false };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--pilote') o.pilote = a[++i].split(',').map((s) => s.trim());
    else if (a[i] === '--pages') o.pages = Number(a[++i]);
    else if (a[i] === '--force') o.force = true;
  }
  return o;
}

async function nbPages(pdf) {
  const { stdout } = await execFileP('pdfinfo', [pdf]);
  return Number(stdout.match(/^Pages:\s+(\d+)/m)?.[1] || 0);
}

async function extraireSource(sourceId, localPath, notebook, maxPages, force) {
  const dir = path.join(OUT, sourceId);
  const pngDir = path.join(dir, 'png');
  await fs.mkdir(pngDir, { recursive: true });
  const invPath = path.join(dir, 'invariants.json');

  const total = Math.min(await nbPages(localPath), maxPages);
  const pages = [];
  const invPages = [];

  for (let p = 1; p <= total; p++) {
    const pageCache = path.join(dir, `p${String(p).padStart(3, '0')}.json`);
    let rec;
    if (!force) { try { rec = JSON.parse(await fs.readFile(pageCache, 'utf8')); } catch {} }
    if (!rec) {
      const texteA = await lectureA(localPath, p);
      const dosagesA = extraireDosages(texteA);
      const { base64 } = await rendrePage(localPath, p, path.join(pngDir, `p${String(p).padStart(3, '0')}.png`));
      const [B, C] = await Promise.allSettled([lectureB(base64), lectureC(base64)]);
      const okB = B.status === 'fulfilled' ? B.value : { texte: '', erreur: String(B.reason?.message || B.reason) };
      const okC = C.status === 'fulfilled' ? C.value : { texte: '', erreur: String(C.reason?.message || C.reason) };
      const manqB = okB.texte ? dosagesManquants(dosagesA, okB.texte) : dosagesA.slice();
      const manqC = okC.texte ? dosagesManquants(dosagesA, okC.texte) : dosagesA.slice();
      rec = {
        page: p,
        canonical: okB.texte || okC.texte || '', // verbatim = B, repli C
        source: okB.texte ? 'B' : (okC.texte ? 'C' : 'aucune'),
        dosagesA,
        manqB, manqC,
        perdusDesDeux: manqB.filter((d) => manqC.includes(d)),
        couvB: okB.texte ? Number(couvertureCaracteres(texteA, okB.texte).toFixed(3)) : 0,
        couvC: okC.texte ? Number(couvertureCaracteres(texteA, okC.texte).toFixed(3)) : 0,
        erreurB: okB.erreur, erreurC: okC.erreur,
      };
      await fs.writeFile(pageCache, JSON.stringify(rec, null, 2));
      const badge = rec.perdusDesDeux.length ? `⚠${rec.perdusDesDeux.length}` : 'ok';
      process.stdout.write(`  ${sourceId} p${p}/${total} ${badge}\n`);
    }
    pages.push(rec);
    invPages.push({ page: p, dosagesA: rec.dosagesA.length, manqB: rec.manqB.length, manqC: rec.manqC.length, perdusDesDeux: rec.perdusDesDeux, couvB: rec.couvB, couvC: rec.couvC });
  }

  // Canonique verbatim : concaténation des pages avec marqueurs.
  const md = pages.map((r) => `<!-- page ${r.page} (lecture ${r.source}) -->\n\n${r.canonical.trim()}\n`).join('\n');
  await fs.writeFile(path.join(dir, 'canonical.md'), `${md}\n`);

  const totDosA = invPages.reduce((s, x) => s + x.dosagesA, 0);
  const totPerdus = invPages.reduce((s, x) => s + x.perdusDesDeux.length, 0);
  await fs.writeFile(invPath, JSON.stringify({ sourceId, notebook, pages: invPages, totaux: { dosagesA: totDosA, perdusDesDeux: totPerdus } }, null, 2));
  return { sourceId, pages: total, dosagesA: totDosA, perdusDesDeux: totPerdus };
}

async function main() {
  const o = parseArgs();
  if (!o.pilote.length) { console.error('Usage : --pilote WN-SRC-0056,WN-SRC-0063,…'); process.exit(1); }
  const man = JSON.parse(await fs.readFile(MANIFEST, 'utf8')).manifeste;
  const reg = JSON.parse(await fs.readFile(path.resolve('docs/claude/corpus/source_registry.json'), 'utf8'));
  const byId = Object.fromEntries(reg.map((n) => [n.sourceId, n]));

  const bilan = [];
  for (const sid of o.pilote) {
    const e = man[sid];
    if (!e) { console.error(`  ${sid} absent du manifeste — ignoré`); continue; }
    const notebook = byId[sid]?.primaryNotebook || '';
    console.log(`\n=== ${sid} — ${e.canonical} ===`);
    bilan.push(await extraireSource(sid, e.localPath, notebook, o.pages, o.force));
  }

  console.log(`\n=== Bilan extraction ===`);
  for (const b of bilan) console.log(`  ${b.sourceId} : ${b.pages}p, ${b.dosagesA} dosages, perdus des deux ${b.perdusDesDeux}`);
  const alertes = bilan.filter((b) => b.perdusDesDeux > 0);
  if (alertes.length) console.log(`\n⚠ ${alertes.length} source(s) avec dosages perdus des deux → revue humaine avant chunk.`);
  else console.log(`\n✓ Aucun dosage perdu des deux lectures sur le pilote.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
