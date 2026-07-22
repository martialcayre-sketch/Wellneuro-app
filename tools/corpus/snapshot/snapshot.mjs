// Phase 1 — Snapshot local du corpus WellNeuro.
//
// Apparie les fichiers d'un dossier Drive rapatrié localement aux 391 notices du
// registre (clé de jointure : le `title` = nom de fichier — AUCUN Drive ID n'est
// committé), calcule les SHA-256, détecte les doublons, et écrit un MANIFESTE
// LOCAL HORS DÉPÔT. Ne modifie jamais le registre committé ; ne bascule aucun
// `rightsStatus` ; n'écrit aucun `contentHash` dans le dépôt.
//
//   node snapshot.mjs [--dump <dir>] [--registry <path>] [--out <path>]
//
// Défauts : dump = ~/.wellneuro/corpus/drive-dump, manifeste =
// ~/.wellneuro/corpus/manifest.json, registre = docs/claude/corpus/source_registry.json.
//
// Lecture seule sur le dépôt. Aucune donnée patient, aucun secret.

import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const home = os.homedir();

function parseArgs() {
  const a = process.argv.slice(2);
  const o = {
    dump: path.join(home, '.wellneuro', 'corpus', 'drive-dump'),
    registry: path.resolve('docs/claude/corpus/source_registry.json'),
    out: path.join(home, '.wellneuro', 'corpus', 'manifest.json'),
  };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--dump') o.dump = a[++i];
    else if (a[i] === '--registry') o.registry = a[++i];
    else if (a[i] === '--out') o.out = a[++i];
  }
  return o;
}

// Normalise un nom de fichier pour l'appariement tolérant :
// - décomposition/recomposition Unicode (NFC) ;
// - minuscules ;
// - suffixe de doublon Drive « (1) », « (2) »… retiré ;
// - espaces multiples réduits, bords rognés.
function normNom(nom) {
  return nom
    .normalize('NFC')
    .toLowerCase()
    .replace(/\s*\((\d+)\)(?=\.[^.]+$|$)/, '') // « fichier (1).pdf » → « fichier.pdf »
    .replace(/\s+/g, ' ')
    .trim();
}

async function sha256(fichier) {
  return new Promise((resolve, reject) => {
    const h = createHash('sha256');
    createReadStream(fichier)
      .on('data', (d) => h.update(d))
      .on('end', () => resolve(h.digest('hex')))
      .on('error', reject);
  });
}

async function* fichiersRecursifs(dir) {
  let entrees;
  try {
    entrees = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entrees) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* fichiersRecursifs(p);
    else if (e.isFile() && !e.name.startsWith('.')) yield p;
  }
}

const MIME = { '.pdf': 'application/pdf', '.mp4': 'video/mp4' };

