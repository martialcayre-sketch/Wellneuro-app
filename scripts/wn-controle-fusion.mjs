#!/usr/bin/env node
// Contrôle avant merge sur l'arbre fusionné (D-373 §4). LECTURE SEULE pour le
// dépôt : ni checkout, ni merge, ni push. Une seule ref bouge, `origin/main`,
// par `git fetch` (avec `FETCH_HEAD`) ; `git merge-tree --write-tree` écrit des
// objets d'arbre, jamais une ref ; le seul fichier écrit est le cache, sous le
// répertoire Git commun.
//
//   node scripts/wn-controle-fusion.mjs <N> [--source <dossier>]
//
// `--source` : la copie qui prête `node_modules` et le client Prisma généré
// (par défaut, ce dépôt). Une copie sans `node_modules` rend « indéterminé ».
//
// QUAND IL JOUE. Seulement si `main` a bougé depuis la base de la PR. La base
// retenue est l'ancêtre commun de la tête et de `main` : le vert d'une PR
// porte sur une base au moins aussi récente, jamais plus ancienne — le
// contrôle joue donc parfois sans nécessité, jamais à tort en moins. Il ne lit
// pas l'état du CI de `main` : une PR qui répare `main` passe sans `main` vert.
//
// CE QU'IL JOUE. L'arbre fusionné (`main` + tête) : un conflit est un défaut,
// et un conflit que GitHub voit (`mergeable` à faux) aussi — `merge-tree`
// applique `merge=union` de `.gitattributes`, GitHub non. Puis, si l'empreinte
// d'environnement concorde (verrou installé, schéma du client Prisma), les
// gardes rapides de la liste explicite, sur l'arbre extrait par `git archive`
// dans un dossier temporaire indexé (quelques bancs lisent `git ls-files` ou
// `git grep`). La numérotation y joue en mode local : sans base de PR, la
// vérification « décision supprimée » du CI n'y est pas.
//
// UN ROUGE NE SUFFIT PAS. Rejoué seul sur l'arbre fusionné, il doit le rester
// (sinon : instable, indéterminé) ; puis rejoué dans les mêmes conditions sur
// `main` seul. Vert sur `main`, ou absent de `main` : défaut. Rouge des deux
// côtés : défaut seulement s'il porte un test ou une violation de plus que sur
// `main` — sinon préexistant, non imputable, et une PR de réparation passe.
//
// CACHE. Un verdict déterminé (sain ou défaut confirmé) est gardé par couple
// (`main`, tête) et par version du script ; un sha qui change l'invalide.
// « Indéterminé » ne se met jamais en cache.
//
// CODES DE SORTIE — `0` seul autorise le merge :
//   0 sain (ou contrôle non requis) · 1 défaut · 2 indéterminé · 3 usage.

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');

export const SORTIE_SAIN = 0;
export const SORTIE_DEFAUT = 1;
export const SORTIE_INDETERMINE = 2;
export const SORTIE_USAGE = 3;

/**
 * Les gardes rapides de D-373 §4, sur liste explicite : numérotation du
 * registre, matrice de consommation, invariants du CI. Lancés par `node`
 * depuis la racine de l'arbre extrait. `sansVerdict` : codes de sortie qui
 * disent « je ne peux pas juger » (le refus d'être vert de la numérotation).
 */
export const GARDES_NODE = [
  { id: 'numerotation', args: ['scripts/lib/decisions-numerotation.mjs'], sansVerdict: [2] },
  { id: 'matrice', args: ['--test', '--test-reporter=tap', 'scripts/wn-matrice-consommation.test.mjs'], sansVerdict: [] },
  { id: 'invariants-ci', args: ['--test', '--test-reporter=tap', 'scripts/ci-invariants.test.mjs'], sansVerdict: [] },
];

/** Les bancs `*.guard.test.*` que Vitest collecte (son `include`, `web/vitest.config.ts`). */
export const MOTIF_GUARD = /^web\/(src\/.+\.guard\.test\.tsx?|prisma\/.+\.guard\.test\.ts)$/;

