#!/usr/bin/env node
// Contrôle avant merge sur l'arbre fusionné (D-373 §4). LECTURE SEULE pour le
// dépôt : ni checkout, ni merge, ni push, aucune ref écrite. `git fetch` met à
// jour `origin/main` et `FETCH_HEAD` ; `git merge-tree --write-tree` écrit des
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
// CE QU'IL JOUE. L'arbre fusionné (`main` + tête) : un conflit est un défaut.
// Puis, si l'empreinte d'environnement concorde (verrou installé, schéma du
// client Prisma), les gardes rapides de la liste explicite, sur l'arbre extrait
// par `git archive` dans un dossier temporaire indexé (quelques bancs lisent
// `git ls-files` ou `git grep`). Un garde rouge sur l'arbre fusionné est rejoué
// sur `main` seul : rouge des deux côtés, il est préexistant, non imputable à
// la PR — sinon une PR de réparation partielle serait refusée à tort.
//
// CACHE. Un verdict déterminé (sain ou défaut) est gardé par couple
// (`main`, tête) et par version de la liste ; un sha qui change l'invalide.
// « Indéterminé » ne se met jamais en cache.
//
// CODES DE SORTIE — `0` seul autorise le merge :
//   0 sain (ou contrôle non requis) · 1 défaut · 2 indéterminé · 3 usage.

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
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
 * depuis la racine de l'arbre extrait.
 */
