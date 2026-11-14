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
// APRÈS LA CONCLUSION (D-520 §3 et §3 bis). Sans relecteur, un run annulé ou
// rouge avant écriture laisse sur `main` une migration que le run suivant
// appliquerait sans revue. La sonde compare donc les migrations de la tête à
// celles du dernier run de `main` attesté « appliqué » (la classification du
// déployeur : vert, ou rouge après ses deux attestations). Un reliquat gèle
// toute PR qui touche un chemin déclencheur, sauf le revert pur de ce reliquat.
// Et une PR qui AJOUTE une migration attend le constat de la précédente : la
// ligne `WN_CONSTAT_RELEASE_DB run=<id>` sur sa PR, écrite par la file après
// la lecture par conteneur, liée à un run vert qui la contient.
//
// CODES DE SORTIE — `0` seul autorise le merge :
//   0 merge permis · 1 merge gelé · 2 lecture impossible (gel par prudence) ·
//   3 usage.

import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHEMINS_RELEASE_DB, classerRunReleaseDb } from './wn-deploiement-deployer.mjs';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');

export const SORTIE_PERMIS = 0;
export const SORTIE_GELE = 1;
export const SORTIE_ILLISIBLE = 2;
export const SORTIE_USAGE = 3;

/**
 * Le constat d'une migration (D-520 §3) : après la lecture par conteneur, la
 * file écrit sur la PR de la migration une ligne qui commence par ce marqueur,
 * suivi de `run=<id>`, l'identifiant du run release-db qui l'a appliquée.
 */
export const MARQUEUR_CONSTAT = 'WN_CONSTAT_RELEASE_DB';

/** Les statuts d'un run non conclu, dans l'ordre de vie d'un run. */
export const STATUTS_NON_CONCLUS = ['requested', 'pending', 'queued', 'in_progress', 'waiting'];

/** Au-delà, `pulls/<N>/files` tronque sans le dire (plafond documenté de l'API). */
export const PLAFOND_FICHIERS_PR = 3000;

/**
 * Un déclencheur de `CHEMINS_RELEASE_DB` est un fichier exact quand son dernier
 * segment porte une extension (la table signée, D-389 §5) ; sinon un dossier.
 */
export function estFichierDeclencheur(chemin) {
  return /\.[a-z]+$/.test(chemin.split('/').pop());
}

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
  // Un déclencheur est un dossier, sauf les fichiers exacts — tables signées
  // hors de `clinical/` et contrat de fraîcheur (D-389 §5, D-416) : leur
  // ajouter `/` les rendrait inatteignables. Le contrat figure aussi plus bas,
  // parmi les préflights : le doublon est sans effet sur `estGele`.
  ...CHEMINS_RELEASE_DB.map((c) => (estFichierDeclencheur(c) ? c : `${c}/`)),
  '.github/workflows/release-db.yml',
  'web/scripts/release-db-scalingo.sh',
  'web/scripts/release-db-statut.sh',
  'web/prisma.config.ts',
  // Importé par `prisma.config.ts` : fixe l'URL de connexion et le mode SSL
  // du one-off (revue CodeRabbit de #1742).
  'web/src/lib/postgres.ts',
  // Fixent le CLI Prisma de l'image, que le one-off exécute (D-520 §7).
  'web/package.json',
  'web/package-lock.json',
  'web/prisma/checks/c5_ciqual_production_preflight.sql',
  'web/prisma/checks/packs_registre_coherence_v1.sql',
  'web/prisma/checks/rag_pgvector_structure_v1.sql',
  'web/prisma/checks/rag_claim_fraicheur_tables_signees_v1.sql',
  'web/prisma/checks/positions_citees_tables_signees_v1.sql',
  'web/prisma/checks/biology_liens_axe_v1.sql',
  '.github/workflows/deploiement-production.yml',
  'scripts/wn-deploiement-deployer.mjs',
  'scripts/wn-deploiement-observation.mjs',
];

export const estGele = (chemin) => CHEMINS_GELES.some((c) => (c.endsWith('/') ? chemin.startsWith(c) : chemin === c));