/**
 * Les bancs de balayage hors `*.guard.test.*` : ils parcourent une
 * arborescence, et une PR qui y ajoute un fichier peut rougir avec une autre
 * qui ajoute le banc (#1594 et #1590, le 2026-10-20). Un banc exige que tout
 * banc Vitest qui appelle `readdirSync` soit ici ou soit un `guard`.
 */
export const BANCS_BALAYAGE = [
  'web/src/lib/biology-library/candidatsNabm.test.ts',
  'web/src/lib/biology-library/compositionsPreparees.test.ts',
  'web/src/lib/biology-library/import/resolverLibellesV1.test.ts',
  'web/src/lib/biology-library/nonIndiquesBibliotheque.test.ts',
  'web/src/lib/fiches-usage/ficheUsageBesoin2V1.test.ts',
  'web/src/lib/observability/masquageChemin.routes.test.ts',
  'web/src/lib/patient/texteMineurs.test.ts',
  'web/src/lib/praticien/relectureNote.test.ts',
  'web/src/lib/protocol/adhesion.test.ts',
  'web/src/lib/protocol/trajectoireIntentions.test.ts',
  'web/src/lib/questionnaire-display.test.ts',
  'web/src/lib/supplement-library/uniteDosesVerrou.test.ts',
];

/** Toute modification du script — liste ou logique — invalide le cache. */
export const VERSION_SCRIPT = createHash('sha256').update(readFileSync(fileURLToPath(import.meta.url))).digest('hex').slice(0, 12);

const DELAI_NODE_MS = 3 * 60 * 1000;
const DELAI_VITEST_MS = 15 * 60 * 1000;
const PREFIXE_TMP = 'wn-controle-fusion-';
const PURGE_MS = 6 * 60 * 60 * 1000;
const TAMPON = 256 * 1024 * 1024;

// ── Empreinte d'environnement ───────────────────────────────────────────────

/**
 * Écarts entre le verrou de l'arbre (`package-lock.json`) et ce qui est
 * installé (`node_modules/.package-lock.json`, écrit par npm). Une dépendance
 * optionnelle absente est normale (paquets d'une autre plateforme).
 */
export function comparerVerrous(verrou, installe) {
  const attendus = verrou?.packages ?? {};
  const presents = installe?.packages ?? {};
  const ecarts = [];
  for (const [cle, p] of Object.entries(presents)) {
    const a = attendus[cle];
    if (!a) ecarts.push(`${cle} installé, absent du verrou`);
    else if (a.version !== p.version || (a.integrity ?? null) !== (p.integrity ?? null)) {
      ecarts.push(`${cle} installé en ${p.version ?? '?'}, verrou en ${a.version ?? '?'}`);
    }
  }
  for (const [cle, a] of Object.entries(attendus)) {
    if (cle === '' || presents[cle] || a.optional || a.devOptional) continue;
    ecarts.push(`${cle} absent de node_modules`);
  }
  return ecarts;
}

/**
 * L'empreinte (D-373 §4 : verrou, client Prisma). `verrouInstalle` : `null`
 * si `node_modules` manque, `undefined` s'il est là sans le verrou caché de
 * npm. `schemaArbre`, `schemaSource` : oid du schéma dans l'arbre et dans la
 * copie source. `client` : `{ present, aJour }`, le client généré n'étant pas
 * plus ancien que le schéma de la source.
 */
export function ecartsEnvironnement({ verrouArbre, verrouInstalle, schemaArbre, schemaSource, client }) {
  if (verrouInstalle === null) return ['node_modules absent de la copie source'];
  if (verrouInstalle === undefined) return ['node_modules sans node_modules/.package-lock.json dans la copie source (`npm ci`)'];
  const ecarts = comparerVerrous(verrouArbre, verrouInstalle);
  const resume = ecarts.length > 3 ? [...ecarts.slice(0, 3), `… ${ecarts.length - 3} autre(s)`] : ecarts;
  if (schemaArbre !== schemaSource) resume.push('schéma Prisma de l’arbre différent de celui de la copie source');
  if (!client.present) resume.push('client Prisma absent de la copie source');
  else if (!client.aJour) resume.push('client Prisma plus ancien que le schéma de la copie source (`npx prisma generate`)');
  return resume;
}

