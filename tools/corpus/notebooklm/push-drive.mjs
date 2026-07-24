// Bibliothèque NotebookLM — téléversement Drive de l'export (maillon outillé du
// « versement manuel » décrit dans docs/claude/corpus/BIBLIOTHEQUE_NOTEBOOKLM.md).
//
// L'export (exporter.mjs) écrit ~/.wellneuro/corpus/notebooklm/<notebook>/*.md.
// Ce script les POUSSE dans Google Drive sous WELLNEURO_BIBLIOTHEQUE/<notebook>/,
// où NotebookLM va les chercher. IDEMPOTENT : un fichier de même nom est mis à
// jour (même comportement que le glisser-déposer, qui « fusionne » les dossiers
// homonymes), les nouveaux sont créés. Aucune écriture base.
//
//   node --env-file=../../../web/.env.local push-drive.mjs [--notebook "09 — …"] [--dry-run]
//
// Auth (compte de service Google) — variables d'environnement (web/.env.local) :
//   WN_DRIVE_SA_JSON         chemin du fichier clé JSON du compte de service
//     (ou WN_DRIVE_SA_JSON_INLINE = le JSON en clair, une seule ligne)
//   WN_DRIVE_SUBJECT         e-mail @wellneuro.fr à IMPERSONNIFIER (délégation
//     domaine Workspace). FORTEMENT RECOMMANDÉ : la bibliothèque vit dans
//     « Mon Drive » de l'utilisateur, or un compte de service seul n'a AUCUN
//     quota de stockage sur un Drive personnel (échec « storageQuotaExceeded »).
//     Avec l'impersonation, les fichiers appartiennent à l'utilisateur — pas de
//     quota. À défaut, ranger la bibliothèque dans un Drive partagé.
//   WN_DRIVE_ROOT_ID         (optionnel) id du dossier WELLNEURO_BIBLIOTHEQUE
//     s'il existe déjà (évite une recherche par nom au niveau racine).
//
// Marche à suivre complète : docs/claude/corpus/BIBLIOTHEQUE_NOTEBOOKLM.md.

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { google } from 'googleapis';

const home = os.homedir();
const OUTDIR = path.join(home, '.wellneuro', 'corpus', 'notebooklm');
const ROOT_NAME = 'WELLNEURO_BIBLIOTHEQUE';
const MIME_MD = 'text/markdown';
const MIME_FOLDER = 'application/vnd.google-apps.folder';

function parseArgs() {
  const a = process.argv.slice(2);
  const o = { notebook: null, dryRun: false };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--notebook') o.notebook = a[++i];
    else if (a[i] === '--dry-run') o.dryRun = true;
  }
  return o;
}

/** Échappe une valeur pour la syntaxe de requête Drive (name = '…'). */
function echapper(valeur) {
  return valeur.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function creerClientDrive() {
  const inline = process.env.WN_DRIVE_SA_JSON_INLINE?.trim();
  const chemin = process.env.WN_DRIVE_SA_JSON?.trim();
  if (!inline && !chemin) {
    throw new Error(
      'Compte de service absent : définir WN_DRIVE_SA_JSON (chemin du JSON) ou WN_DRIVE_SA_JSON_INLINE.',
    );
  }
  const credentials = JSON.parse(inline || (await fs.readFile(chemin, 'utf8')));
  const subject = process.env.WN_DRIVE_SUBJECT?.trim() || undefined;
  if (!subject) {
    console.warn(
      'AVERTISSEMENT : WN_DRIVE_SUBJECT non défini. Un compte de service sans impersonation ne peut pas écrire dans un « Mon Drive » (quota). Voir l’en-tête du script.',
    );
  }
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/drive'],
    subject,
  });
  await auth.authorize();
  return google.drive({ version: 'v3', auth });
}