/** Un chemin dont le push sur `main` déclenche release-db (D-520 §3 bis). */
export const estDeclencheur = (chemin) =>
  CHEMINS_RELEASE_DB.some((c) => (estFichierDeclencheur(c) ? chemin === c : chemin.startsWith(`${c}/`)));

export const MIGRATIONS = 'web/prisma/migrations/';

/** Le dossier de migration d'un chemin, sinon `null` (`migration_lock.toml` n'en est pas un). */
export function dossierMigration(chemin) {
  if (!chemin.startsWith(MIGRATIONS)) return null;
  const reste = chemin.slice(MIGRATIONS.length);
  return reste.includes('/') ? reste.split('/')[0] : null;
}

/** Les auteurs dont un constat compte : le dépôt, jamais un commentateur extérieur. */
export const ASSOCIATIONS_ADMISES = ['OWNER', 'MEMBER', 'COLLABORATOR'];

const RE_CONSTAT = new RegExp(`^${MARQUEUR_CONSTAT} run=(\\d+)\\s*$`, 'm');
const WORKFLOW = '.github/workflows/release-db.yml';

/** La phase d'un run d'après les statuts sous lesquels il a été vu. */
export const phaseDuRun = (statuts) => (statuts.every((s) => s === 'waiting') ? 'attente' : 'hors-attente');

/**
 * D-374 §3, pour un run en attente qui ne porte plus la tête : l'ancien run
 * n'est arrêté que si la tête apporte une migration ou un changement clinique
 * nouveau. `nouveautes` : chemins de `CHEMINS_RELEASE_DB` changés entre le
 * commit du run et la tête (`null` si illisible) ; `ancetre` : le commit du
 * run est-il un ancêtre de la tête (`false` : historique réécrit, le workflow
 * refusera). Depuis D-520, rien ne s'approuve : le run part après le minuteur,
 * et l'arrêt est son annulation, avant le one-off (piège 3). Tant que
 * l'environnement garde ses relecteurs (§6), l'intégrateur approuve sous
 * délégation, et l'annulation vaut rejet.
 */
const ANNULER = (id) => `à ANNULER (\`gh run cancel ${id}\`, avant le one-off ; tant que l'environnement garde ses relecteurs, D-520 §6, le rejet vaut annulation)`;

export function conseilDeuxRuns(run, tete, nouveautes, ancetre) {
  if (run.head_sha === tete) return null;
  if (ancetre === false) {
    return `run ${run.id} : son commit n'est plus un ancêtre de la tête (historique réécrit) — le workflow refusera de déployer ; ${ANNULER(run.id)}, puis relancer sur la tête (workflow_dispatch, geste humain, D-520 §5).`;
  }
  if (nouveautes === null) {
    return `run ${run.id} : comparaison à la tête illisible — ni le laisser partir ni l'arrêter avant \`git diff --name-only ${run.head_sha} origin/main -- ${CHEMINS_RELEASE_DB.join(' ')}\`.`;
  }
  if (nouveautes.length > 0) {
    return `run ${run.id} : la tête apporte ${nouveautes.length} changement(s) de migration ou clinique non jugé(s) par lui (${nouveautes.slice(0, 3).join(', ')}${nouveautes.length > 3 ? ', …' : ''}) — ${ANNULER(run.id)} ; le run de la tête porte l'ensemble (D-374 §3).`;
  }
  return `run ${run.id} : la tête ne lui apporte ni migration ni changement clinique — il part tel quel après le minuteur (approuvé par l'intégrateur tant que les relecteurs restent, D-520 §6), déploie la tête, et sa fin se lit « appliquée », jamais « à relancer » (D-374 §3, D-467).`;
}

/**
 * Le verdict (D-374 §2). `runs` : runs non conclus, chacun avec ses `statuts`
 * et sa `phase`. `fichiers` : chemins de la PR (nom courant et ancien nom), ou
 * `null` sans PR. `sansRun` : dernier commit de `main` sur un chemin
 * déclencheur qu'aucun run ne porte encore (run pas encore créé, ou jamais
 * dispatché), sinon `null`. `reliquat` : migrations de la tête qu'aucun run
 * attesté « appliqué » ne porte (D-520 §3 bis), `[]` si aucune ;
 * `fichiersReliquat` : tous leurs fichiers à la tête ; `retires` : chemins que
 * la PR supprime. `constat` : `null`, ou ce qui manque au constat de la
 * dernière migration quand la PR en ajoute une (D-520 §3).
 */
