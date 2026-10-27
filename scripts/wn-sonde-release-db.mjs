#!/usr/bin/env node
// Sonde release-db : un merge est-il permis pendant qu'une release-db n'est
// pas conclue ? (D-374 §2 à §4.) LECTURE SEULE — l'API Actions en GET, et un
// `git fetch` de `origin/main` pour les comparaisons.
//
//   node scripts/wn-sonde-release-db.mjs <N>   verdict pour la PR <N>
//   node scripts/wn-sonde-release-db.mjs       état seul (sans PR, un run non
//                                              conclu suffit à geler)
//
// Appelée par `wn-merge` avant chaque merge, et directement par les sessions
// sans `/wn-*`. Elle ne merge pas, n'approuve pas, ne rejette pas : elle dit.
//
// CE QU'ELLE LIT. Tous les runs NON CONCLUS de `release-db.yml` — un appel par
// statut, toutes pages — et jamais une fenêtre des derniers runs à la place :
// un run coincé depuis trois jours sort d'une fenêtre, pas d'un filtre (D-374
// §4). Deux passes, dans l'ordre de vie d'un run, unies : un run qui avance
// entre deux appels est vu par l'un ou l'autre. EN PLUS, la page des derniers
// runs sans filtre : un statut que le filtre ne connaît pas (l'API rend alors
// une liste vide, sans erreur) gèle quand même.
//
// LES PHASES (D-374 §2), à la lettre : `waiting` est l'attente d'approbation,
// phase 1 — gelées, les seules PR qui touchent un chemin de `CHEMINS_GELES`.
// Tout autre statut non conclu gèle tout : l'exécution (phase 2, « dès que le
// run sort de `waiting` »), mais aussi la file et le job `resume` avant la
// porte, que D-374 ne nomme pas — par prudence, jamais plus ouvert que la
// décision. Un run vu sous deux statuts garde le plus restrictif.
//
// CODES DE SORTIE — `0` seul autorise le merge :
//   0 merge permis · 1 merge gelé · 2 lecture impossible (gel par prudence) ·
//   3 usage.

import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHEMINS_RELEASE_DB } from './wn-deploiement-deployer.mjs';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');

export const SORTIE_PERMIS = 0;
export const SORTIE_GELE = 1;
export const SORTIE_ILLISIBLE = 2;
export const SORTIE_USAGE = 3;

/** Les statuts d'un run non conclu, dans l'ordre de vie d'un run. */
export const STATUTS_NON_CONCLUS = ['requested', 'pending', 'queued', 'in_progress', 'waiting'];

/** Au-delà, `pulls/<N>/files` tronque sans le dire (plafond documenté de l'API). */
export const PLAFOND_FICHIERS_PR = 3000;

/**
 * Ce que gèle la phase 1 (D-374 §2) : une migration, un chemin clinique,
 * `release-db.yml` et ce que son run exécute contre la production — le script
 * du one-off, ses préflights SQL, le script de contre-épreuve, la
 * configuration Prisma —, et le déployeur — son script, le module
 * d'observation qu'il importe, le workflow qui le lance. Un chemin finissant
 * par `/` vise un dossier, sinon un fichier exact. Un banc dérive les fichiers
 * exécutés du workflow et du script du one-off, et exige qu'ils soient ici.
 */
export const CHEMINS_GELES = [
  ...CHEMINS_RELEASE_DB.map((c) => `${c}/`),
  '.github/workflows/release-db.yml',
  'web/scripts/release-db-scalingo.sh',
  'web/scripts/release-db-statut.sh',
  'web/prisma.config.ts',
  'web/prisma/checks/c5_ciqual_production_preflight.sql',
  'web/prisma/checks/packs_registre_coherence_v1.sql',
  'web/prisma/checks/rag_pgvector_structure_v1.sql',
  'web/prisma/checks/rag_claim_fraicheur_tables_signees_v1.sql',
  'web/prisma/checks/biology_liens_axe_v1.sql',
  '.github/workflows/deploiement-production.yml',
  'scripts/wn-deploiement-deployer.mjs',
  'scripts/wn-deploiement-observation.mjs',
];

export const estGele = (chemin) => CHEMINS_GELES.some((c) => (c.endsWith('/') ? chemin.startsWith(c) : chemin === c));

/** La phase d'un run d'après les statuts sous lesquels il a été vu. */
export const phaseDuRun = (statuts) => (statuts.every((s) => s === 'waiting') ? 'attente' : 'hors-attente');

/**
 * D-374 §3, pour un run en attente qui ne porte plus la tête : l'ancien run
 * n'est rejeté que si la tête apporte une migration ou un changement clinique
 * nouveau. `nouveautes` : chemins de `CHEMINS_RELEASE_DB` changés entre le
 * commit du run et la tête (`null` si illisible) ; `ancetre` : le commit du
 * run est-il un ancêtre de la tête (`false` : historique réécrit, le workflow
 * refusera).
 */