/** Id d'un dossier par nom sous un parent (null au niveau racine), ou null. */
async function trouverDossier(drive, nom, parentId) {
  const q = [
    `name = '${echapper(nom)}'`,
    `mimeType = '${MIME_FOLDER}'`,
    'trashed = false',
    `'${parentId ?? 'root'}' in parents`,
  ].join(' and ');
  const res = await drive.files.list({
    q,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  return res.data.files?.[0]?.id ?? null;
}

async function creerDossier(drive, nom, parentId) {
  const res = await drive.files.create({
    requestBody: { name: nom, mimeType: MIME_FOLDER, parents: parentId ? [parentId] : undefined },
    fields: 'id',
    supportsAllDrives: true,
  });
  return res.data.id;
}

/** Id d'un fichier par nom dans un dossier, ou null. */
async function trouverFichier(drive, nom, parentId) {
  const q = [`name = '${echapper(nom)}'`, 'trashed = false', `'${parentId}' in parents`].join(' and ');
  const res = await drive.files.list({
    q,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  return res.data.files?.[0]?.id ?? null;
}

async function televerser(drive, dossierId, nom, contenu) {
  const existant = await trouverFichier(drive, nom, dossierId);
  const media = { mimeType: MIME_MD, body: Readable.from(contenu) };
  if (existant) {
    await drive.files.update({ fileId: existant, media, supportsAllDrives: true });
    return 'maj';
  }
  await drive.files.create({
    requestBody: { name: nom, parents: [dossierId], mimeType: MIME_MD },
    media,
    fields: 'id',
    supportsAllDrives: true,
  });
  return 'creation';
}

async function main() {
  const o = parseArgs();

  let notebooks;
  try {
    notebooks = (await fs.readdir(OUTDIR, { withFileTypes: true }))
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .filter((n) => !o.notebook || n === o.notebook);
  } catch {
    console.error(`Aucun export local (${OUTDIR}) — lancer exporter.mjs d'abord.`);
    process.exit(1);
  }
  if (notebooks.length === 0) {
    console.error(
      o.notebook ? `Notebook « ${o.notebook} » absent de l'export local.` : 'Aucun notebook exporté.',
    );
    process.exit(1);
  }

  const drive = await creerClientDrive();

  // Racine WELLNEURO_BIBLIOTHEQUE : par id fourni, sinon retrouvée/créée par nom.
  let rootId = process.env.WN_DRIVE_ROOT_ID?.trim() || (await trouverDossier(drive, ROOT_NAME, null));
  if (!rootId) {
    if (o.dryRun) {
      rootId = '(à créer)';
    } else {
      rootId = await creerDossier(drive, ROOT_NAME, null);
    }
  }
  console.log(`Racine ${ROOT_NAME} : ${rootId}${o.dryRun ? ' (dry-run)' : ''}`);

  let creations = 0;
  let majs = 0;
  for (const notebook of notebooks.sort()) {
    const dossierLocal = path.join(OUTDIR, notebook);
    const fichiers = (await fs.readdir(dossierLocal)).filter((f) => f.endsWith('.md')).sort();
    if (fichiers.length === 0) continue;

    // Le sous-dossier notebook peut ne pas exister encore (rootId placeholder en
    // dry-run) : dans ce cas, tout est « à créer », rien n'est écrit.
    const dossierId =
      rootId === '(à créer)' ? null : (await trouverDossier(drive, notebook, rootId));

    if (o.dryRun) {
      console.log(`\n${notebook} → ${dossierId ?? '(dossier à créer)'} (dry-run)`);
      for (const fichier of fichiers) {
        const present = dossierId ? await trouverFichier(drive, fichier, dossierId) : null;
        if (present) majs++;
        else creations++;
        console.log(`  ${present ? '↻' : '＋'} ${fichier}`);
      }
      continue;
    }

    const dossierReel = dossierId ?? (await creerDossier(drive, notebook, rootId));
    console.log(`\n${notebook} → ${dossierReel}`);
    for (const fichier of fichiers) {
      const contenu = await fs.readFile(path.join(dossierLocal, fichier), 'utf8');
      const acte = await televerser(drive, dossierReel, fichier, contenu);
      if (acte === 'creation') creations++;
      else majs++;
      console.log(`  ${acte === 'creation' ? '＋' : '↻'} ${fichier}`);
    }
  }

  console.log(`\n=== Bilan ===`);
  console.log(
    `  créés : ${creations}, mis à jour : ${majs}${o.dryRun ? ' (dry-run, rien écrit)' : ''}`,
  );
  if (!o.dryRun) {
    console.log('  Puis, une fois par notebook : NotebookLM → Sources → Ajouter → Google Drive.');
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
