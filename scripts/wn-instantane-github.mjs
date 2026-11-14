#!/usr/bin/env node
// Instantané GitHub (lot L2 du plan du super-orchestrateur) : ce que
// rendent les sondes existantes, rassemblé en un fichier que le superviseur
// (`wn-superviseur.mjs`) croise avec l'export des registres. LECTURE SEULE
// côté GitHub — l'API en GET et les journaux de runs, par `gh`.
//
//   node scripts/wn-instantane-github.mjs --sortie <fichier> [--sans-sondes]
//                                         [--fermees <n>]
//
// Par PR ouverte : auteur, brouillon, tête et ORIGINE de la tête (dépôt de la
// branche, auteur et vérification du commit), fichiers, checks de la tête,
// déclarations « prête @<sha> » (auteur, association au dépôt, date, sha),
// empreinte du corps et handoffs qu'il nomme, puis le code des deux gardes
// de merge : `wn-revue-pr-agent` et `wn-sonde-release-db` (leurs fonctions,
// pas un second jugement). Par PR fermée récente (cent par défaut) : son
// état, merge ou non, et sa date. Plus la tête de `main` et l'heure de prise.
//
// Ce que le fichier n'est pas : une preuve de merge. Il décrit GitHub à son
// heure de prise ; le superviseur le dit périmé après trente minutes, et
// toute action qu'il en tire se confronte à l'état réel. Il ne recopie aucun
// texte libre (ni titre, ni corps de PR, ni texte de commentaire) : des
// numéros, des états, des sha, des identifiants de compte, des chemins.
//
// Il s'écrit hors du dépôt (bloc-notes de la session) : le chemin de sortie
// est refusé s'il tombe sous la racine du dépôt. `wn-sonde-release-db` fait
// un `git fetch` de `main` : c'est la seule écriture locale, celle de la sonde.
//
// Codes de sortie :
//   0  instantané écrit, toutes les lectures faites
//   1  instantané écrit, des lectures ont échoué (listées dans `erreurs`)
//   2  lecture impossible de la liste des PR : rien n'est écrit
//   3  usage invalide

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { court } from './lib/registres.mjs';
import { CHECK_REQUIS } from './lib/superviseur.mjs';
import { lire as lireRevue } from './wn-revue-pr-agent.mjs';
import { PLAFOND_FICHIERS_PR, sonder } from './wn-sonde-release-db.mjs';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');

export const SORTIE_ECRIT = 0;
export const SORTIE_PARTIEL = 1;
export const SORTIE_ILLISIBLE = 2;
export const SORTIE_USAGE = 3;
export const SCHEMA = 1;
export const FERMEES_PAR_DEFAUT = 100;

const USAGE = 'usage : node scripts/wn-instantane-github.mjs --sortie <fichier> [--sans-sondes] [--fermees <n>]';

/**
 * « prête @<sha> » en tête d'une ligne du commentaire (forme de
 * `REGLES_PR_MERGE.md`), casse indifférente, marques Markdown tolérées autour
 * (`**Prête @<sha>**`, constaté sur #2090).
 */
export const RE_DECLARATION = /^[ \t>#*_]*pr[êe]te[ \t*_]*@[ \t]*([0-9a-f]{7,40})\b/im;
const RE_HANDOFF = /docs\/claude\/handoffs\/[0-9A-Za-z._-]+\.md/g;
const CONCLUSIONS_VERTES = ['success', 'skipped', 'neutral'];

/**
 * Le motif d'une lecture en échec, normalisé : une réponse illisible ne se
 * recopie pas (sous Node 20, l'erreur de `JSON.parse` en cite un extrait).
 */
export function motifErreur(err) {
  if (err instanceof SyntaxError) return 'réponse illisible (JSON)';
  const ligne = String(err?.message ?? err).split('\n')[0];
  const http = /HTTP \d{3}/.exec(ligne);
  return http ? http[0] : court(ligne, 120);
}

export function analyserArguments(argv) {
  const options = { sortie: null, sondes: true, fermees: FERMEES_PAR_DEFAUT };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--sans-sondes') options.sondes = false;
    else if (a === '--sortie' || a === '--fermees') {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) return { erreur: `${a} attend une valeur` };
      i += 1;
      if (a === '--sortie') options.sortie = v;
      else {
        if (!/^[1-9]\d*$/.test(v) || Number(v) > 100) return { erreur: '--fermees attend un entier de 1 à 100' };
        options.fermees = Number(v);
      }
    } else return { erreur: `argument inconnu : ${a}` };
  }
  if (options.sortie === null) return { erreur: '--sortie manquant' };
  return { options };
}