export function juger({ runs, fichiers, sansRun = null, reliquat = [], fichiersReliquat = [], retires = [], constat = null }) {
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
  if (runs.length > 0 && fichiers === null) {
    return {
      code: SORTIE_GELE,
      phase: 'attente',
      motif: `phase 1, attente d'approbation : le verdict dépend des fichiers — relancer avec le numéro de PR — ${decrits}.`,
    };
  }
  if (runs.length > 0 && geles.length > 0) {
    return {
      code: SORTIE_GELE,
      phase: 'attente',
      motif: `phase 1, attente d'approbation : la PR touche ${geles.length} chemin(s) gelé(s) (${geles.slice(0, 5).join(', ')}${geles.length > 5 ? ', …' : ''}) — ${decrits}.`,
    };
  }
  const phase = runs.length > 0 ? 'attente' : 'aucune';
  if (reliquat.length > 0) {
    const liste = `${reliquat.slice(0, 3).join(', ')}${reliquat.length > 3 ? ', …' : ''}`;
    const sortie = 'sortie : le revert de la migration (PR P0), ou sa reprise par un workflow_dispatch humain (D-520 §3 bis)';
    if (fichiers === null) {
      return {
        code: SORTIE_GELE,
        phase,
        motif: `${reliquat.length} migration(s) de main non appliquée(s) (${liste}) : les chemins déclencheurs sont gelés — relancer avec le numéro de PR ; ${sortie}.`,
      };
    }
    // Le revert pur : la PR ne touche un chemin déclencheur que pour SUPPRIMER
    // des fichiers du reliquat, et elle les supprime TOUS — un revert partiel
    // laisserait le reste partir au run qu'il déclenche.
    const retrait = new Set(retires);
    const complet = fichiersReliquat.length > 0 && fichiersReliquat.every((f) => retrait.has(f));
    const bloquants = [...new Set(fichiers.filter(estDeclencheur))]
      .filter((c) => !(complet && retrait.has(c) && reliquat.includes(dossierMigration(c))))
      .sort();
    if (bloquants.length > 0) {
      return {
        code: SORTIE_GELE,
        phase,
        motif: `${reliquat.length} migration(s) de main non appliquée(s) (${liste}), après un run conclu sans l'écrire : la PR touche ${bloquants.length} chemin(s) déclencheur(s) (${bloquants.slice(0, 5).join(', ')}${bloquants.length > 5 ? ', …' : ''}), dont le run l'appliquerait sans revue ; ${sortie}.`,
      };
    }
  }
  if (constat) {
    return {
      code: SORTIE_GELE,
      phase,
      motif: `la PR ajoute une migration avant le constat de la précédente (D-520 §3, une migration à la fois) : ${constat}`,
    };
  }
  if (runs.length === 0) {
    return { code: SORTIE_PERMIS, phase: 'aucune', motif: 'aucun run release-db non conclu — merge permis.' };
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
 * Les migrations de `main` au regard des runs (D-520 §3 bis et §3). Lève sur
 * toute lecture impossible : la sonde gèle alors par prudence.
 *
 * Reliquat : migrations de la tête absentes du commit du dernier run de
 * `main` attesté « appliqué » (`classerRunReleaseDb` : vert, ou rouge après
 * ses deux attestations). Un run annulé, rouge avant écriture ou d'état
 * inconnu n'atteste rien : sa migration reste au reliquat. `migrate deploy`
 * applique tout jusqu'à son commit, donc ce commit borne l'appliqué ; un run
 * qui a déployé une tête plus récente sans migration nouvelle (D-374 §3) ne
 * fait que surestimer le reliquat, jamais le cacher.
 *
 * Constat, quand la PR ajoute une migration : la dernière migration AJOUTÉE à
 * `main` et encore présente doit porter, sur sa PR, une ligne
 * `WN_CONSTAT_RELEASE_DB run=<id>` d'un auteur du dépôt, écrite après la fin
 * de ce run, lequel est un run de `main` attesté « appliqué » qui contient la
 * migration.
 */
export function lireMigrations({ tete, recents, ajoutsMigration, lireJson, git, estAncetre }) {
  const migrationsA = (sha) => {
    const noms = git(['ls-tree', '--name-only', sha, MIGRATIONS])
      .split('\n')
      .filter(Boolean)
      .map((l) => l.slice(l.lastIndexOf('/') + 1))
      .filter((n) => n !== 'migration_lock.toml');
    if (noms.length === 0) throw new Error(`aucune migration lue au commit ${sha.slice(0, 8)}`);
    return noms;
  };
  const lireEtapes = (id) =>
    lireJson(`repos/{owner}/{repo}/actions/runs/${id}/jobs?per_page=100`, false)
      .jobs.flatMap((j) => j.steps ?? [])
      .map((e) => ({ name: e.name, conclusion: e.conclusion }));

  const succes = lireJson(`${RUNS}?status=success&branch=main&per_page=1`, false).workflow_runs[0] ?? null;
  const candidats = [
    ...(succes ? [succes] : []),
    ...recents.filter((r) => r.head_branch === 'main' && r.status === 'completed' && r.conclusion !== 'success' && (!succes || r.id > succes.id)),
  ].sort((a, b) => b.id - a.id);
  const applique = candidats.find((r) => classerRunReleaseDb(r, lireEtapes) === 'appliquee');
  if (!applique) throw new Error('aucun run release-db de main attesté « appliqué »');
  const presentes = migrationsA(tete);
  const appliquees = new Set(migrationsA(applique.head_sha));
  const reliquat = presentes.filter((m) => !appliquees.has(m)).sort();
  // Tous les fichiers du reliquat à la tête : un revert n'est admis que s'il
  // les retire TOUS — retirer A d'un reliquat {A, B} laisserait B partir au
  // run que ce revert déclenche (revue wn-reviewer du lot).
  const fichiersReliquat = reliquat.flatMap((m) => {
    const f = git(['ls-tree', '-r', '--name-only', tete, `${MIGRATIONS}${m}/`]).split('\n').filter(Boolean);
    if (f.length === 0) throw new Error(`aucun fichier lu pour la migration ${m}`);
    return f;
  });

  if (ajoutsMigration.length === 0) return { reliquat, fichiersReliquat, constat: null };
  const ici = new Set(presentes);
  let derniere = null;
  let courant = null;
  const blocs = [];
  for (const ligne of git(['log', '--diff-filter=A', '--name-only', '--format=@%H', tete, '--', MIGRATIONS]).split('\n')) {
    const entete = /^@([0-9a-f]{40})$/.exec(ligne);
    if (entete) blocs.push((courant = { commit: entete[1], dossiers: new Set() }));
    else if (courant && ligne) {
      const d = dossierMigration(ligne);
      if (d && ici.has(d)) courant.dossiers.add(d);
    }
  }
  derniere = blocs.find((b) => b.dossiers.size > 0) ?? null;
  // Des migrations présentes sans commit d'ajout lisible : clone superficiel
  // ou historique greffé — rien n'est vérifié, la sonde gèle (code 2).
  if (!derniere) throw new Error("aucun commit d'ajout de migration trouvé sur main");
  const { commit } = derniere;
  const dossiers = [...derniere.dossiers].sort();
  const nom = dossiers.join(', ');
  const consigne = `après la lecture par conteneur, la file écrit sur cette PR la ligne « ${MARQUEUR_CONSTAT} run=<id du run de main qui l'a appliquée> »`;
  const prs = lireJson(`repos/{owner}/{repo}/commits/${commit}/pulls`, false);
  // Le dépôt merge en squash : la PR de la migration est celle dont le commit
  // de merge EST le commit d'ajout.
  const pr = prs.find((p) => p.merge_commit_sha === commit) ?? null;
  if (!pr) {
    return {
      reliquat,
      fichiersReliquat,
      constat: `aucune PR n'a pour commit de merge ${commit.slice(0, 8)}, qui a ajouté ${nom} ; le constat ne peut pas se lire, la sortie est un arbitrage du responsable.`,
    };
  }
  const commentaires = lireJson(`repos/{owner}/{repo}/issues/${pr.number}/comments?per_page=100`, true).flat();
  const valide = commentaires
    .filter((c) => ASSOCIATIONS_ADMISES.includes(c.author_association))
    .reverse()
    .some((c) => {
      const id = RE_CONSTAT.exec(c.body ?? '')?.[1];
      if (!id) return false;
      // Une lecture en panne LÈVE (gel en code 2), jamais « constat invalide »
      // puis un autre constat accepté à sa place (contre-revue Codex).
      const run = lireJson(`repos/{owner}/{repo}/actions/runs/${id}`, false);
      if (!(run.path === WORKFLOW || String(run.path).startsWith(`${WORKFLOW}@`)) || run.head_branch !== 'main') return false;
      if (!(Date.parse(c.created_at) >= Date.parse(run.updated_at))) return false;
      if (classerRunReleaseDb(run, lireEtapes) !== 'appliquee' || !estAncetre(commit, run.head_sha)) return false;
      // L'ascendance ne suffit pas : le commit du run doit PORTER la migration
      // (un descendant qui l'aurait retirée ne l'a pas appliquée).
      const portees = new Set(migrationsA(run.head_sha));
      return dossiers.every((d) => portees.has(d));
    });
  return {
    reliquat,
    fichiersReliquat,
    constat: valide ? null : `la dernière migration de main (${nom}, PR #${pr.number}) n'a pas de constat valide ; ${consigne}.`,
  };
}

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
  let retires = [];
  let ajoutsMigration = [];
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
      fichiers = objets.flatMap((f) => {
        const chemins = [f.filename, f.previous_filename].filter(Boolean);
        if (chemins.length === 0) throw new Error('un fichier de la PR est rendu sans chemin');
        return chemins;
      });
      retires = objets.filter((f) => f.status === 'removed').map((f) => f.filename);
      // Une migration arrive par ajout, renommage ou copie ; une modification
      // d'une migration existante est une dérive, que `migrate deploy` refuse.
      ajoutsMigration = [
        ...new Set(objets.filter((f) => ['added', 'renamed', 'copied'].includes(f.status)).map((f) => dossierMigration(f.filename)).filter(Boolean)),
      ];
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
      // Vide : clone superficiel ou historique illisible — rien n'est vérifié.
      if (!dernier) throw new Error('aucun commit déclencheur trouvé sur main');
    } catch (err) {
      lignes.push(`❌ Lecture impossible — dernier commit déclencheur de main non vérifié, gel par prudence : ${String(err?.message ?? err).split('\n')[0]}`);
      return { code: SORTIE_ILLISIBLE, lignes };
    }
    // Un run d'une autre branche (dispatch hors `main`, refusé par `ref-refusee`)
    // ne porte rien vers la production : il ne lève pas cette vérification.
    const portent = recents.filter((r) => r.head_branch === 'main');
    if (!portent.some((r) => r.head_sha === dernier || estAncetre(dernier, r.head_sha))) sansRun = dernier;
  }

  // D-520 §3 bis et §3 : lus seulement quand la PR touche un chemin
  // déclencheur (ou sans PR) — une PR de doc n'en dépend pas.
  let reliquat = [];
  let fichiersReliquat = [];
  let constat = null;
  if (fichiers === null || fichiers.some(estDeclencheur)) {
    try {
      if (tete === null) throw new Error('tête de main illisible');
      ({ reliquat, fichiersReliquat, constat } = lireMigrations({ tete, recents, ajoutsMigration, lireJson, git, estAncetre }));
    } catch (err) {
      lignes.push(`❌ Lecture impossible — migrations de main non comparées au dernier run appliqué, gel par prudence (D-520 §3 bis) : ${String(err?.message ?? err).split('\n')[0]}`);
      return { code: SORTIE_ILLISIBLE, lignes };
    }
  }

  const verdict = juger({ runs, fichiers, sansRun, reliquat, fichiersReliquat, retires, constat });
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