export function conseilDeuxRuns(run, tete, nouveautes, ancetre) {
  if (run.head_sha === tete) return null;
  if (ancetre === false) {
    return `run ${run.id} : son commit n'est plus un ancêtre de la tête (historique réécrit) — le workflow refusera de déployer ; à REJETER, puis relancer sur la tête.`;
  }
  if (nouveautes === null) {
    return `run ${run.id} : comparaison à la tête illisible — ni approuver ni rejeter avant \`git diff --name-only ${run.head_sha} origin/main -- ${CHEMINS_RELEASE_DB.join(' ')}\`.`;
  }
  if (nouveautes.length > 0) {
    return `run ${run.id} : la tête apporte ${nouveautes.length} changement(s) de migration ou clinique non jugé(s) par lui (${nouveautes.slice(0, 3).join(', ')}${nouveautes.length > 3 ? ', …' : ''}) — à REJETER ; le run de la tête porte l'ensemble (D-374 §3).`;
  }
  return `run ${run.id} : la tête ne lui apporte ni migration ni changement clinique — il s'approuve tel quel, déploie la tête, et sa fin rouge volontaire se lit « appliquée », jamais « à relancer » (D-374 §3).`;
}

/**
 * Le verdict (D-374 §2). `runs` : runs non conclus, chacun avec ses `statuts`
 * et sa `phase`. `fichiers` : chemins de la PR (nom courant et ancien nom), ou
 * `null` sans PR. `sansRun` : dernier commit de `main` sur un chemin
 * déclencheur qu'aucun run ne porte encore (run pas encore créé, ou jamais
 * dispatché), sinon `null`.
 */
export function juger({ runs, fichiers, sansRun = null }) {
  const decrits = runs.map((r) => `${r.id} (${r.statuts.join('/')}, ${r.head_sha.slice(0, 8)})`).join(' ; ');
  if (runs.some((r) => r.phase === 'hors-attente')) {
    return {
      code: SORTIE_GELE,
      phase: 'hors-attente',
      motif: `run hors de l'attente d'approbation — exécution (phase 2), ou démarrage avant la porte : aucun merge jusqu'à sa conclusion — ${decrits}.`,
    };
  }
  const geles = fichiers === null ? [] : [...new Set(fichiers.filter(estGele))].sort();
  if (geles.length > 0 && sansRun) {
    return {
      code: SORTIE_GELE,
      phase: runs.length > 0 ? 'attente' : 'aucune',
      motif: `la PR touche un chemin gelé, et le commit ${sansRun.slice(0, 8)} de main, sur un chemin déclencheur, n'est porté par aucun run release-db (pas encore créé, ou jamais dispatché) : attendre son run.`,
    };
  }
  if (runs.length === 0) {
    return { code: SORTIE_PERMIS, phase: 'aucune', motif: 'aucun run release-db non conclu — merge permis.' };
  }
  if (fichiers === null) {
    return {
      code: SORTIE_GELE,
      phase: 'attente',
      motif: `phase 1, attente d'approbation : le verdict dépend des fichiers — relancer avec le numéro de PR — ${decrits}.`,
    };
  }
  if (geles.length > 0) {
    return {
      code: SORTIE_GELE,
      phase: 'attente',
      motif: `phase 1, attente d'approbation : la PR touche ${geles.length} chemin(s) gelé(s) (${geles.slice(0, 5).join(', ')}${geles.length > 5 ? ', …' : ''}) — ${decrits}.`,
    };
  }
  return {
    code: SORTIE_PERMIS,
    phase: 'attente',
    motif: `phase 1, attente d'approbation : la PR ne touche aucun chemin gelé — merge permis ; le code consommateur d'une migration en attente reste soumis à D-087 — ${decrits}.`,
  };
}

export function analyserArguments(argv) {
  if (argv.length === 0) return { pr: null };
  if (argv.length === 1 && /^[1-9]\d*$/.test(argv[0])) return { pr: Number(argv[0]) };
  return { erreur: 'usage : node scripts/wn-sonde-release-db.mjs [numéro de PR]' };
}

const RUNS = 'repos/{owner}/{repo}/actions/workflows/release-db.yml/runs';

/**
 * Collecte puis juge. Dépendances injectées : `lireJson(chemin, paginer)` —
 * `paginer` vrai rend le tableau de pages de `gh api --paginate --slurp`,
 * faux un seul objet — et `git(args)`, qui rend stdout et lève en cas d'échec.
 * Rend `{ code, lignes }`.
 */
