#!/usr/bin/env node
// Lecture de la sortie d'UN conteneur one-off Scalingo, et de lui seul (lot
// `autonomie-pieges-restes`, partie 12). LECTURE SEULE : ce script ne lance
// rien, n'arrête rien et n'écrit rien. Le lancement reste un
// `scalingo run -d "…"` visible des crochets de la session.
//
//   node scripts/wn-one-off-logs.mjs one-off-N --depuis <ISO>
//        [--commande <texte>] [--attendre <secondes>] [-n <lignes>]
//        [--app wellneuro] [--region osc-fr1] [--entree <fichier>]
//
// LE PIÈGE. Scalingo recycle les numéros de one-off. Le 2026-11-09 (constat
// de #1947), `logs --filter one-off-6758` a rendu une release-db du
// 2026-10-03, au même numéro, tant que le conteneur du jour n'avait rien
// écrit : lire cette sortie comme la sienne aurait faussé le constat. Et le
// filtre est une expression régulière sur le nom du conteneur, pas une
// égalité : `one-off-635` attrape aussi `[one-off-6351]`.
//
// CE QUI EST RETENU. Chaque conteneur a une ligne
//   AAAA-MM-JJ hh:mm:ss.n +hhmm TZ [manager] container [one-off-N] (<id>) started with the command '<cmd>'
// puis, à sa fin, la même avec `has stopped`. L'identifiant hexadécimal est
// propre au conteneur, le numéro ne l'est pas. Le script garde le seul
// démarrage de `[one-off-N]` (nom exact) daté d'après `--depuis`, l'heure lue
// AVANT le lancement ; puis les lignes `[one-off-N]` datées d'après ce
// démarrage, et l'arrêt qui porte le même identifiant. Aucune ligne datée
// d'avant `--depuis` n'est jamais rendue. Un démarrage du même nom APRÈS le
// nôtre, sous un autre identifiant et quelle que soit sa commande, borne la
// fenêtre ; sans arrêt lu du nôtre, c'est une ambiguïté. Un arrêt de moins de
// 10 s ne vaut pas encore « complet » : les dernières lignes peuvent suivre.
//
// `--commande` (recommandé) exige en outre que le conteneur retenu ait été
// lancé avec exactement ce texte : il rattrape un `--depuis` pris trop tôt.
// `--entree` lit un journal déjà extrait au lieu d'appeler le CLI (banc,
// relecture).
//
// Codes de sortie :
//   0  conteneur retenu et arrêté : sa sortie est complète dans la fenêtre lue
//   1  conteneur retenu, pas encore arrêté, ou arrêté depuis moins de 10 s :
//      relire
//   2  aucun démarrage de ce conteneur depuis --depuis (pas encore démarré,
//      fenêtre -n trop courte, ou démarré avec une autre commande) : rien rendu
//   3  usage invalide ou lecture impossible
//   4  plusieurs démarrages retenables depuis --depuis, ou un redémarrage du
//      numéro sans arrêt lu du nôtre : ambigu, rien rendu

import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const SORTIE_ARRETE = 0;
export const SORTIE_EN_COURS = 1;
export const SORTIE_ABSENT = 2;
export const SORTIE_USAGE = 3;
export const SORTIE_AMBIGU = 4;

const USAGE =
  'usage : node scripts/wn-one-off-logs.mjs one-off-N --depuis <ISO> [--commande <texte>] ' +
  '[--attendre <secondes>] [-n <lignes>] [--app wellneuro] [--region osc-fr1] [--entree <fichier>]';

const CONTENEUR = /^one-off-\d+$/;
/** Horodatage en tête de chaque ligne de `scalingo logs`. */
const HORODATAGE = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})(?:\.(\d+))? ([+-]\d{2})(\d{2})\b/;
const MANAGER =
  /^\S+ \S+ \S+ \S+ \[manager\] container \[(one-off-\d+)\] \(([0-9a-f]+)\) (started with the command '([\s\S]*)'|has stopped)\s*$/;
/** Un `--depuis` porte son fuseau : une heure locale nue se lirait dans celui de la machine. */
const ISO_AVEC_FUSEAU = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/;

/** Instant (ms) de l'horodatage de tête d'une ligne, ou null. */
export function instantDeLigne(ligne) {
  const m = HORODATAGE.exec(ligne);
  if (!m) return null;
  const [, jour, heure, fraction = '0', h, mn] = m;
  const ms = fraction.padEnd(3, '0').slice(0, 3);
  const t = Date.parse(`${jour}T${heure}.${ms}${h}:${mn}`);
  return Number.isNaN(t) ? null : t;
}

/** Ligne de cycle de vie `[manager]`, ou null. */
export function lireManager(ligne) {
  const m = MANAGER.exec(ligne);
  if (!m) return null;
  return {
    conteneur: m[1],
    id: m[2],
    evenement: m[3] === 'has stopped' ? 'arret' : 'demarrage',
    commande: m[3] === 'has stopped' ? null : m[4],
  };
}

