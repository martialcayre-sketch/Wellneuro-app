// Bibliothèque NotebookLM — export du corpus par notebook.
//
// NotebookLM n'a pas d'API : la bibliothèque se nourrit à la main, mais
// l'assemblage est outillé. Cet export prend les MARKDOWN CANONIQUES du
// corpus (~/.wellneuro/corpus/extracted/<sourceId>/canonical.md — sortie de
// la triple lecture A/B/C, décision praticien du 2026-07-23) et les organise
// en UN DOSSIER PAR NOTEBOOK (primaryNotebook du registre sanitaire), prêts à
// être téléversés dans Google Drive puis branchés comme sources NotebookLM.
//
//   node tools/corpus/notebooklm/exporter.mjs [--source WN-SRC-0056,…]
//
// Sortie HORS DÉPÔT : ~/.wellneuro/corpus/notebooklm/<notebook>/<source>.md
// avec un MANIFESTE.md par notebook (traçabilité de ce qui a été versé).
// Aucun réseau, aucune clé, aucune écriture base. Marche à suivre :
// docs/claude/corpus/BIBLIOTHEQUE_NOTEBOOKLM.md.

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const home = os.homedir();
const EXTRACTED = path.join(home, '.wellneuro', 'corpus', 'extracted');
const OUTDIR = path.join(home, '.wellneuro', 'corpus', 'notebooklm');
const REGISTRE = path.resolve('docs/claude/corpus/source_registry.json');

function parseArgs() {
  const a = process.argv.slice(2);
  const o = { sources: null };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--source') o.sources = a[++i].split(',').map((s) => s.trim());
  }
  return o;
}

/** Nom de fichier/dossier sûr : pas de séparateurs ni de caractères réservés. */
function nomSur(texte) {
  return texte.replace(/[/\\:*?"<>|]/g, '·').replace(/\s+/g, ' ').trim().slice(0, 120);
}

async function main() {
  const o = parseArgs();
  const registre = JSON.parse(await fs.readFile(REGISTRE, 'utf8'));
  const parId = new Map(registre.filter((n) => n.sourceId).map((n) => [n.sourceId, n]));

  let extraites;
  try {
    extraites = (await fs.readdir(EXTRACTED, { withFileTypes: true }))
      .filter((e) => e.isDirectory() && /^WN-SRC-\d{4}$/.test(e.name))
      .map((e) => e.name);
  } catch {
    console.error(`Aucune extraction trouvée (${EXTRACTED}) — extraire d'abord (tools/corpus/extract).`);
    process.exit(1);
  }
  const cibles = o.sources ? extraites.filter((s) => o.sources.includes(s)) : extraites;
  if (cibles.length === 0) {
    console.error('Aucune source extraite ne correspond.');
    process.exit(1);
  }

  const parNotebook = new Map();
  const sansCanonique = [];
  for (const sourceId of cibles.sort()) {
    let canonique;
    try {
      canonique = await fs.readFile(path.join(EXTRACTED, sourceId, 'canonical.md'), 'utf8');
    } catch {
      sansCanonique.push(sourceId);
      continue;
    }
    const notice = parId.get(sourceId) ?? {};
    const notebook = notice.primaryNotebook || 'Hors notebook';
    const titre = notice.title || sourceId;
    const liste = parNotebook.get(notebook) ?? [];
    liste.push({ sourceId, titre, canonique });
    parNotebook.set(notebook, liste);
  }

  for (const [notebook, sources] of parNotebook) {
    const dossier = path.join(OUTDIR, nomSur(notebook));
    await fs.mkdir(dossier, { recursive: true });
    const lignesManifeste = [
      `# ${notebook} — manifeste d'export NotebookLM`,
      '',
      `Généré par tools/corpus/notebooklm/exporter.mjs. Contenu : markdown`,
      `canonique du corpus (triple lecture A/B/C), une entrée par source.`,
      '',
    ];
    for (const { sourceId, titre, canonique } of sources) {
      const fichier = `${sourceId} — ${nomSur(titre).replace(/\.pdf$/i, '')}.md`;
      await fs.writeFile(path.join(dossier, fichier), canonique);
      lignesManifeste.push(`- ${fichier} (${canonique.length} caractères)`);
      console.log(`  ${notebook} ← ${fichier}`);
    }
    await fs.writeFile(path.join(dossier, 'MANIFESTE.md'), lignesManifeste.join('\n') + '\n');
  }

  console.log(`\n=== Bilan ===`);
  console.log(`  notebooks : ${parNotebook.size}, sources exportées : ${cibles.length - sansCanonique.length}`);
  if (sansCanonique.length) {
    console.log(`  ⚠ sans canonical.md (non exportées) : ${sansCanonique.join(', ')}`);
  }
  console.log(`  → ${OUTDIR}`);
  console.log(`  Marche à suivre : docs/claude/corpus/BIBLIOTHEQUE_NOTEBOOKLM.md`);
}

main().catch((e) => { console.error(e); process.exit(1); });