export function sonder({ pr, lireJson, git }) {
  const lignes = [];
  const vus = new Map();
  const noter = (r) => {
    if (r.status === 'completed') return;
    const v = vus.get(r.id) ?? { id: r.id, head_sha: r.head_sha, statuts: new Set() };
    v.statuts.add(r.status);
    vus.set(r.id, v);
  };
  let recents;
  let fichiers = null;
  try {
    for (let passe = 0; passe < 2; passe++) {
      for (const statut of STATUTS_NON_CONCLUS) {
        for (const page of lireJson(`${RUNS}?status=${statut}&per_page=100`, true)) page.workflow_runs.forEach(noter);
      }
    }
    lireJson(`${RUNS}?per_page=30`, false).workflow_runs.forEach(noter);
    // Les derniers runs de `main`, lus à part : trente dispatchs hors `main`
    // pousseraient sinon le dernier run de `main` hors de la page non filtrée
    // (revue CodeRabbit de #1742). Ils servent au contrôle « commit sans run ».
    recents = lireJson(`${RUNS}?branch=main&per_page=30`, false).workflow_runs;
    recents.forEach(noter);
    if (pr !== null) {
      const objets = lireJson(`repos/{owner}/{repo}/pulls/${pr}/files?per_page=100`, true).flat();
      if (objets.length >= PLAFOND_FICHIERS_PR) {
        throw new Error(`${objets.length} fichiers : la liste de l'API est tronquée à ${PLAFOND_FICHIERS_PR}`);
      }
      fichiers = objets.flatMap((f) => [f.filename, f.previous_filename].filter(Boolean));
    }
  } catch (err) {
    lignes.push(`❌ Lecture impossible — gel par prudence (D-374 §5) : ${String(err?.message ?? err).split('\n')[0]}`);
    return { code: SORTIE_ILLISIBLE, lignes };
  }
  const runs = [...vus.values()]
    .map((v) => ({ id: v.id, head_sha: v.head_sha, statuts: [...v.statuts].sort(), phase: phaseDuRun([...v.statuts]) }))
    .sort((a, b) => a.id - b.id);

  const estAncetre = (a, b) => {
    try {
      git(['merge-base', '--is-ancestor', a, b]);
      return true;
    } catch {
      return false;
    }
  };
  let tete = null;
  try {
    git(['fetch', '--quiet', 'origin', 'main']);
    tete = git(['rev-parse', 'origin/main']).trim();
  } catch {
    // Sans tête, ni le run manquant ni D-374 §3 ne se jugent : seule une PR
    // qui touche un chemin gelé en dépend, et elle gèle.
  }

  let sansRun = null;
  if (fichiers !== null && fichiers.some(estGele)) {
    let dernier;
    try {
      if (tete === null) throw new Error('tête de main illisible');
      dernier = git(['log', '-1', '--format=%H', tete, '--', ...CHEMINS_RELEASE_DB]).trim();
    } catch (err) {
      lignes.push(`❌ Lecture impossible — dernier commit déclencheur de main non vérifié, gel par prudence : ${String(err?.message ?? err).split('\n')[0]}`);
      return { code: SORTIE_ILLISIBLE, lignes };
    }
    // Un run d'une autre branche (dispatch hors `main`, refusé par `ref-refusee`)
    // ne porte rien vers la production : il ne lève pas cette vérification.
    const portent = recents.filter((r) => r.head_branch === 'main');
    if (dernier && !portent.some((r) => r.head_sha === dernier || estAncetre(dernier, r.head_sha))) sansRun = dernier;
  }

  const verdict = juger({ runs, fichiers, sansRun });
  lignes.push(`${verdict.code === SORTIE_PERMIS ? '✓' : '❌'} ${verdict.motif}`);
  const enAttente = runs.filter((r) => r.phase === 'attente');
  if (enAttente.length > 0 && tete === null) lignes.push('· tête de main illisible : comparaison de D-374 §3 non faite.');
  if (tete !== null) {
    for (const run of enAttente) {
      let nouveautes;
      try {
        nouveautes = git(['diff', '--name-only', run.head_sha, tete, '--', ...CHEMINS_RELEASE_DB]).split('\n').filter(Boolean);
      } catch {
        nouveautes = null;
      }
      const conseil = conseilDeuxRuns(run, tete, nouveautes, estAncetre(run.head_sha, tete));
      if (conseil) lignes.push(`· ${conseil}`);
    }
  }
  lignes.push(`SONDE release-db code=${verdict.code} phase=${verdict.phase} runs=${runs.length}${pr === null ? '' : ` pr=${pr}`}`);
  return { code: verdict.code, lignes };
}

// ── Câblage CLI ─────────────────────────────────────────────────────────────

// Le tampon par défaut d'`execFileSync` est de 1 Mio : la liste des fichiers
// d'une grosse PR (champ `patch` compris) le dépasse, et `ENOBUFS` se lirait
// « lecture impossible » — un gel sans issue (revue CodeRabbit de #1742).
function lancer(cmd, args) {
  return execFileSync(cmd, args, { cwd: RACINE, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 256 * 1024 * 1024 });
}

function principal(argv) {
  const args = analyserArguments(argv);
  if (args.erreur) {
    console.error(args.erreur);
    return SORTIE_USAGE;
  }
  const { code, lignes } = sonder({
    pr: args.pr,
    lireJson: (chemin, paginer) => JSON.parse(lancer('gh', ['api', ...(paginer ? ['--paginate', '--slurp'] : []), chemin])),
    git: (a) => lancer('git', a),
  });
  for (const l of lignes) (code === SORTIE_ILLISIBLE ? console.error : console.log)(l);
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