async function main() {
  const o = parseArgs();
  const registre = JSON.parse(await fs.readFile(o.registry, 'utf8'));

  // Index des notices par titre exact et par titre normalisé.
  const parExact = new Map();
  const parNorm = new Map(); // norm → [notices]
  for (const n of registre) {
    parExact.set(n.title, n);
    const k = normNom(n.title);
    if (!parNorm.has(k)) parNorm.set(k, []);
    parNorm.get(k).push(n);
  }

  const fichiers = [];
  for await (const p of fichiersRecursifs(o.dump)) fichiers.push(p);

  const manifeste = {}; // sourceId → { localPath, sha256, bytes, mime, matchConfidence, canonical }
  const nonApparies = []; // fichiers sans notice
  const ambigus = []; // fichier → plusieurs notices possibles
  const doublonsRegistre = []; // notice appariée par >1 fichier
  const parSourceId = new Map(); // sourceId → [fichiers appariés]

  for (const p of fichiers) {
    const base = path.basename(p);
    let notice = parExact.get(base);
    let confiance = 'exact';
    if (!notice) {
      const cands = parNorm.get(normNom(base)) || [];
      if (cands.length === 1) { notice = cands[0]; confiance = 'normalisé'; }
      else if (cands.length > 1) { ambigus.push({ fichier: base, sourceIds: cands.map((c) => c.sourceId) }); continue; }
    }
    if (!notice) { nonApparies.push(base); continue; }
    if (!parSourceId.has(notice.sourceId)) parSourceId.set(notice.sourceId, []);
    parSourceId.get(notice.sourceId).push({ p, base, confiance, notice });
  }

  // Hash + dédup par sourceId (plusieurs fichiers pour une notice = doublons Drive).
  const parHash = new Map(); // sha256 → [sourceId] (doublons de contenu inter-sources)
  for (const [sourceId, apps] of parSourceId) {
    if (apps.length > 1) doublonsRegistre.push({ sourceId, fichiers: apps.map((a) => a.base) });
    // Canonique = premier appariement exact, sinon premier.
    apps.sort((a, b) => (a.confiance === 'exact' ? -1 : 1) - (b.confiance === 'exact' ? -1 : 1));
    const choix = apps[0];
    const stat = await fs.stat(choix.p);
    const hash = await sha256(choix.p);
    const ext = path.extname(choix.base).toLowerCase();
    manifeste[sourceId] = {
      localPath: choix.p,
      sha256: hash,
      bytes: stat.size,
      mime: MIME[ext] || null,
      matchConfidence: choix.confiance,
      canonical: choix.base,
      lifecycleStatus: choix.notice.lifecycleStatus,
      format: choix.notice.format,
      autresFichiers: apps.slice(1).map((a) => a.base),
    };
    if (!parHash.has(hash)) parHash.set(hash, []);
    parHash.get(hash).push(sourceId);
  }

  const doublonsContenu = [...parHash.entries()].filter(([, ids]) => ids.length > 1)
    .map(([hash, ids]) => ({ sha256: hash, sourceIds: ids }));

  // Notices du registre sans fichier local.
  const apparies = new Set(Object.keys(manifeste));
  const sansFichier = registre.filter((n) => !apparies.has(n.sourceId));
  const aExclure = registre.filter((n) => ['quarantined', 'deprecated'].includes(n.lifecycleStatus));

  await fs.mkdir(path.dirname(o.out), { recursive: true });
  await fs.writeFile(o.out, JSON.stringify({
    genereLe: new Date().toISOString().slice(0, 10) + ' (horodatage local non versionné)',
    dump: o.dump,
    registre: o.registry,
    total: { notices: registre.length, fichiersLocaux: fichiers.length, apparies: apparies.size },
    manifeste,
  }, null, 2));

  // Rapport console (aucune donnée sensible : noms de fichiers et compteurs).
  const l = (s) => console.log(s);
  l(`\n=== Snapshot corpus — rapport ===`);
  l(`Registre        : ${registre.length} notices (${registre.filter((n) => n.format === 'PDF').length} PDF, ${registre.filter((n) => n.format === 'MP4').length} MP4)`);
  l(`Dossier dump    : ${o.dump}`);
  l(`Fichiers locaux : ${fichiers.length}`);
  l(`Appariés        : ${apparies.size} / ${registre.length}`);
  l(`  dont exacts   : ${Object.values(manifeste).filter((m) => m.matchConfidence === 'exact').length}`);
  l(`  dont normalisés: ${Object.values(manifeste).filter((m) => m.matchConfidence === 'normalisé').length}`);
  l(`Sans fichier    : ${sansFichier.length}`);
  l(`Non appariés    : ${nonApparies.length}`);
  l(`Ambigus         : ${ambigus.length}`);
  l(`Doublons Drive (même notice, >1 fichier) : ${doublonsRegistre.length}`);
  l(`Doublons contenu (même SHA-256, sources ≠) : ${doublonsContenu.length}`);
  l(`À exclure (quarantined/deprecated)        : ${aExclure.length}`);

  if (fichiers.length === 0) {
    l(`\n⚠ Dossier dump vide ou absent. Rapatrie le dossier Drive vers :`);
    l(`    ${o.dump}`);
    l(`  puis relance. (Les fichiers restent hors dépôt.)`);
  }
  if (nonApparies.length) { l(`\nNon appariés (fichiers sans notice) :`); nonApparies.slice(0, 20).forEach((f) => l(`  - ${f}`)); if (nonApparies.length > 20) l(`  … +${nonApparies.length - 20}`); }
  if (ambigus.length) { l(`\nAmbigus (à trancher manuellement) :`); ambigus.slice(0, 20).forEach((a) => l(`  - ${a.fichier} → ${a.sourceIds.join(', ')}`)); }
  if (doublonsContenu.length) { l(`\nDoublons de contenu (une seule extraction suffit) :`); doublonsContenu.slice(0, 20).forEach((d) => l(`  - ${d.sourceIds.join(' = ')}`)); }

  l(`\nManifeste écrit : ${o.out} (hors dépôt, non versionné)`);
  l(`Rappel : le registre committé n'est PAS modifié ; contentHash reste nul ;`);
  l(`rightsStatus bascule par notice à l'ingestion, jamais ici.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