export const GARDES_NODE = [
  { id: 'numerotation', args: ['scripts/lib/decisions-numerotation.mjs'] },
  { id: 'matrice', args: ['--test', 'scripts/wn-matrice-consommation.test.mjs'] },
  { id: 'invariants-ci', args: ['--test', 'scripts/ci-invariants.test.mjs'] },
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

/** Toute modification de la liste invalide le cache. */
export const VERSION_LISTE = createHash('sha256')
  .update(JSON.stringify({ GARDES_NODE, motif: MOTIF_GUARD.source, BANCS_BALAYAGE }))
  .digest('hex')
  .slice(0, 12);

const DELAI_NODE_MS = 3 * 60 * 1000;
const DELAI_VITEST_MS = 15 * 60 * 1000;
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
 * L'empreinte (D-373 §4 : verrou, client Prisma). `verrouInstalle` `null` :
 * pas de `node_modules`. `schemaArbre`, `schemaSource` : oid du schéma dans
 * l'arbre et dans la copie source. `client` : `{ present, aJour }`, le client
 * généré n'étant pas plus ancien que le schéma de la source.
 */
export function ecartsEnvironnement({ verrouArbre, verrouInstalle, schemaArbre, schemaSource, client }) {
  if (verrouInstalle === null) return ['node_modules absent de la copie source'];
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
 * Lit le rapport JSON de Vitest : un état par banc attendu. Un banc absent du
 * rapport est « indéterminé » — Vitest ignore sans erreur un filtre qui ne
 * correspond à rien.
 */
export function lireRapportVitest(rapport, attendus, dossier) {
  const etats = new Map();
  const vus = new Map();
  for (const r of rapport?.testResults ?? []) vus.set(relative(dossier, r.name).split('\\').join('/'), r.status);
  for (const f of attendus) {
    const s = vus.get(f);
    etats.set(`vitest:${f}`, s === 'passed' ? 'ok' : s === 'failed' ? 'echec' : 'indetermine');
  }
  return etats;
}

/**
 * Joue les gardes dans `dossier` (arbre extrait). `seulement` : ids à
 * rejouer, ou `null` pour tous. `executer(cmd, args, { cwd, timeout })` rend
 * `{ code, signal, erreur }`. Rend une Map id → 'ok' | 'echec' | 'indetermine'.
 */
export function jouerGardes({ dossier, vitest, seulement = null, executer, lireFichier }) {
  const etats = new Map();
  const voulu = (id) => seulement === null || seulement.includes(id);
  for (const g of GARDES_NODE) {
    if (!voulu(g.id)) continue;
    const r = executer('node', g.args, { cwd: dossier, timeout: DELAI_NODE_MS });
    etats.set(g.id, r.erreur || r.signal || r.code === null ? 'indetermine' : r.code === 0 ? 'ok' : 'echec');
  }
  const bancs = vitest.filter((f) => voulu(`vitest:${f}`));
  if (bancs.length > 0) {
    const sortie = join(dossier, '.wn-vitest.json');
    const r = executer(
      'node',
      ['node_modules/vitest/vitest.mjs', 'run', '--reporter=json', `--outputFile=${sortie}`, ...bancs.map((f) => f.slice('web/'.length))],
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
    for (const [id, e] of lireRapportVitest(rapport, bancs, dossier)) etats.set(id, e);
  }
  return etats;
}

// ── Verdict ─────────────────────────────────────────────────────────────────

const liste = (xs) => `${xs.slice(0, 5).join(', ')}${xs.length > 5 ? `, … (${xs.length})` : ''}`;

/**
 * Le verdict. `conflits` : chemins en conflit (vide sinon). `fusionne` : états
 * des gardes sur l'arbre fusionné. `principal` : états des gardes rouges
 * rejoués sur `main` seul (absents : non rejoués).
 */
export function juger({ conflits = [], fusionne = new Map(), principal = new Map() }) {
  if (conflits.length > 0) {
    return { code: SORTIE_DEFAUT, motif: `l'arbre fusionné est en conflit sur ${conflits.length} chemin(s) : ${liste(conflits)}.`, notes: [] };
  }
  const echecs = [...fusionne].filter(([, e]) => e === 'echec').map(([id]) => id);
  const imputables = echecs.filter((id) => principal.get(id) === 'ok');
  const preexistants = echecs.filter((id) => principal.get(id) === 'echec');
  const incertains = [
    ...[...fusionne].filter(([, e]) => e === 'indetermine').map(([id]) => id),
    ...echecs.filter((id) => !imputables.includes(id) && !preexistants.includes(id)),
  ];
  const notes = preexistants.length > 0 ? [`garde(s) rouge(s) aussi sur main seul, non imputable(s) à la PR : ${liste(preexistants)}.`] : [];
  if (imputables.length > 0) {
    return { code: SORTIE_DEFAUT, motif: `${imputables.length} garde(s) rouge(s) sur l'arbre fusionné, vert(s) sur main seul : ${liste(imputables)}.`, notes };
  }
  if (incertains.length > 0) {
    return { code: SORTIE_INDETERMINE, motif: `indéterminé — ${incertains.length} garde(s) sans verdict (délai, lancement, rapport illisible ou main non rejoué) : ${liste(incertains)}.`, notes };
  }
  return { code: SORTIE_SAIN, motif: `arbre fusionné sans conflit, ${fusionne.size} garde(s) jouée(s)${preexistants.length ? ', aucun défaut imputable' : ', toutes vertes'}.`, notes };
}

// ── Collecte ────────────────────────────────────────────────────────────────

/** Extrait `arbre` dans `dossier` (archive, sans checkout), l'indexe, et y relie les dépendances de `source`. */
export function materialiser({ racine, arbre, dossier, source }) {
  const extraire = spawnSync('bash', ['-o', 'pipefail', '-c', 'git -C "$1" archive --format=tar "$2" | tar -x -C "$3"', '_', racine, arbre, dossier], {
    stdio: ['ignore', 'ignore', 'pipe'],
    encoding: 'utf8',
  });
  if (extraire.status !== 0) throw new Error(`extraction de l'arbre impossible : ${(extraire.stderr ?? '').trim().split('\n')[0]}`);
  for (const args of [['init', '--quiet'], ['add', '-A']]) {
    const r = spawnSync('git', args, { cwd: dossier, stdio: ['ignore', 'ignore', 'pipe'], encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`git ${args[0]} dans l'arbre extrait : ${(r.stderr ?? '').trim().split('\n')[0]}`);
  }
  // Reliés APRÈS l'index : ni l'un ni l'autre n'entre dans `git ls-files`.
  symlinkSync(join(source, 'web/node_modules'), join(dossier, 'web/node_modules'));
  mkdirSync(join(dossier, 'web/src/generated'), { recursive: true });
  symlinkSync(join(source, 'web/src/generated/prisma'), join(dossier, 'web/src/generated/prisma'));
}

/** Le cache par fichier, sous le répertoire Git commun (partagé par les worktrees). */
export function cacheFichiers(dossier) {
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
  const installe = join(source, 'web/node_modules/.package-lock.json');
  const schema = join(source, 'web/prisma/schema.prisma');
  const client = join(source, 'web/src/generated/prisma/index.js');
  return ecartsEnvironnement({
    verrouArbre: JSON.parse(lire(['show', `${arbre}:web/package-lock.json`])),
    verrouInstalle: existsSync(installe) ? JSON.parse(readFileSync(installe, 'utf8')) : null,
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
  const fin = (code, motif, { notes = [], enCache = false } = {}) => {
    lignes.push(`${code === SORTIE_SAIN ? '✓' : '❌'} ${motif}`);
    for (const n of notes) lignes.push(`· ${n}`);
    const duree = ((maintenant() - debut) / 1000).toFixed(1);
    lignes.push(
      `CONTROLE fusion code=${code} pr=${pr}${main ? ` main=${main.slice(0, 8)}` : ''}${tete ? ` tete=${tete.slice(0, 8)}` : ''} cache=${enCache ? 'oui' : 'non'} duree=${duree}s`,
    );
    return { code, lignes };
  };
  const indetermine = (motif) => fin(SORTIE_INDETERMINE, `indéterminé — ${motif}`);

  try {
    const p = lireJson(`repos/{owner}/{repo}/pulls/${pr}`);
    if (p.state !== 'open') return indetermine(`la PR #${pr} n'est pas ouverte (${p.state}).`);
    if (p.base?.ref !== 'main') return indetermine(`la PR #${pr} vise ${p.base?.ref}, pas main.`);
    if (!/^[0-9a-f]{40}$/.test(p.head?.sha ?? '')) throw new Error('tête de la PR illisible');
    tete = p.head.sha;
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

  const cle = `${main}-${tete}-${VERSION_LISTE}`;
  const garde = cache.lire(cle);
  if (garde && (garde.code === SORTIE_SAIN || garde.code === SORTIE_DEFAUT)) {
    return fin(garde.code, `${garde.motif} (verdict en cache)`, { notes: garde.notes ?? [], enCache: true });
  }
  const conclure = (verdict) => {
    if (verdict.code === SORTIE_SAIN || verdict.code === SORTIE_DEFAUT) cache.ecrire(cle, verdict);
    return fin(verdict.code, verdict.motif, { notes: verdict.notes });
  };

  const fusion = git(['merge-tree', '--write-tree', '--name-only', '--no-messages', main, tete]);
  if (fusion.code !== 0 && fusion.code !== 1) return indetermine(`git merge-tree : ${erreurGit(fusion)}`);
  const [arbre, ...enConflit] = fusion.stdout.split('\n').filter(Boolean);
  if (fusion.code === 1) return conclure(juger({ conflits: [...new Set(enConflit)].sort() }));

  const dossiers = [];
  const extrait = (a) => {
    const d = realpathSync(mkdtempSync(join(tmpdir(), 'wn-controle-fusion-')));
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
    let fusionne;
    try {
      fusionne = jouerGardes({ dossier: extrait(arbre), vitest: bancsVitest(fichiersDe(arbre)), executer, lireFichier });
    } catch (err) {
      return indetermine(premiereLigne(err));
    }
    const rouges = [...fusionne].filter(([, e]) => e === 'echec').map(([id]) => id);
    let principal = new Map();
    if (rouges.length > 0) {
      // Rejeu sur `main` seul, avec la même exigence d'empreinte ; une lecture
      // impossible laisse les rouges sans contre-épreuve : indéterminé.
      try {
        const arbreMain = git(['rev-parse', `${main}^{tree}`]).stdout.trim();
        if (lireEnvironnement({ git, arbre: arbreMain, source }).length === 0) {
          principal = jouerGardes({ dossier: extrait(arbreMain), vitest: bancsVitest(fichiersDe(arbreMain)), seulement: rouges, executer, lireFichier });
        }
      } catch {
        principal = new Map();
      }
    }
    return conclure(juger({ fusionne, principal }));
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
  const commun = git(['rev-parse', '--git-common-dir']).stdout.trim();
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
      const r = spawnSync(cmd, a, { cwd, timeout, env, stdio: 'ignore' });
      return { code: r.status, signal: r.signal, erreur: r.error ?? null };
    },
    cache: cacheFichiers(join(isAbsolute(commun) ? commun : join(RACINE, commun), 'wn-controle-fusion')),
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
