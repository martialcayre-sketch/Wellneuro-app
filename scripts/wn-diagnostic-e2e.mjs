#!/usr/bin/env node
// Classe un échec E2E : blocage du navigateur, ou défaut applicatif.
//
// POURQUOI CE SCRIPT EXISTE. Le 2026-08-11 et le 2026-08-12, trois séquences
// complètes ont rougi sur un test de `visual.spec.ts`, projet iPhone 13
// (WebKit) uniquement, toujours un seul test par run et jamais le même :
// `:159` deux fois, puis `:168` alors que `:159` passait en 314 ms dans le même
// run. Chaque fois, `page.goto` expirait à 120 s pendant que ses voisines
// immédiates restaient sous la seconde.
//
// Chacune de ces trois fois, le rouge s'est d'abord lu comme une régression du
// code en cours, et il a fallu une demi-heure pour établir le contraire. La
// trace le disait pourtant dès la première : `0-trace.network` VIDE — pas une
// seule requête HTTP émise. Le serveur n'a pas été lent, il n'a jamais été
// sollicité ; la navigation n'est jamais sortie du navigateur. Ni
// l'application, ni Prisma, ni PostgreSQL ne pouvaient être en cause.
//
// C'est cette lecture-là qui devient automatique ici. Le script ne corrige
// rien et ne masque rien : il ne touche pas au code de sortie de Playwright,
// un run rouge reste rouge. Il dit seulement, en une ligne, DE QUOI le rouge
// parle — pour que la prochaine occurrence coûte une lecture et non une
// enquête.
//
// Ce qu'il ne fait surtout pas : ajouter des `retries`. Un réessai
// transformerait ce blocage en succès silencieux et emporterait avec lui les
// vrais échecs intermittents.
//
// Usage : node scripts/wn-diagnostic-e2e.mjs [dossier test-results]

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const racine = process.argv[2] ?? 'web/test-results';

/**
 * Entrées d'une archive ZIP, lues dans le répertoire central.
 *
 * On ne décompresse rien : la taille décompressée y est déjà écrite, et c'est
 * la seule information nécessaire. Cela évite une dépendance à `unzip`, absent
 * d'une Debian minimale.
 */
function entreesZip(chemin) {
  const buf = readFileSync(chemin);
  // Signature de fin de répertoire central, cherchée depuis la fin : le
  // commentaire final est de taille variable, l'en-tête n'est donc pas à une
  // position fixe.
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i >= buf.length - 22 - 0xffff; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;

  const nombre = buf.readUInt16LE(eocd + 10);
  let position = buf.readUInt32LE(eocd + 16);
  // 0xffffffff en position ou en nombre d'entrées signale un ZIP64, que ce
  // lecteur minimal ne sait pas parcourir : mieux vaut se taire que mentir.
  if (position === 0xffffffff || nombre === 0xffff) return null;

  const entrees = [];
  for (let i = 0; i < nombre; i++) {
    if (position + 46 > buf.length) return null;
    if (buf.readUInt32LE(position) !== 0x02014b50) return null;
    const tailleDecompressee = buf.readUInt32LE(position + 24);
    const lgNom = buf.readUInt16LE(position + 28);
    const lgExtra = buf.readUInt16LE(position + 30);
    const lgCommentaire = buf.readUInt16LE(position + 32);
    if (position + 46 + lgNom > buf.length) return null;
    entrees.push({
      nom: buf.toString('utf8', position + 46, position + 46 + lgNom),
      taille: tailleDecompressee,
    });
    position += 46 + lgNom + lgExtra + lgCommentaire;
  }
  return entrees;
}

/** Chemins de toutes les archives `trace.zip` sous `dossier`. */
function tracesSous(dossier) {
  let trouvees = [];
  let contenu;
  try {
    contenu = readdirSync(dossier, { withFileTypes: true });
  } catch {
    return trouvees;
  }
  for (const e of contenu) {
    const chemin = join(dossier, e.name);
    if (e.isDirectory()) trouvees = trouvees.concat(tracesSous(chemin));
    else if (e.name === 'trace.zip') trouvees.push(chemin);
  }
  return trouvees;
}

/** Le message d'erreur retenu par Playwright à côté de la trace. */
function erreurVoisine(cheminTrace) {
  const contexte = join(cheminTrace, '..', 'error-context.md');
  try {
    if (!statSync(contexte).isFile()) return '';
    return readFileSync(contexte, 'utf8');
  } catch {
    return '';
  }
}

const traces = tracesSous(racine);
if (traces.length === 0) process.exit(0);

let blocages = 0;
const lignes = [];

for (const trace of traces) {
  const entrees = entreesZip(trace);
  if (!entrees) continue;

  // Playwright écrit un `<n>-trace.network` par contexte de page. Vide = aucun
  // événement réseau enregistré, donc aucune requête émise. Le réglage
  // `trace: 'retain-on-failure'` enregistre tout et ne conserve que les échecs
  // — un fichier vide est donc un fait, pas une trace désactivée.
  const reseaux = entrees.filter(e => e.nom.endsWith('.network'));
  if (reseaux.length === 0) continue;
  const aucuneRequete = reseaux.every(e => e.taille === 0);

  const erreur = erreurVoisine(trace);
  const navigationExpiree = /page\.goto/.test(erreur) && /timeout/i.test(erreur);
  const nom = trace.replace(/^.*test-results\//, '').replace(/\/trace\.zip$/, '');

  if (aucuneRequete && navigationExpiree) {
    blocages++;
    lignes.push(`  ✗ ${nom}`);
    lignes.push('      page.goto expiré, et AUCUNE requête HTTP émise (journal réseau vide).');
  }
}

if (blocages === 0) process.exit(0);

process.stderr.write(
  '\n──────────────────────────────────────────────────────────────────────\n' +
    `DIAGNOSTIC : ${blocages} échec(s) de navigation SANS requête réseau.\n` +
    lignes.join('\n') +
    '\n\n' +
    "La navigation n'est jamais sortie du navigateur : le serveur n'a pas été\n" +
    "sollicité, donc ni l'application, ni Prisma, ni PostgreSQL, ni le diff en\n" +
    'cours ne peuvent expliquer cet échec. Signature connue sur macOS, projet\n' +
    'iPhone 13 (WebKit), en queue de suite et sous charge machine soutenue ;\n' +
    "jamais observée en CI. Aucun correctif de notre côté n'est identifié.\n\n" +
    "CE QUE CELA NE DIT PAS : que la séquence est verte. Elle est rouge, et le\n" +
    "code de sortie le reste. Cela dit seulement que le rouge ne parle pas du\n" +
    'code en cours de modification.\n' +
    '──────────────────────────────────────────────────────────────────────\n',
);