// ── Gardes ──────────────────────────────────────────────────────────────────

/** Les bancs Vitest à jouer dans un arbre, d'après la liste de ses fichiers. */
export function bancsVitest(fichiers) {
  const presents = new Set(fichiers);
  return [...new Set([...fichiers.filter((f) => MOTIF_GUARD.test(f)), ...BANCS_BALAYAGE.filter((f) => presents.has(f))])].sort();
}

/**
 * Ce qui rougit dans la sortie d'un garde `node` : les tests `not ok` (TAP),
 * les violations `✗` de la numérotation, sans leur numéro de ligne — une
 * décision ajoutée en tête décale les lignes d'une violation préexistante.
 */
export function signaturesNode(sortie) {
  const s = new Set();
  for (const ligne of String(sortie ?? '').split('\n')) {
    const tap = /^\s*not ok \d+ - (.+)$/.exec(ligne);
    if (tap) s.add(`test : ${tap[1].trim()}`);
    else if (ligne.startsWith('✗ ')) s.add(ligne.replace(/(\.md):\d+/g, '$1').trim());
  }
  return [...s].sort();
}

/**
 * Lit le rapport JSON de Vitest : un état et des signatures (assertions en
 * échec) par banc attendu. Indéterminé : un banc absent du rapport (Vitest
 * ignore sans erreur un filtre qui ne correspond à rien), ou tout banc sans
 * échec quand Vitest sort en erreur sans en nommer aucun — une erreur hors
 * test laisse le fichier « passed » dans le rapport.
 */
export function lireRapportVitest(rapport, attendus, dossier, code) {
  const vus = new Map();
  for (const r of rapport?.testResults ?? []) vus.set(relative(dossier, r.name).split('\\').join('/'), r);
  const etats = new Map();
  for (const f of attendus) {
    const r = vus.get(f);
    if (!r || (r.status !== 'passed' && r.status !== 'failed')) {
      etats.set(`vitest:${f}`, { etat: 'indetermine', signatures: [] });
      continue;
    }
    const enEchec = (r.assertionResults ?? []).filter((a) => a.status === 'failed').map((a) => `test : ${a.fullName ?? a.title}`);
    if (r.status === 'passed') {
      // Vert sans aucune assertion réussie (tout sauté) : rien n'est prouvé
      // (revue CodeRabbit de #1753 ; aucun banc dans ce cas le 2026-10-28).
      const prouve = (r.assertionResults ?? []).some((a) => a.status === 'passed');
      etats.set(`vitest:${f}`, prouve ? { etat: 'ok', signatures: [] } : { etat: 'indetermine', signatures: [] });
    } else etats.set(`vitest:${f}`, { etat: 'echec', signatures: enEchec.length ? [...new Set(enEchec)].sort() : ['(fichier)'] });
  }
  const aucunEchec = [...etats.values()].every((e) => e.etat !== 'echec');
  if ((code !== 0 || rapport?.success === false) && aucunEchec) {
    for (const id of etats.keys()) etats.set(id, { etat: 'indetermine', signatures: [] });
  }
  return etats;
}

/**
 * Joue les gardes dans `dossier` (arbre extrait). `seulement` : ids à
 * rejouer, ou `null` pour tous. `executer(cmd, args, { cwd, timeout })` rend
 * `{ code, signal, erreur, sortie }`. Rend une Map id → `{ etat, signatures }`,
 * `etat` valant 'ok', 'echec' ou 'indetermine'.
 */