/**
 * Le chemin de sortie tombe-t-il dans un arbre de travail — ce dépôt, sa
 * copie principale ou un autre worktree ? Le dossier parent est résolu
 * (liens symboliques, casse d'APFS), puis chaque ancêtre est examiné. Un
 * dossier parent introuvable est refusé aussi : rien ne s'écrit à l'aveugle.
 */
export function sousLeDepot(chemin, racine = RACINE) {
  const r = relative(resolve(racine), resolve(chemin));
  if (r === '' || (!r.startsWith('..') && !isAbsolute(r))) return true;
  let dossier;
  try {
    dossier = realpathSync.native(dirname(resolve(chemin)));
  } catch {
    return true;
  }
  for (;;) {
    if (existsSync(join(dossier, MARQUE_DEPOT))) return true;
    const parent = dirname(dossier);
    if (parent === dossier) return false;
    dossier = parent;
  }
}
const MARQUE_DEPOT = '.' + 'git';

/** Les déclarations « prête » d'une liste de commentaires d'issue. */
export function declarations(commentaires, tete) {
  const ds = [];
  for (const c of commentaires) {
    const m = RE_DECLARATION.exec(typeof c?.body === 'string' ? c.body : '');
    if (!m) continue;
    const sha = m[1].toLowerCase();
    const handoffs = [...new Set(c.body.match(RE_HANDOFF) ?? [])];
    ds.push({ auteur: court(c.user?.login, 60), association: court(c.author_association, 20), cree_le: court(c.created_at, 30), modifie_le: court(c.updated_at, 30), sha, sur_tete: typeof tete === 'string' && tete.startsWith(sha), handoffs });
  }
  return ds;
}

/**
 * Les checks d'une tête, résumés : la DERNIÈRE exécution de chaque nom (une
 * tête porte plusieurs `pr_agent`, un re-run remplace l'échec qu'il rejoue),
 * en échec (noms), en cours (noms), et l'état exact du check requis
 * (`success`, `en_cours`, ou la conclusion) — un `skipped` ne vaut pas un CI.
 */
export function resumerChecks(pages) {
  const parNom = new Map();
  for (const r of pages.flatMap((p) => p?.check_runs ?? [])) {
    const avant = parNom.get(r.name);
    if (!avant || String(r.started_at ?? '') >= String(avant.started_at ?? '')) parNom.set(r.name, r);
  }
  const echecs = [];
  const enCours = [];
  for (const r of parNom.values()) {
    if (r.status !== 'completed') enCours.push(court(r.name, 60));
    else if (!CONCLUSIONS_VERTES.includes(r.conclusion)) echecs.push(court(r.name, 60));
  }
  const requis = parNom.get(CHECK_REQUIS);
  const etatRequis = requis ? (requis.status !== 'completed' ? 'en_cours' : court(requis.conclusion, 20)) : null;
  return { total: parNom.size, succes: parNom.size - echecs.length - enCours.length, echecs: echecs.sort(), en_cours: enCours.sort(), requis: etatRequis === null ? {} : { [CHECK_REQUIS]: etatRequis } };
}

