#!/usr/bin/env node
// Guetteur borné : trois sondes de suivi, appelées en tâche de fond pour être
// prévenu au lieu de sonder à la main (lot `autonomie-sondes-et-messages`,
// cadrage « autonomie des sessions », 2026-11-13). LECTURE SEULE : `gh` en GET.
// Il ne merge pas, n'approuve pas, n'écrit nulle part, sauf `--amorcer` dans
// le fichier que l'appelant lui donne.
//
// Versé au dépôt depuis le guetteur de l'intégrateur, qui vivait hors dépôt
// sans banc versionné (H89, corrigé le 2026-10-31 après des déclarations
// manquées). La sonde `prete` en reprend le motif et la clé à l'identique.
//
//   node scripts/wn-guetteur.mjs prete <traitees.txt> [--iter N] [--pas S]
//   node scripts/wn-guetteur.mjs prete --amorcer <traitees.txt>
//   node scripts/wn-guetteur.mjs merge <N> [--iter N] [--pas S]
//   node scripts/wn-guetteur.mjs release-db [--ignorer id,id] [--iter N] [--pas S]
//   (`--iter` : nombre de lectures, 45 par défaut ; `--pas` : secondes entre
//   deux lectures, 60 par défaut. Une passe dure donc au plus 45 minutes.)
//
// LES SONDES
// - `prete` (intégrateur) : chaque déclaration « prête @<sha> » neuve sur une
//   PR ouverte, une ligne par déclaration, puis `TOTAL <n>` : lire la sortie
//   entière, jamais par `tail`. La clé est l'identifiant du COMMENTAIRE
//   (`c:<id>`), si bien qu'une redéclaration sur le même sha après un renvoi est
//   neuve. Le motif tolère le markdown en tête de ligne et reste ancré en début
//   de ligne, pour ne pas prendre une citation pour une déclaration.
// - `merge` (file) : la PR <N> est mergée (commit de merge) ou fermée sans
//   merge. Une file qui a déclaré « prête » est prévenue de la suite sans
//   relire le registre en boucle. Le registre (D-503) et le commentaire de PR
//   restent ce qui fait foi.
// - `release-db` (responsable, intégrateur) : un run de `release-db.yml` attend
//   son approbation. Le geste reste humain (D-087) : la sonde le signale et
//   n'approuve rien. `--ignorer` écarte les runs déjà signalés.
//
// CODES DE SORTIE
//   0 événement (ou amorçage fait) · 3 délai échu sans événement, toutes
//   lectures abouties ou certaines seulement (la ligne compte les échecs) ·
//   2 aucune lecture n'a abouti pendant toute la passe, ou amorçage
//   impossible (« je n'ai rien pu lire » n'est pas « rien vu ») · 4 usage,
//   dont un fichier des traitées absent ou illisible hors `--amorcer`, refusé
//   avant la boucle.
//   Lignes de tête : `NOUVELLE` / `AUCUNE` pour `prete`, comme le guetteur
//   hors dépôt ; `EVENEMENT <sonde>` / `AUCUN <sonde>` pour les deux autres ;
//   `LECTURE-IMPOSSIBLE` pour le code 2.
import { execFileSync } from 'node:child_process';
import { readFileSync, appendFileSync, existsSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

export const MOTIF = /^[\s>*_~`#-]*pr[êe]te[\s*_`]*@[\s*_`]*([0-9a-f]{7,40})\b/im;

/** Le sha déclaré « prête » dans un corps de commentaire, ou null. */
export function declaration(corps) {
  const m = MOTIF.exec(corps || '');
  return m ? m[1] : null;
}

/**
 * Déclarations neuves, de la plus ancienne à la plus récente.
 * @param {{number:number, headRefOid:string, commentaires:object[]}[]} prs
 * @param {Set<string>} vus clés `c:<id>` déjà traitées
 */
export function declarationsNeuves(prs, vus) {
  const decl = [];
  for (const p of prs) {
    for (const c of p.commentaires) {
      if (c.user?.type === 'Bot') continue;
      const sha = declaration(c.body);
      if (!sha) continue;
      if (vus.has(`c:${c.id}`)) continue;
      decl.push({ pr: p.number, sha, id: c.id, at: c.created_at, head: p.headRefOid });
    }
  }
  return decl.sort((a, b) => String(a.at).localeCompare(String(b.at)));
}

export function ligneDeclaration(d) {
  const tete = d.head.startsWith(d.sha) ? 'tête=ok' : `TÊTE-DIFFÉRENTE head=${d.head}`;
  return `${d.pr}:${d.sha} c:${d.id} at=${d.at} ${tete}`;
}

/**
 * État d'une PR lu par `gh pr view --json state,mergedAt,mergeCommit,closedAt`.
 * Rend la ligne d'événement, ou null tant que la PR est ouverte.
 */
export function evenementMerge(n, pr) {
  if (pr.state === 'MERGED') {
    const oid = pr.mergeCommit?.oid || '?';
    return `MERGEE pr=${n} commit=${oid} le=${pr.mergedAt || '?'}`;
  }
  if (pr.state === 'CLOSED') return `FERMEE-SANS-MERGE pr=${n} le=${pr.closedAt || '?'}`;
  if (pr.state === 'OPEN') return null;
  throw new Error(`état de PR inconnu : ${pr.state}`);
}

/** Runs `release-db` en attente d'approbation, hors ceux à ignorer. */
export function runsEnAttente(runs, ignorer = new Set()) {
  return runs
    .filter((r) => r.status === 'waiting' && !ignorer.has(String(r.id)))
    .map((r) => `ATTENTE-APPROBATION run=${r.id} sha=${String(r.head_sha).slice(0, 8)} depuis=${r.created_at} ${r.html_url || ''}`.trim());
}

/**
 * Boucle bornée. `lire()` rend la liste des lignes d'événement (vide : rien) ou
 * lève. `attendre(ms)` est injectable pour le banc.
 * @returns {Promise<{code:number, lignes:string[], erreurs:number}>}
 */
export async function guetter(lire, { iter = 45, pas = 60, attendre, journal = () => {} } = {}) {
  const dormir = attendre || ((ms) => new Promise((r) => setTimeout(r, ms)));
  let reussies = 0;
  let erreurs = 0;
  for (let i = 0; i < iter; i++) {
    try {
      const lignes = lire();
      reussies++;
      if (lignes.length) return { code: 0, lignes, erreurs };
    } catch (e) {
      erreurs++;
      journal(`erreur lecture ${String(e?.message || e).slice(0, 200)}`);
    }
    if (i < iter - 1) await dormir(pas * 1000);
  }
  return { code: reussies ? 3 : 2, lignes: [], erreurs };
}

// ── Lecture GitHub ──────────────────────────────────────────────────────────

const gh = (args) =>
  JSON.parse(execFileSync('gh', args, { cwd: RACINE, encoding: 'utf8', maxBuffer: 64e6, stdio: ['ignore', 'pipe', 'pipe'] }));

function lirePrsOuvertes() {
  const prs = gh(['pr', 'list', '--state', 'open', '--json', 'number,headRefOid', '--limit', '200']);
  return prs.map((p) => ({
    ...p,
    commentaires: gh(['api', '--paginate', '--slurp', `repos/{owner}/{repo}/issues/${p.number}/comments`]).flat(),
  }));
}

function lireVus(fichier) {
  if (!existsSync(fichier)) throw new Error(`fichier des traitées introuvable : ${fichier}`);
  return new Set(readFileSync(fichier, 'utf8').split('\n').filter(Boolean));
}

function lireRunsReleaseDb() {
  const r = gh(['api', 'repos/{owner}/{repo}/actions/workflows/release-db.yml/runs?status=waiting&per_page=100']);
  // Une réponse sans liste n'est pas « aucun run » : c'est une lecture ratée.
  if (!Array.isArray(r?.workflow_runs)) throw new Error('réponse release-db sans workflow_runs');
  return r.workflow_runs;
}

// ── Interface ──────────────────────────────────────────────────────────────

function options(args) {
  const o = { iter: 45, pas: 60, reste: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--iter' || a === '--pas') {
      const v = Number(args[++i]);
      if (!Number.isInteger(v) || v < (a === '--iter' ? 1 : 0)) throw new Error(`${a} attend un entier`);
      o[a.slice(2)] = v;
    } else if (a === '--ignorer') {
      o.ignorer = new Set(String(args[++i] || '').split(',').filter(Boolean));
    } else if (a === '--amorcer') {
      o.amorcer = true;
    } else o.reste.push(a);
  }
  return o;
}

const USAGE =
  'Usage : node scripts/wn-guetteur.mjs prete <traitees.txt> | prete --amorcer <traitees.txt> | ' +
  'merge <N> | release-db [--ignorer id,id]  [--iter N] [--pas S]';

async function principal(argv) {
  const [sonde, ...args] = argv;
  let o;
  try {
    o = options(args);
  } catch (e) {
    console.error(`${e.message}\n${USAGE}`);
    return 4;
  }
  const journal = (l) => console.log(l);
  let lire;
  if (sonde === 'prete') {
    const [fichier] = o.reste;
    if (!fichier || o.reste.length !== 1) { console.error(USAGE); return 4; }
    if (o.amorcer) {
      let neuves;
      try {
        neuves = declarationsNeuves(lirePrsOuvertes(), lireVus(fichier));
      } catch (e) {
        console.log(`LECTURE-IMPOSSIBLE prete --amorcer : ${String(e?.message || e).slice(0, 200)}`);
        return 2;
      }
      if (neuves.length) appendFileSync(fichier, neuves.map((d) => `c:${d.id}`).join('\n') + '\n');
      for (const d of neuves) console.log(`amorcée c:${d.id} pr=${d.pr} sha=${d.sha.slice(0, 8)} at=${d.at}`);
      console.log(`TOTAL ${neuves.length} amorcée(s)`);
      return 0;
    }
    // Un fichier des traitées absent ou illisible est une erreur de
    // configuration, pas une lecture ratée : sans cette lecture d'essai, la
    // boucle réessaierait toute la passe (45 minutes par défaut) avant de
    // rendre 2 (remarque de PR-Agent, #2076).
    try {
      lireVus(fichier);
    } catch (e) {
      console.error(`${String(e?.message || e).slice(0, 200)} (créer un fichier vide, puis prete --amorcer)\n${USAGE}`);
      return 4;
    }
    lire = () => declarationsNeuves(lirePrsOuvertes(), lireVus(fichier)).map(ligneDeclaration);
  } else if (sonde === 'merge') {
    const [n] = o.reste;
    if (!/^\d+$/.test(n || '') || o.reste.length !== 1) { console.error(USAGE); return 4; }
    lire = () => {
      const e = evenementMerge(n, gh(['pr', 'view', n, '--json', 'state,mergedAt,mergeCommit,closedAt']));
      return e ? [e] : [];
    };
  } else if (sonde === 'release-db') {
    if (o.reste.length) { console.error(USAGE); return 4; }
    lire = () => runsEnAttente(lireRunsReleaseDb(), o.ignorer);
  } else {
    console.error(USAGE);
    return 4;
  }
  const r = await guetter(lire, { iter: o.iter, pas: o.pas, journal });
  const quand = new Date().toISOString();
  // La sonde `prete` garde les mots de tête du guetteur hors dépôt
  // (`NOUVELLE`, `AUCUNE`) : une bascule de l'intégrateur ne change rien à
  // ce qu'il lit. Les deux autres sondes sont neuves.
  const [tete, rien] = sonde === 'prete' ? ['NOUVELLE', 'AUCUNE'] : [`EVENEMENT ${sonde}`, `AUCUN ${sonde}`];
  if (r.code === 0) {
    console.log(`${tete} ${quand}`);
    for (const l of r.lignes) console.log(l);
    console.log(`TOTAL ${r.lignes.length}`);
  } else if (r.code === 3) {
    console.log(`${rien} ${quand} TOTAL 0${r.erreurs ? ` (${r.erreurs} lecture(s) en échec)` : ''}`);
  } else {
    console.log(`LECTURE-IMPOSSIBLE ${sonde} ${quand} : aucune des ${o.iter} lectures n'a abouti`);
  }
  return r.code;
}

// Chemins RÉSOLUS des deux côtés, comme `wn-sonde-release-db.mjs` : lancé par
// un lien symbolique, `import.meta.url` désigne le fichier réel et
// `process.argv[1]` le lien. Une comparaison brute sortait alors en 0 sans
// rien lire, c'est-à-dire « événement » (revue `wn-reviewer`, P1).
function lanceDirectement() {
  try {
    return realpathSync(process.argv[1] ?? '') === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (lanceDirectement()) {
  process.exitCode = await principal(process.argv.slice(2));
}