export function jouerGardes({ dossier, vitest, seulement = null, executer, lireFichier }) {
  const etats = new Map();
  const voulu = (id) => seulement === null || seulement.includes(id);
  for (const g of GARDES_NODE) {
    if (!voulu(g.id)) continue;
    const r = executer('node', g.args, { cwd: dossier, timeout: DELAI_NODE_MS });
    if (r.erreur || r.signal || r.code === null || g.sansVerdict.includes(r.code)) etats.set(g.id, { etat: 'indetermine', signatures: [] });
    else if (r.code === 0) etats.set(g.id, { etat: 'ok', signatures: [] });
    else {
      const s = signaturesNode(r.sortie);
      etats.set(g.id, { etat: 'echec', signatures: s.length ? s : ['(sans détail)'] });
    }
  }
  const bancs = vitest.filter((f) => voulu(`vitest:${f}`));
  if (bancs.length > 0) {
    const sortie = join(dossier, '.wn-vitest.json');
    rmSync(sortie, { force: true });
    // `--no-cache` : Vitest écrirait sinon son cache dans le `node_modules`
    // relié, c'est-à-dire dans la copie source.
    const r = executer(
      'node',
      ['node_modules/vitest/vitest.mjs', 'run', '--no-cache', '--reporter=json', `--outputFile=${sortie}`, ...bancs.map((f) => f.slice('web/'.length))],
      { cwd: join(dossier, 'web'), timeout: DELAI_VITEST_MS },
    );
    let rapport = null;
    if (!r.erreur && !r.signal) {
      try {
        rapport = JSON.parse(lireFichier(sortie));
      } catch {
        rapport = null;
      }
    }
    for (const [id, e] of lireRapportVitest(rapport, bancs, dossier, r.code)) etats.set(id, e);
  }
  return etats;
}

// ── Verdict ─────────────────────────────────────────────────────────────────

const liste = (xs) => `${xs.slice(0, 5).join(', ')}${xs.length > 5 ? `, … (${xs.length})` : ''}`;

/**
 * Le verdict. `conflits` : chemins en conflit (vide sinon). `fusionne` : Map
 * id → `{ etat, signatures }` sur l'arbre fusionné, les rouges déjà confirmés
 * (`etat` 'instable' : rouge puis vert au rejeu). `principal` : les rouges
 * rejoués sur `main` seul. `absents` : rouges sans équivalent sur `main`.
 * Rend `{ code, motif, notes, preexistants }`.
 */
export function juger({ conflits = [], fusionne = new Map(), principal = new Map(), absents = new Set() }) {
  if (conflits.length > 0) {
    return { code: SORTIE_DEFAUT, motif: `l'arbre fusionné est en conflit sur ${conflits.length} chemin(s) : ${liste(conflits)}.`, notes: [], preexistants: 0 };
  }
  const imputables = [];
  const preexistants = [];
  const incertains = [];
  for (const [id, e] of fusionne) {
    if (e.etat === 'indetermine' || e.etat === 'instable') {
      incertains.push(e.etat === 'instable' ? `${id} (instable)` : id);
      continue;
    }
    if (e.etat !== 'echec') continue;
    if (absents.has(id)) {
      imputables.push(`${id} (absent de main)`);
      continue;
    }
    const p = principal.get(id);
    if (!p || p.etat === 'indetermine' || p.etat === 'instable') incertains.push(`${id} (main non rejoué)`);
    else if (p.etat === 'ok') imputables.push(id);
    else {
      const neuves = e.signatures.filter((s) => !p.signatures.includes(s));
      if (neuves.length > 0) imputables.push(`${id} (${liste(neuves)})`);
      else preexistants.push(id);
    }
  }
  const notes = preexistants.length > 0 ? [`garde(s) rouge(s) à l'identique sur main seul, non imputable(s) à la PR : ${liste(preexistants)}.`] : [];
  const n = preexistants.length;
  if (imputables.length > 0) {
    return { code: SORTIE_DEFAUT, motif: `${imputables.length} garde(s) rouge(s) sur l'arbre fusionné, imputable(s) à la PR : ${liste(imputables)}.`, notes, preexistants: n };
  }
  if (incertains.length > 0) {
    return {
      code: SORTIE_INDETERMINE,
      motif: `indéterminé — ${incertains.length} garde(s) sans verdict (délai, lancement, rapport illisible, rouge instable ou main non rejoué) : ${liste(incertains)}.`,
      notes,
      preexistants: n,
    };
  }
  return { code: SORTIE_SAIN, motif: `arbre fusionné sans conflit, ${fusionne.size} garde(s) jouée(s)${n ? ', aucun défaut imputable' : ', toutes vertes'}.`, notes, preexistants: n };
}