/** Ce que le corps de PR donne sans être recopié : longueur, empreinte, handoffs nommés. */
export function resumerCorps(corps) {
  const s = typeof corps === 'string' ? corps : '';
  return { longueur: s.length, empreinte: createHash('sha256').update(s).digest('hex').slice(0, 16), handoffs: [...new Set(s.match(RE_HANDOFF) ?? [])] };
}

const etatDe = (p) => (p.state === 'open' ? 'open' : p.merged_at ? 'merged' : 'closed');

/**
 * La collecte. Dépendances injectées, comme pour les sondes : `lireJson(chemin,
 * paginer)` — `paginer` vrai rend le tableau de pages de `gh api --paginate
 * --slurp` —, `lireJournal(id)`, `git(args)`, et `maintenant`. Rend
 * `{ code, instantane, erreurs }` ; `instantane` vaut `null` si la liste des
 * PR n'a pas pu être lue.
 */
export function prendre({ lireJson, lireJournal, git, maintenant, sondes = true, fermees = FERMEES_PAR_DEFAUT, gardes = { revue: lireRevue, releaseDb: sonder } }) {
  const erreurs = [];
  const noter = (numero, lecture, err) => erreurs.push({ pr: numero, lecture, motif: motifErreur(err) });
  let ouvertes;
  let recentes;
  let depot;
  let teteMain = null;
  try {
    ouvertes = lireJson('repos/{owner}/{repo}/pulls?state=open&per_page=100', true).flat();
    recentes = lireJson(`repos/{owner}/{repo}/pulls?state=closed&sort=updated&direction=desc&per_page=${fermees}`, false);
    if (!Array.isArray(recentes)) throw new Error('liste des PR fermées illisible');
    depot = lireJson('repos/{owner}/{repo}', false)?.full_name;
    if (!depot) throw new Error('nom du dépôt illisible');
  } catch (err) {
    return { code: SORTIE_ILLISIBLE, instantane: null, erreurs: [{ pr: null, lecture: 'liste des PR', motif: motifErreur(err) }] };
  }
  try {
    teteMain = lireJson('repos/{owner}/{repo}/commits/main', false)?.sha ?? null;
  } catch (err) {
    noter(null, 'tête de main', err);
  }

  const prs = [];
  for (const p of ouvertes) {
    const tete = p.head?.sha ?? null;
    const pr = {
      numero: p.number,
      etat: 'open',
      auteur: court(p.user?.login, 60),
      brouillon: Boolean(p.draft),
      tete,
      branche: court(p.head?.ref, 120),
      base: court(p.base?.ref, 60),
      tete_depot: court(p.head?.repo?.full_name ?? '', 120),
      meme_depot: Boolean(p.head?.repo?.full_name) && p.head.repo.full_name === depot,
      maj: court(p.updated_at, 30),
      corps: resumerCorps(p.body),
      commit: null,
      fichiers: null,
      fichiers_tronques: false,
      checks: null,
      declarations: [],
      revue_pr_agent: null,
      sonde_release_db: null,
    };
    try {
      const c = lireJson(`repos/{owner}/{repo}/commits/${tete}`, false);
      pr.commit = { auteur: court(c?.author?.login ?? '', 60), commiteur: court(c?.committer?.login ?? '', 60), verifie: c?.commit?.verification?.verified === true };
    } catch (err) {
      noter(p.number, 'commit de tête', err);
    }
    try {
      const objets = lireJson(`repos/{owner}/{repo}/pulls/${p.number}/files?per_page=100`, true).flat();
      pr.fichiers = [...new Set(objets.flatMap((f) => [f.filename, f.previous_filename].filter(Boolean)))].sort();
      pr.fichiers_tronques = objets.length >= PLAFOND_FICHIERS_PR;
    } catch (err) {
      noter(p.number, 'fichiers', err);
    }
    try {
      pr.checks = resumerChecks(lireJson(`repos/{owner}/{repo}/commits/${tete}/check-runs?per_page=100`, true));
    } catch (err) {
      noter(p.number, 'checks', err);
    }
    try {
      pr.declarations = declarations(lireJson(`repos/{owner}/{repo}/issues/${p.number}/comments?per_page=100`, true).flat(), tete);
    } catch (err) {
      noter(p.number, 'commentaires', err);
    }
    if (sondes) {
      // Les deux gardes rendent `2` sur une lecture impossible : le code est
      // gardé tel quel, jamais lu comme un `0`.
      try {
        pr.revue_pr_agent = { code: gardes.revue({ pr: p.number, lireJson, lireJournal }).code };
      } catch (err) {
        noter(p.number, 'revue PR-Agent', err);
      }
      try {
        pr.sonde_release_db = { code: gardes.releaseDb({ pr: p.number, lireJson, git }).code };
      } catch (err) {
        noter(p.number, 'sonde release-db', err);
      }
    }
    prs.push(pr);
  }
  for (const p of recentes) {
    if (prs.some((x) => x.numero === p.number)) continue;
    prs.push({ numero: p.number, etat: etatDe(p), auteur: court(p.user?.login, 60), tete: p.head?.sha ?? null, maj: court(p.updated_at, 30), merge_le: p.merged_at ? court(p.merged_at, 30) : null, merge_commit: p.merged_at ? (p.merge_commit_sha ?? null) : null, fermee_le: court(p.closed_at, 30) });
  }
  const instantane = { schema: SCHEMA, pris_le: new Date(maintenant).toISOString(), depot: court(depot, 120), tete_main: teteMain, sondes, prs, erreurs };
  return { code: erreurs.length > 0 ? SORTIE_PARTIEL : SORTIE_ECRIT, instantane, erreurs };
}