/** La ligne vient-elle de la sortie du conteneur nommé, nom EXACT ? */
function deLaSortie(ligne, conteneur) {
  return /^\S+ \S+ \S+ \S+ \[([^\]]+)\]/.exec(ligne)?.[1] === conteneur;
}

/**
 * Extrait l'exécution d'un conteneur d'un journal `scalingo logs`.
 * @returns {{ etat: 'arrete'|'en_cours'|'absent'|'ambigu', id?: string,
 *   demarrage?: number, arret?: number|null, lignes: string[], ecartees: number, motif?: string }}
 */
export function extraireExecution(texte, { conteneur, depuis, commande = null, maintenant = Infinity }) {
  const lignes = String(texte).split('\n');
  // Tous les démarrages du nom depuis --depuis, quelle que soit leur commande :
  // un réemploi du numéro APRÈS le nôtre borne la fenêtre (revue wn-reviewer).
  const tous = [];
  for (const ligne of lignes) {
    const t = instantDeLigne(ligne);
    const mg = lireManager(ligne);
    if (t === null || !mg || mg.conteneur !== conteneur || mg.evenement !== 'demarrage' || t < depuis) continue;
    tous.push({ id: mg.id, t, commande: mg.commande });
  }
  const demarrages = tous.filter((d) => commande === null || d.commande === commande);
  const autreCommande = tous.length - demarrages.length;
  const ecartees = lignes.filter((l) => {
    const t = instantDeLigne(l);
    return t !== null && t < depuis && (deLaSortie(l, conteneur) || lireManager(l)?.conteneur === conteneur);
  }).length;
  if (demarrages.length === 0) {
    const motif = autreCommande
      ? `${autreCommande} démarrage(s) de ${conteneur} depuis --depuis, avec une autre commande (numéro recyclé ?)`
      : `aucun démarrage de ${conteneur} depuis --depuis dans la fenêtre lue`;
    return { etat: 'absent', lignes: [], ecartees, motif };
  }
  if (demarrages.length > 1) {
    return {
      etat: 'ambigu',
      lignes: [],
      ecartees,
      motif: `${demarrages.length} démarrages de ${conteneur} depuis --depuis (identifiants ${demarrages.map((d) => d.id).join(', ')})`,
    };
  }
  const [{ id, t: demarrage }] = demarrages;
  // Borne haute : le prochain démarrage du même nom, sous un autre identifiant.
  const suivant = tous.filter((d) => d.id !== id && d.t >= demarrage).reduce((min, d) => Math.min(min, d.t), Infinity);
  let arret = null;
  let avantDemarrage = 0;
  const retenues = [];
  for (const ligne of lignes) {
    const t = instantDeLigne(ligne);
    if (t === null || t >= suivant) continue;
    const mg = lireManager(ligne);
    if (t < demarrage) {
      // Sortie datée entre --depuis et le démarrage : comptée, jamais rendue.
      if (t >= depuis && !mg && deLaSortie(ligne, conteneur)) avantDemarrage += 1;
      continue;
    }
    if (mg) {
      if (mg.id !== id) continue;
      if (mg.evenement === 'arret') arret = t;
      retenues.push(ligne);
    } else if (deLaSortie(ligne, conteneur)) {
      retenues.push(ligne);
    }
  }
  // Après l'arrêt, une tolérance d'une seconde (collecteur et manager sont deux
  // sources) ; au-delà, une ligne du même nom peut venir d'un réemploi dont le
  // démarrage est illisible ou daté en désordre : écartée, comptée (revue).
  let apresArret = 0;
  const gardees = arret === null
    ? retenues
    : retenues.filter((l) => {
        const garde = lireManager(l) !== null || instantDeLigne(l) <= arret + TOLERANCE_ARRET_MS;
        if (!garde) apresArret += 1;
        return garde;
      });
  const base = { id, demarrage, arret, lignes: gardees, ecartees, avantDemarrage, apresArret };
  if (arret === null && suivant !== Infinity) {
    return { ...base, etat: 'ambigu', lignes: [], motif: `${conteneur} redémarré sous un autre identifiant sans arrêt lu du conteneur retenu (${id})` };
  }
  // Un arrêt tout juste écrit peut précéder l'ingestion des dernières lignes :
  // il ne vaut « complet » qu'après un délai de grâce.
  if (arret !== null && maintenant - arret < GRACE_MS) return { ...base, etat: 'arret_recent' };
  return { ...base, etat: arret === null ? 'en_cours' : 'arrete' };
}

/** Délai après l'arrêt avant de tenir la sortie pour complète. */
export const GRACE_MS = 10_000;
/** Lignes de sortie admises après l'horodatage de l'arrêt. */
export const TOLERANCE_ARRET_MS = 1_000;

