// Phase 0 — Rapatriement local d'un dossier Drive (maillon manquant du snapshot).
//
// `snapshot.mjs` apparie des fichiers DÉJÀ rapatriés ; il ne les télécharge pas.
// Ce script fait ce pas-là : il descend récursivement un dossier Drive et écrit
// l'arborescence sous ~/.wellneuro/corpus/drive-dump/. LECTURE SEULE sur Drive
// (scope drive.readonly) — aucune création, mise à jour ni suppression.
//
//   node --env-file=../../../web/.env.local fetch-drive.mjs --dossier <folderId> [options]
//
// Options :
//   --dossier <id>     id du dossier Drive racine (JAMAIS committé — passé en argument)
//   --dump <dir>       destination (défaut ~/.wellneuro/corpus/drive-dump)
//   --filtre <regex>   ne rapatrie que les fichiers dont le NOM correspond (insensible à la casse)
//   --dry-run          liste ce qui serait téléchargé, n'écrit rien
//   --force            retélécharge même si le fichier local est déjà conforme
//
// Auth (compte de service Google), variables d'environnement (web/.env.local) :
//   WN_DRIVE_SA_JSON        chemin du fichier clé JSON (ou WN_DRIVE_SA_JSON_INLINE)
//   WN_DRIVE_SUBJECT        (optionnel) e-mail à impersonnifier. Essayé d'abord,
//     avec repli sur le compte de service seul : un dossier partagé par lien est
//     lisible sans impersonation, et la délégation domaine n'autorise pas
//     forcément le scope readonly.
//
// Garde-fous :
//   - Aucun Drive ID n'est écrit sur disque ni affiché : la trace locale se fait
//     par nom de fichier, qui est aussi la clé de jointure de `snapshot.mjs`.
//   - Les fichiers restent HORS DÉPÔT (~/.wellneuro/corpus/), cf. README.md.
//   - Idempotent : un fichier local de même taille est conservé (--force outrepasse).

import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { google } from 'googleapis';

const home = os.homedir();
const MIME_FOLDER = 'application/vnd.google-apps.folder';
const SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

function parseArgs() {
  const a = process.argv.slice(2);
  const o = {
    dossier: null,
    dump: path.join(home, '.wellneuro', 'corpus', 'drive-dump'),
    filtre: null,
    dryRun: false,
    force: false,
  };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--dossier') o.dossier = a[++i];
    else if (a[i] === '--dump') o.dump = a[++i];
    else if (a[i] === '--filtre') o.filtre = new RegExp(a[++i], 'i');
    else if (a[i] === '--dry-run') o.dryRun = true;
    else if (a[i] === '--force') o.force = true;
  }
  return o;
}

async function creerClientDrive() {
  const inline = process.env.WN_DRIVE_SA_JSON_INLINE?.trim();
  const chemin = process.env.WN_DRIVE_SA_JSON?.trim();
  if (!inline && !chemin) {
    throw new Error('Compte de service absent : définir WN_DRIVE_SA_JSON ou WN_DRIVE_SA_JSON_INLINE.');
  }
  const credentials = JSON.parse(inline || (await fs.readFile(chemin, 'utf8')));
  const subject = process.env.WN_DRIVE_SUBJECT?.trim() || undefined;

  // Impersonation d'abord (accès aux Drive du domaine), repli sur le compte de
  // service seul (suffit pour un dossier partagé par lien).
  const modes = subject ? [subject, undefined] : [undefined];
  for (const sujet of modes) {
    try {
      const auth = new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: [SCOPE],
        subject: sujet,
      });
      await auth.authorize();
      return {
        drive: google.drive({ version: 'v3', auth }),
        mode: sujet ? `impersonation ${sujet}` : 'compte de service',
      };
    } catch (e) {
      if (!sujet) throw e;
      const motif = String(e.message).split('\n')[0].slice(0, 80);
      console.warn(`  impersonation ${sujet} refusée (${motif}) — repli compte de service`);
    }
  }
  throw new Error("Aucun mode d'authentification n'a abouti.");
}

/**
 * Nom de fichier sûr : neutralise les séparateurs de chemin (traversée) et les
 * noms relatifs. Le reste est conservé À L'IDENTIQUE — espaces et accents
 * compris : c'est la clé de jointure de `snapshot.mjs` avec le `title` des
 * notices du registre.
 */
function nomSur(nom) {
  const propre = nom.replace(/[/\\]/g, '_');
  return propre.trim() === '' || propre === '.' || propre === '..' ? '_' : propre;
}