// ── Câblage CLI ─────────────────────────────────────────────────────────────

function lancer(cmd, args) {
  return execFileSync(cmd, args, { cwd: RACINE, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 256 * 1024 * 1024 });
}

export function principal(argv, deps = null) {
  const { options, erreur } = analyserArguments(argv);
  if (erreur) return { code: SORTIE_USAGE, lignes: [`✗ ${erreur}`, USAGE] };
  if (sousLeDepot(options.sortie)) return { code: SORTIE_USAGE, lignes: [`✗ sortie refusée sous le dépôt : ${court(options.sortie, 200)} — l'instantané vit dans le bloc-notes de la session`, USAGE] };
  const d = deps ?? {
    lireJson: (chemin, paginer) => JSON.parse(lancer('gh', ['api', ...(paginer ? ['--paginate', '--slurp'] : []), chemin])),
    lireJournal: (id) => lancer('gh', ['run', 'view', String(id), '--log']),
    git: (a) => lancer('git', a),
    maintenant: Date.now(),
    ecrire: (chemin, contenu) => writeFileSync(chemin, contenu),
  };
  const { code, instantane, erreurs } = prendre({ ...d, sondes: options.sondes, fermees: options.fermees });
  const lignes = erreurs.map((e) => `✗ lecture en échec${e.pr ? ` (#${e.pr})` : ''} — ${e.lecture} : ${e.motif}`);
  if (instantane === null) {
    lignes.push('INSTANTANE code=2 rien écrit');
    return { code, lignes };
  }
  d.ecrire(options.sortie, `${JSON.stringify(instantane, null, 2)}\n`);
  const ouvertes = instantane.prs.filter((p) => p.etat === 'open').length;
  lignes.push(`INSTANTANE code=${code} pris_le=${instantane.pris_le} ouvertes=${ouvertes} fermees=${instantane.prs.length - ouvertes} erreurs=${erreurs.length} sondes=${options.sondes ? 'oui' : 'non'}`);
  return { code, lignes };
}

const lanceDirectement = () => {
  try {
    return realpathSync(process.argv[1] ?? '') === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
};

if (lanceDirectement()) {
  const { code, lignes } = principal(process.argv.slice(2));
  for (const l of lignes) (code >= SORTIE_ILLISIBLE ? console.error : console.log)(l);
  process.exitCode = code;
}