// ── Collecte ────────────────────────────────────────────────────────────────

/** Extrait `arbre` dans `dossier` (archive, sans checkout), l'indexe, et y relie les dépendances de `source`. */
export function materialiser({ racine, arbre, dossier, source }) {
  const extraire = spawnSync('bash', ['-o', 'pipefail', '-c', 'git -C "$1" archive --format=tar "$2" | tar -x -C "$3"', '_', racine, arbre, dossier], {
    stdio: ['ignore', 'ignore', 'pipe'],
    encoding: 'utf8',
  });
  if (extraire.status !== 0) throw new Error(`extraction de l'arbre impossible : ${(extraire.stderr ?? '').trim().split('\n')[0]}`);
  // `-f` : l'archive ne porte que des fichiers suivis, ignorés compris
  // (`.env.example`) ; l'index doit les porter tous.
  for (const args of [['init', '--quiet'], ['add', '-A', '-f']]) {
    const r = spawnSync('git', args, { cwd: dossier, stdio: ['ignore', 'ignore', 'pipe'], encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`git ${args[0]} dans l'arbre extrait : ${(r.stderr ?? '').trim().split('\n')[0]}`);
  }
  // Un dossier parent suivi comme lien symbolique ferait poser les liens
  // hors du dossier temporaire.
  for (const parent of ['web', 'web/src', 'web/src/generated']) {
    const chemin = join(dossier, parent);
    if (existsSync(chemin) && !lstatSync(chemin).isDirectory()) throw new Error(`${parent} n'est pas un dossier dans l'arbre extrait`);
  }
  for (const lien of ['web/node_modules', 'web/src/generated/prisma']) {
    if (existsSync(join(dossier, lien))) throw new Error(`${lien} est suivi dans l'arbre : rien n'y sera relié`);
  }
  // Reliés APRÈS l'index : ni l'un ni l'autre n'entre dans `git ls-files`.
  symlinkSync(join(source, 'web/node_modules'), join(dossier, 'web/node_modules'));
  mkdirSync(join(dossier, 'web/src/generated'), { recursive: true });
  symlinkSync(join(source, 'web/src/generated/prisma'), join(dossier, 'web/src/generated/prisma'));
}

/** Retire les dossiers temporaires d'un contrôle interrompu (signal, arrêt). */
export function purgerAnciens(racineTmp = tmpdir(), maintenant = Date.now()) {
  let entrees = [];
  try {
    entrees = readdirSync(racineTmp);
  } catch {
    return;
  }
  for (const nom of entrees) {
    if (!nom.startsWith(PREFIXE_TMP)) continue;
    const chemin = join(racineTmp, nom);
    try {
      if (maintenant - lstatSync(chemin).mtimeMs > PURGE_MS) rmSync(chemin, { recursive: true, force: true });
    } catch {
      // Un autre contrôle le retire au même instant : rien à faire.
    }
  }
}

/** Le cache par fichier, sous le répertoire Git commun (partagé par les worktrees). */
export function cacheFichiers(dossier) {
  if (dossier === null) return { lire: () => null, ecrire: () => {} };
  return {
    lire(cle) {
      try {
        return JSON.parse(readFileSync(join(dossier, `${cle}.json`), 'utf8'));
      } catch {
        return null;
      }
    },
    ecrire(cle, verdict) {
      try {
        mkdirSync(dossier, { recursive: true });
        const tmp = join(dossier, `.${cle}.${process.pid}.tmp`);
        writeFileSync(tmp, JSON.stringify(verdict));
        renameSync(tmp, join(dossier, `${cle}.json`));
      } catch {
        // Un cache non écrit coûte un rejeu, jamais un verdict.
      }
    },
  };
}

const premiereLigne = (err) => String(err?.message ?? err).split('\n')[0];
const erreurGit = (r) => (r.stderr ?? '').trim().split('\n')[0];

/** Lit l'empreinte de l'environnement que prête `source`, pour `arbre`. */
function lireEnvironnement({ git, arbre, source }) {
  const lire = (args) => {
    const r = git(args);
    if (r.code !== 0) throw new Error(`git ${args.join(' ')} : ${erreurGit(r)}`);
    return r.stdout;
  };
  const modules = join(source, 'web/node_modules');
  const installe = join(modules, '.package-lock.json');
  const schema = join(source, 'web/prisma/schema.prisma');
  const client = join(source, 'web/src/generated/prisma/index.js');
  return ecartsEnvironnement({
    verrouArbre: JSON.parse(lire(['show', `${arbre}:web/package-lock.json`])),
    verrouInstalle: !existsSync(modules) ? null : existsSync(installe) ? JSON.parse(readFileSync(installe, 'utf8')) : undefined,
    schemaArbre: lire(['rev-parse', `${arbre}:web/prisma/schema.prisma`]).trim(),
    schemaSource: existsSync(schema) ? lire(['hash-object', schema]).trim() : null,
    client: existsSync(client)
      ? { present: true, aJour: existsSync(schema) && statSync(client).mtimeMs >= statSync(schema).mtimeMs }
      : { present: false, aJour: false },
  });
}

/**
 * Collecte puis juge. Dépendances injectées : `lireJson(chemin)` (un objet de
 * l'API), `git(args)` qui rend `{ code, stdout, stderr }` sans lever,
 * `executer` (voir `jouerGardes`), `cache` (`lire`, `ecrire`), `materialiser`,
 * `maintenant()` en millisecondes. Rend `{ code, lignes }`.
 */
export function controler({ pr, racine, source, lireJson, git, executer, cache, materialiser: extraire = materialiser, maintenant = Date.now }) {
  const debut = maintenant();
  const lignes = [];
  let main = null;
  let tete = null;
  let requis = false;
  let rouges = 0;
  const fin = (code, motif, { notes = [], enCache = false, preexistants = 0 } = {}) => {
    lignes.push(`${code === SORTIE_SAIN ? '✓' : '❌'} ${motif}`);
    for (const n of notes) lignes.push(`· ${n}`);
    const duree = ((maintenant() - debut) / 1000).toFixed(1);
    lignes.push(
      `CONTROLE fusion code=${code} pr=${pr}${main ? ` main=${main.slice(0, 8)}` : ''}${tete ? ` tete=${tete.slice(0, 8)}` : ''}` +
        ` requis=${requis ? 'oui' : 'non'} cache=${enCache ? 'oui' : 'non'} rouges=${rouges} preexistants=${preexistants} duree=${duree}s`,
    );
    return { code, lignes };
  };
  const indetermine = (motif) => fin(SORTIE_INDETERMINE, `indéterminé — ${motif}`);

  let mergeable;
  try {
    const p = lireJson(`repos/{owner}/{repo}/pulls/${pr}`);
    if (p.state !== 'open') return indetermine(`la PR #${pr} n'est pas ouverte (${p.state}).`);
    if (p.base?.ref !== 'main') return indetermine(`la PR #${pr} vise ${p.base?.ref}, pas main.`);
    if (!/^[0-9a-f]{40}$/.test(p.head?.sha ?? '')) throw new Error('tête de la PR illisible');
    tete = p.head.sha;
    mergeable = p.mergeable;
  } catch (err) {
    return indetermine(`lecture de la PR impossible : ${premiereLigne(err)}`);
  }
  for (const args of [['fetch', '--quiet', 'origin', 'main'], ['fetch', '--quiet', 'origin', `refs/pull/${pr}/head`]]) {
    const r = git(args);
    if (r.code !== 0) return indetermine(`git ${args.slice(2).join(' ')} : ${erreurGit(r)}`);
  }
  if (git(['cat-file', '-e', `${tete}^{commit}`]).code !== 0) {
    return indetermine(`la tête ${tete.slice(0, 8)} est absente du dépôt après le fetch (poussée entre-temps ?).`);
  }
  const lu = git(['rev-parse', 'origin/main']);
  if (lu.code !== 0) return indetermine(`origin/main illisible : ${erreurGit(lu)}`);
  main = lu.stdout.trim();
  const base = git(['merge-base', tete, main]);
  if (base.code !== 0) return indetermine('aucun ancêtre commun entre la tête et main.');
  if (base.stdout.trim() === main) return fin(SORTIE_SAIN, 'contrôle non requis : main n’a pas bougé depuis la base de la PR.');
  requis = true;
  if (mergeable === false) {
    // Avant le cache, et jamais mis en cache : GitHub recalcule `mergeable`
    // de façon asynchrone, et un « sain » gardé ne doit pas le masquer
    // (revue CodeRabbit de #1753). `merge-tree` applique `merge=union` de
    // `.gitattributes`, GitHub non.
    return fin(SORTIE_DEFAUT, 'GitHub signale un conflit (`mergeable` à faux) — `merge-tree` peut ne pas le voir, `merge=union` de `.gitattributes` ne jouant qu’en local.');
  }

  const cle = `${main}-${tete}-${VERSION_SCRIPT}`;
  const garde = cache.lire(cle);
  if (garde && (garde.code === SORTIE_SAIN || garde.code === SORTIE_DEFAUT)) {
    return fin(garde.code, `${garde.motif} (verdict en cache)`, { notes: garde.notes ?? [], enCache: true, preexistants: garde.preexistants ?? 0 });
  }
  const conclure = (verdict) => {
    if (verdict.code === SORTIE_SAIN || verdict.code === SORTIE_DEFAUT) cache.ecrire(cle, verdict);
    return fin(verdict.code, verdict.motif, verdict);
  };

  const fusion = git(['merge-tree', '--write-tree', '--name-only', '--no-messages', main, tete]);
  if (fusion.code !== 0 && fusion.code !== 1) return indetermine(`git merge-tree : ${erreurGit(fusion)}`);
  const [arbre, ...enConflit] = fusion.stdout.split('\n').filter(Boolean);
  if (fusion.code === 1) return conclure(juger({ conflits: [...new Set(enConflit)].sort() }));

  purgerAnciens();
  const dossiers = [];
  const extrait = (a) => {
    const d = realpathSync(mkdtempSync(join(tmpdir(), PREFIXE_TMP)));
    dossiers.push(d);
    extraire({ racine, arbre: a, dossier: d, source });
    return d;
  };
  const fichiersDe = (a) => {
    const r = git(['ls-tree', '-r', '--name-only', a]);
    if (r.code !== 0) throw new Error(`liste des fichiers de l'arbre illisible : ${erreurGit(r)}`);
    return r.stdout.split('\n').filter(Boolean);
  };
  const lireFichier = (f) => readFileSync(f, 'utf8');
  try {
    let ecarts;
    try {
      ecarts = lireEnvironnement({ git, arbre, source });
    } catch (err) {
      return indetermine(`empreinte d'environnement illisible : ${premiereLigne(err)}`);
    }
    if (ecarts.length > 0) {
      return indetermine(`l'environnement prêté par ${source} ne correspond pas à l'arbre fusionné : ${ecarts.join(' ; ')}.`);
    }
    let dossier;
    let vitest;
    let fusionne;
    try {
      vitest = bancsVitest(fichiersDe(arbre));
      dossier = extrait(arbre);
      fusionne = jouerGardes({ dossier, vitest, executer, lireFichier });
    } catch (err) {
      return indetermine(premiereLigne(err));
    }
    const echecs = [...fusionne].filter(([, e]) => e.etat === 'echec').map(([id]) => id);
    rouges = echecs.length;
    let principal = new Map();
    const absents = new Set();
    if (echecs.length > 0) {
      // Confirmation : chaque rouge rejoué seul sur l'arbre fusionné, dans
      // les conditions du rejeu sur `main` — un rouge de charge (délai sous
      // une autre suite) ne devient jamais un défaut. Puis `main` seul.
      try {
        const confirmes = jouerGardes({ dossier, vitest, seulement: echecs, executer, lireFichier });
        for (const id of echecs) {
          const c = confirmes.get(id);
          fusionne.set(id, c?.etat === 'ok' ? { etat: 'instable', signatures: [] } : c ?? { etat: 'indetermine', signatures: [] });
        }
        const tenus = echecs.filter((id) => fusionne.get(id).etat === 'echec');
        if (tenus.length > 0) {
          const lu = git(['rev-parse', `${main}^{tree}`]);
          if (lu.code !== 0) throw new Error(`arbre de main illisible : ${erreurGit(lu)}`);
          const arbreMain = lu.stdout.trim();
          const fichiersMain = fichiersDe(arbreMain);
          const vitestMain = bancsVitest(fichiersMain);
          const surMain = (id) => (id.startsWith('vitest:') ? vitestMain.includes(id.slice('vitest:'.length)) : fichiersMain.includes(GARDES_NODE.find((g) => g.id === id).args.at(-1)));
          for (const id of tenus) if (!surMain(id)) absents.add(id);
          const aRejouer = tenus.filter((id) => !absents.has(id));
          if (aRejouer.length > 0 && lireEnvironnement({ git, arbre: arbreMain, source }).length === 0) {
            principal = jouerGardes({ dossier: extrait(arbreMain), vitest: vitestMain, seulement: aRejouer, executer, lireFichier });
          }
        }
      } catch {
        // Contre-épreuve impossible : les rouges restent sans verdict.
      }
    }
    return conclure(juger({ fusionne, principal, absents }));
  } finally {
    // `rmSync` retire les liens symboliques, jamais leur cible.
    for (const d of dossiers) rmSync(d, { recursive: true, force: true });
  }
}

export function analyserArguments(argv) {
  const usage = { erreur: 'usage : node scripts/wn-controle-fusion.mjs <numéro de PR> [--source <dossier>]' };
  let pr = null;
  let source = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--source' && argv[i + 1] && source === null) source = argv[++i];
    else if (/^[1-9]\d*$/.test(argv[i]) && pr === null) pr = Number(argv[i]);
    else return usage;
  }
  return pr === null ? usage : { pr, source };
}