async function listerEnfants(drive, parentId) {
  const enfants = [];
  let pageToken;
  do {
    const res = await drive.files.list({
      q: `'${parentId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, name, mimeType, size)',
      pageSize: 200,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    enfants.push(...(res.data.files ?? []));
    pageToken = res.data.nextPageToken;
  } while (pageToken);
  return enfants;
}

async function telecharger(drive, fichierId, destination) {
  const res = await drive.files.get(
    { fileId: fichierId, alt: 'media', supportsAllDrives: true },
    { responseType: 'stream' },
  );
  // Écriture en fichier partiel puis renommage atomique : le dump ne contient
  // jamais de PDF tronqué, qu'un `snapshot` ultérieur prendrait pour valide.
  const partiel = `${destination}.partiel`;
  await pipeline(res.data, createWriteStream(partiel));
  await fs.rename(partiel, destination);
}

async function parcourir(drive, o, dossierId, destination, bilan, prefixe) {
  await fs.mkdir(destination, { recursive: true });
  for (const enfant of await listerEnfants(drive, dossierId)) {
    const nom = nomSur(enfant.name);
    if (enfant.mimeType === MIME_FOLDER) {
      await parcourir(drive, o, enfant.id, path.join(destination, nom), bilan, `${prefixe}${nom}/`);
      continue;
    }
    // Les formats natifs Google (Docs, Sheets…) n'ont pas d'octets à télécharger.
    if (enfant.mimeType.startsWith('application/vnd.google-apps')) {
      bilan.ignores.push(`${prefixe}${nom} (format natif Google)`);
      continue;
    }
    if (o.filtre && !o.filtre.test(nom)) continue;

    const cible = path.join(destination, nom);
    const attendu = enfant.size ? Number(enfant.size) : null;
    let dejaConforme = false;
    try {
      const stat = await fs.stat(cible);
      dejaConforme = attendu !== null && stat.size === attendu;
    } catch {
      /* absent du dump */
    }

    if (dejaConforme && !o.force) {
      bilan.presents.push(`${prefixe}${nom}`);
      continue;
    }
    if (o.dryRun) {
      bilan.aTelecharger.push(`${prefixe}${nom}`);
      continue;
    }
    await telecharger(drive, enfant.id, cible);
    bilan.telecharges.push(`${prefixe}${nom}`);
    process.stdout.write(`  telecharge ${prefixe}${nom}\n`);
  }
}

async function main() {
  const o = parseArgs();
  if (!o.dossier) {
    console.error(
      'Usage : node fetch-drive.mjs --dossier <folderId> [--dump <dir>] [--filtre <regex>] [--dry-run] [--force]',
    );
    process.exit(1);
  }

  const { drive, mode } = await creerClientDrive();
  const racine = await drive.files.get({
    fileId: o.dossier,
    fields: 'id, name, mimeType',
    supportsAllDrives: true,
  });
  if (racine.data.mimeType !== MIME_FOLDER) {
    throw new Error(`L'id fourni n'est pas un dossier (${racine.data.mimeType}).`);
  }
  const nomRacine = nomSur(racine.data.name);
  const destination = path.join(o.dump, nomRacine);

  console.log(`Authentification : ${mode}`);
  console.log(`Dossier Drive    : « ${nomRacine} » (lecture seule)`);
  console.log(`Destination      : ${destination}${o.dryRun ? '  [dry-run]' : ''}`);
  if (o.filtre) console.log(`Filtre           : ${o.filtre}`);
  console.log('');

  const bilan = { telecharges: [], presents: [], aTelecharger: [], ignores: [] };
  await parcourir(drive, o, o.dossier, destination, bilan, '');

  console.log('\n=== Bilan rapatriement ===');
  console.log(`  telecharges     : ${bilan.telecharges.length}`);
  console.log(`  deja presents   : ${bilan.presents.length}`);
  if (o.dryRun) console.log(`  a telecharger   : ${bilan.aTelecharger.length}`);
  if (bilan.ignores.length) {
    console.log(`  ignores         : ${bilan.ignores.length} (formats natifs Google)`);
  }
  if (o.dryRun) bilan.aTelecharger.slice(0, 40).forEach((f) => console.log(`    + ${f}`));
  console.log('\nEtape suivante : node tools/corpus/snapshot/snapshot.mjs');
  console.log("Rappel : les fichiers restent hors depot ; aucun Drive ID n'est ecrit ni committe.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
