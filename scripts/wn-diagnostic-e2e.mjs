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
import { join, relative } from 'node:path';
import { inflateRawSync } from 'node:zlib';

const racine = process.argv[2] ?? 'web/test-results';

/**
 * Entrées d'une archive ZIP, lues dans le répertoire central.
 *
 * ON DÉCOMPRESSE DÉSORMAIS LE JOURNAL RÉSEAU, et la version précédente de ce
 * bloc disait le contraire — « la taille décompressée suffit ». Elle ne suffit
 * plus : voir `navigationSansRequete` ci-dessous, où un journal NON vide peut
 * ne contenir aucune requête de navigation. Ce qui reste vrai, c'est la
 * contrainte qui avait motivé ce choix : aucune dépendance à `unzip`, absent
 * d'une Debian minimale. `zlib` est natif à Node — elle est donc tenue.
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
    const methode = buf.readUInt16LE(position + 10);
    const tailleCompressee = buf.readUInt32LE(position + 20);
    const tailleDecompressee = buf.readUInt32LE(position + 24);
    const lgNom = buf.readUInt16LE(position + 28);
    const lgExtra = buf.readUInt16LE(position + 30);
    const lgCommentaire = buf.readUInt16LE(position + 32);
    const decalageLocal = buf.readUInt32LE(position + 42);
    if (position + 46 + lgNom > buf.length) return null;
    entrees.push({
      nom: buf.toString('utf8', position + 46, position + 46 + lgNom),
      taille: tailleDecompressee,
      methode,
      tailleCompressee,
      decalageLocal,
    });
    position += 46 + lgNom + lgExtra + lgCommentaire;
  }
  return { buf, entrees };
}

/**
 * Le contenu texte d'une entrée, ou `null` si on ne sait pas le lire.
 *
 * `null` n'est jamais « vide » : un contenu illisible fait TAIRE le
 * diagnostic, il ne l'autorise pas. C'est la même discipline que le reste du
 * script — se taire plutôt que d'excuser un rouge à tort.
 *
 * Les longueurs du répertoire central ne servent PAS à trouver les données :
 * l'en-tête local porte ses propres longueurs de nom et d'extra, souvent
 * différentes de celles du répertoire, et viser les secondes ferait lire à
 * côté.
 */
function contenuEntree(buf, entree) {
  try {
    const local = entree.decalageLocal;
    if (local + 30 > buf.length) return null;
    if (buf.readUInt32LE(local) !== 0x04034b50) return null;
    const lgNom = buf.readUInt16LE(local + 26);
    const lgExtra = buf.readUInt16LE(local + 28);
    const debut = local + 30 + lgNom + lgExtra;
    // 0 = stocké (les fixtures de banc), 8 = dégonflé (les traces réelles de
    // Playwright). Toute autre méthode est inconnue de ce lecteur : silence.
    //
    // POUR UNE ENTRÉE STOCKÉE, C'EST LA TAILLE DÉCOMPRESSÉE QUI BORNE LES
    // DONNÉES — les deux champs coïncident sur un ZIP bien formé, mais le banc
    // les DISSOCIE délibérément pour reproduire ce qu'écrit Playwright, et
    // viser le champ « compressée » ferait lire au-delà de l'entrée, jusque
    // dans l'en-tête suivant.
    if (entree.methode === 0) {
      const fin = debut + entree.taille;
      if (fin > buf.length) return null;
      return buf.subarray(debut, fin).toString('utf8');
    }
    if (entree.methode === 8) {
      const fin = debut + entree.tailleCompressee;
      if (fin > buf.length) return null;
      return inflateRawSync(buf.subarray(debut, fin)).toString('utf8');
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * LA NAVIGATION A-T-ELLE ÉMIS UNE REQUÊTE ? — et non « le journal est-il vide ».
 *
 * LE DÉFAUT QUE CETTE FONCTION FERME, mesuré le 2026-08-23 sur deux artefacts
 * réels de deux sessions distinctes. Le prédicat précédent était « toutes les
 * entrées `.network` pèsent zéro octet ». Il tenait tant que le test ne faisait
 * rien avant sa navigation. Mais un test qui monte son décor par
 * `page.request.post(...)` — forme courante dans `e2e/` — écrit une entrée dans
 * CE MÊME journal, AVANT le `page.goto` qui, lui, n'émettra rien. Le journal
 * pesait 2 723 octets pour une seule ligne, et le classificateur s'est tu sur
 * le cas exact qu'il existe pour nommer.
 *
 * Playwright marque ces requêtes-là : `snapshot._apiRequest === true` désigne
 * une requête émise par `APIRequestContext` (`page.request`), jamais par la
 * page qui navigue. Le fait discriminant devient donc : **aucune requête de
 * PAGE**. Un défaut applicatif en émet — la navigation part, le serveur
 * répond mal ou lentement ; un blocage du navigateur n'en émet aucune, quoi
 * que le corps du test ait envoyé par ailleurs.
 *
 * FAIL-SAFE DANS LE SENS DU SILENCE : une ligne qu'on ne sait pas analyser
 * compte comme une requête de page. Mieux vaut ne pas diagnostiquer un vrai
 * blocage que d'excuser un vrai défaut.
 */
function navigationSansRequete(buf, reseaux) {
  for (const entree of reseaux) {
    const contenu = contenuEntree(buf, entree);
    if (contenu === null) return false;
    for (const ligne of contenu.split('\n')) {
      const texte = ligne.trim();
      if (!texte) continue;
      let evenement;
      try {
        evenement = JSON.parse(texte);
      } catch {
        return false;
      }
      if (evenement?.type !== 'resource-snapshot') continue;
      if (evenement?.snapshot?._apiRequest === true) continue;
      return false;
    }
  }
  return true;
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
  const archive = entreesZip(trace);
  if (!archive) continue;

  // Playwright écrit un `<n>-trace.network` par contexte de page. Le réglage
  // `trace: 'retain-on-failure'` enregistre tout et ne conserve que les échecs
  // — ce qu'on y lit est donc un fait, pas une trace désactivée.
  const reseaux = archive.entrees.filter(e => e.nom.endsWith('.network'));
  if (reseaux.length === 0) continue;
  const aucuneRequeteDePage = navigationSansRequete(archive.buf, reseaux);

  // EXPIRATION, SANS EXIGER `page.goto` DANS LE TEXTE. Playwright n'écrit pas
  // toujours l'appel fautif dans `error-context.md` : au LOT-09, il n'y avait
  // consigné qu'un délai de TEARDOWN, et le classificateur s'est tu alors que
  // la trace portait le fait décisif. Relâcher ce prédicat n'élargit rien de
  // dangereux, parce qu'il ne décide jamais seul : c'est la conjonction avec
  // « aucune requête de page » qui diagnostique, et un défaut applicatif qui
  // expire, lui, a émis des requêtes.
  const erreur = erreurVoisine(trace);
  const expiration = /timeout/i.test(erreur);
  const nom = relative(racine, trace).replace(/\/trace\.zip$/, '');

  if (aucuneRequeteDePage && expiration) {
    blocages++;
    lignes.push(`  ✗ ${nom}`);
    lignes.push('      Navigation expirée, et AUCUNE requête de page émise.');
  }
}

if (blocages === 0) process.exit(0);

process.stderr.write(
  '\n──────────────────────────────────────────────────────────────────────\n' +
    `DIAGNOSTIC : ${blocages} échec(s) de navigation SANS requête de page.\n` +
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