// ── Câblage CLI ─────────────────────────────────────────────────────────────

function principal(argv) {
  const args = analyserArguments(argv);
  if (args.erreur) {
    console.error(args.erreur);
    return SORTIE_USAGE;
  }
  const source = args.source === null ? RACINE : isAbsolute(args.source) ? args.source : resolve(args.source);
  const git = (a) => {
    const r = spawnSync('git', a, { cwd: RACINE, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: TAMPON });
    return { code: r.status, stdout: r.stdout ?? '', stderr: r.stderr || String(r.error ?? '') };
  };
  const commun = git(['rev-parse', '--git-common-dir']);
  const dossierCache = commun.code === 0 && commun.stdout.trim() ? join(resolve(RACINE, commun.stdout.trim()), 'wn-controle-fusion') : null;
  // Les gardes ne lisent ni GitHub ni l'évènement du CI : sans
  // `GITHUB_EVENT_NAME`, la numérotation reste locale.
  const env = { ...process.env };
  delete env.GITHUB_EVENT_NAME;
  const { code, lignes } = controler({
    pr: args.pr,
    racine: RACINE,
    source,
    lireJson: (chemin) => {
      const r = spawnSync('gh', ['api', chemin], { cwd: RACINE, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: TAMPON });
      if (r.status !== 0) throw new Error((r.stderr || String(r.error ?? 'gh en échec')).trim());
      return JSON.parse(r.stdout);
    },
    git,
    executer: (cmd, a, { cwd, timeout }) => {
      const r = spawnSync(cmd, a, { cwd, timeout, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: TAMPON });
      return { code: r.status, signal: r.signal, erreur: r.error ?? null, sortie: `${r.stdout ?? ''}\n${r.stderr ?? ''}` };
    },
    cache: cacheFichiers(dossierCache),
  });
  for (const l of lignes) console.log(l);
  return code;
}

// Chemin réel des deux côtés : lancé par un lien symbolique, le script doit
// juger, pas sortir en 0 sans rien dire.
const lanceDirectement = () => {
  try {
    return realpathSync(process.argv[1] ?? '') === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
};

if (lanceDirectement()) {
  process.exit(principal(process.argv.slice(2)));
}