export function analyserArguments(argv) {
  const o = { conteneur: null, depuis: null, commande: null, attendre: 0, lignes: 3000, app: 'wellneuro', region: 'osc-fr1', entree: null };
  const valeurs = new Set(['--depuis', '--commande', '--attendre', '-n', '--lignes', '--app', '--region', '--entree']);
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (valeurs.has(a)) {
      const v = argv[i + 1];
      if (v === undefined || (v.startsWith('--') && a !== '--commande')) return { erreur: `${a} attend une valeur` };
      i += 1;
      if (a === '--depuis') o.depuis = v;
      else if (a === '--commande') o.commande = v;
      else if (a === '--attendre') o.attendre = Number(v);
      else if (a === '-n' || a === '--lignes') o.lignes = Number(v);
      else if (a === '--app') o.app = v;
      else if (a === '--region') o.region = v;
      else o.entree = v;
    } else if (!a.startsWith('-') && o.conteneur === null) o.conteneur = a;
    else return { erreur: `argument inconnu : ${a}` };
  }
  if (o.conteneur === null || !CONTENEUR.test(o.conteneur)) return { erreur: 'conteneur attendu sous la forme one-off-N' };
  if (o.depuis === null) return { erreur: '--depuis est obligatoire : l’heure lue AVANT le lancement (date -u +%FT%TZ)' };
  if (!ISO_AVEC_FUSEAU.test(o.depuis) || Number.isNaN(Date.parse(o.depuis))) return { erreur: `--depuis illisible (ISO avec fuseau attendu, ex. 2026-11-23T07:39:42Z) : ${o.depuis}` };
  if (!Number.isInteger(o.lignes) || o.lignes < 1 || o.lignes > 10000) return { erreur: '-n attend un entier de 1 à 10000' };
  if (!Number.isFinite(o.attendre) || o.attendre < 0 || o.attendre > 1800) return { erreur: '--attendre attend un nombre de secondes de 0 à 1800' };
  if (o.entree !== null && o.attendre > 0) return { erreur: '--attendre est sans objet avec --entree' };
  return { options: { ...o, depuisMs: Date.parse(o.depuis) } };
}

function lireJournal(o) {
  if (o.entree !== null) return readFileSync(o.entree, 'utf8');
  // Sortie standard seule : l'avertissement de version du CLI part sur stderr.
  return execFileSync('scalingo', ['--app', o.app, '--region', o.region, 'logs', '-n', String(o.lignes), '--filter', o.conteneur], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    timeout: 60_000,
    maxBuffer: 64 * 1024 * 1024,
  });
}

const attendreMs = (ms) => new Promise((r) => setTimeout(r, ms));

export async function executer(argv, { lire = lireJournal, pause = attendreMs, maintenant = () => Date.now() } = {}) {
  const { erreur, options: o } = analyserArguments(argv);
  if (erreur) return { code: SORTIE_USAGE, lignes: [`✗ ${erreur}`, USAGE] };
  const fin = maintenant() + o.attendre * 1000;
  let r;
  for (;;) {
    let texte;
    try {
      texte = lire(o);
    } catch (e) {
      return { code: SORTIE_USAGE, lignes: [`✗ lecture des logs impossible : ${e?.message ?? e}`] };
    }
    r = extraireExecution(texte, { conteneur: o.conteneur, depuis: o.depuisMs, commande: o.commande, maintenant: maintenant() });
    if (r.etat === 'arrete' || r.etat === 'ambigu' || maintenant() >= fin) break;
    await pause(GRACE_MS);
  }
  const note = [
    ...(r.ecartees ? [`— ${r.ecartees} ligne(s) de ${o.conteneur} datée(s) d’avant --depuis écartée(s) (numéro recyclé).`] : []),
    ...(r.avantDemarrage ? [`— ${r.avantDemarrage} ligne(s) de sortie datée(s) entre --depuis et le démarrage, non rendue(s).`] : []),
    ...(r.apresArret ? [`— ${r.apresArret} ligne(s) du même nom datée(s) plus d’1 s après l’arrêt, non rendue(s) (réemploi du numéro ?).`] : []),
  ];
  if (r.etat === 'absent') return { code: SORTIE_ABSENT, lignes: [`✗ ${r.motif}. Rien n’est rendu.`, ...note] };
  if (r.etat === 'ambigu') return { code: SORTIE_AMBIGU, lignes: [`✗ ambigu : ${r.motif}. Rien n’est rendu.`, ...note] };
  const tete = {
    arrete: `✓ ${o.conteneur} (${r.id}) démarré et arrêté depuis --depuis : sortie complète dans la fenêtre lue.`,
    arret_recent: `… ${o.conteneur} (${r.id}) arrêté il y a moins de ${GRACE_MS / 1000} s : les dernières lignes peuvent manquer, relire (si l’état persiste, l’horloge locale retarde sur Scalingo).`,
    en_cours: `… ${o.conteneur} (${r.id}) démarré, pas encore arrêté dans la fenêtre lue : sortie partielle, relire.`,
  }[r.etat];
  return { code: r.etat === 'arrete' ? SORTIE_ARRETE : SORTIE_EN_COURS, lignes: [tete, ...note, ...r.lignes] };
}

const direct = process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
if (direct) {
  const { code, lignes } = await executer(process.argv.slice(2));
  console.log(lignes.join('\n'));
  process.exitCode = code;
}
