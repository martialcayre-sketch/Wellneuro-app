#!/usr/bin/env node
// Lecteur de la revue PR-Agent : la revue de substitution porte-t-elle sur la
// tête de la PR ? (D-393 §2, règle 1.6.) LECTURE SEULE — l'API en GET et les
// journaux des runs (`gh run view --log`).
//
//   node scripts/wn-revue-pr-agent.mjs <N>   les quatre conditions pour la PR <N>
//
// Appelé par `wn-merge` (étape 6) quand CodeRabbit a sauté la PR ou bute sur
// son quota — il ne vérifie pas cette précondition (D-393 §1) —, et
// directement par les sessions sans `/wn-*`. Il ne merge pas, ne commente pas,
// ne relance rien : il dit si la preuve tient. Il ne juge pas les remarques :
// leur verdict reste un geste de la session (D-393 §3).
//
// LES QUATRE CONDITIONS (D-393 §2 et sa ligne datée du 2026-10-28), ensemble :
//   (a) le dernier run `pull_request` de `pr_agent.yml` sur la tête, conclu
//       `success` ; un run sur commentaire ne compte jamais ;
//   (b) son journal dit « returning full diff », jamais « pruning diff » ;
//   (c) le commentaire persistant (`pr-agent:review:full`) écrit pendant ce
//       run ; s'il porte un bloc d'état, un seul, `head_sha` = tête,
//       `excluded_files` vide ;
//   (d) à côté de lui, depuis le début du run, au plus la description et
//       l'avis de mise à jour, reconnus à leur gabarit (liste fermée) ; et
//       aucune commande PR-Agent postée sur la PR après son début.
//
// PLUS STRICT QUE LA LETTRE, jamais plus ouvert (comme la sonde release-db) :
//   - (a) lit le DERNIER run `pull_request` de la tête, et exige que son
//     journal nomme cette PR (« Reviewing PR: …/pulls/<N> ») et aucune autre :
//     sans `pull_requests` dans la réponse de l'API, sha et branche ne
//     rattachent pas un run à une PR ;
//   - (b) refuse aussi un fichier écarté sans compression : extension refusée,
//     patch non étendu, patch trop gros, fichier illisible ;
//   - (c) borne l'écriture par la fin du run (réécrit après lui, le
//     commentaire ne vient plus de ce run) ; exige que l'en-tête « Review
//     updated until commit » nomme la tête quand il existe ; refuse un pied de
//     couverture partielle (« Review coverage », « Chunked review »), seule
//     trace d'un diff rogné quand la revue n'a pas de bloc (#1764) ;
//   - (d) ne borne pas sa fenêtre par la fin du run ; lit aussi les revues et
//     les commentaires en ligne de PR-Agent ; exige que l'avis nomme la tête ;
//     compte la commande d'un robot ; et refuse tout run sur commentaire du
//     dépôt, actif pendant le run, dont le journal ne dit pas qu'il a ignoré
//     son commentaire : une commande postée avant le début, éditée ou
//     supprimée a pu réécrire le commentaire persistant avec une revue
//     allégée (`--ignore.glob=`), qui porterait alors la tête.
//
// CODES DE SORTIE — `0` seul vaut revue de la tête :
//   0 preuve tenue · 1 preuve absente ou défaut · 2 lecture impossible
//   (jamais lue comme un 0) · 3 usage.

import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');

export const SORTIE_PREUVE = 0;
export const SORTIE_DEFAUT = 1;
export const SORTIE_ILLISIBLE = 2;
export const SORTIE_USAGE = 3;

/** L'auteur des commentaires de PR-Agent : le jeton du workflow. */
export const AUTEUR_PR_AGENT = 'github-actions[bot]';
export const WORKFLOW = '.github/workflows/pr_agent.yml';
export const MARQUEUR_REVUE = '<!-- pr-agent:review:full -->';
export const MARQUEUR_DESCRIPTION = '<!-- pr-agent:describe:persistent -->';
/** Préfixe d'espace de noms du bloc d'état (v0.49.0, `review_finding_state.py`). */
export const ESPACE_BLOC = '<!-- pr-agent-review-state';
const BLOC_RE = /<!-- pr-agent-review-state:v(\d+)\n([\s\S]*?)\n-->/;
/** L'avis de mise à jour : une ligne, et rien d'autre ; le sha est lu à part. */
const AVIS_RE = /^\*\*\[Persistent review\]\([^)\s]*\)\*\* updated to latest commit \S*\/commit\/([0-9a-f]{40})$/;
const ENTETE_RE = /Review updated until commit \S*?\/commit\/([0-9a-f]{40})/g;
/**
 * Les pieds de couverture partielle (v0.49.0, `pr_reviewer.py`) : fichiers
 * écartés ou rognés pour le budget, revue en morceaux. Sans remarque, la revue
 * n'a pas de bloc, donc pas d'`excluded_files` : ce pied est sa seule trace
 * dans le commentaire (constaté sur #1764, 2026-10-28).
 */
export const PIEDS_COUVERTURE = ['**Review coverage:**', '**Chunked review:**'];
export const JOURNAL_COMPLET = 'returning full diff';
export const JOURNAL_COMPRESSE = 'pruning diff';
/**
 * Fichiers écartés sans compression, que ni bloc ni pied ne disent
 * (v0.49.0 : `github_provider.py`, `pr_processing.py`). Les globs de
 * `ignore.glob` (clôture, verrou, images) restent admis : D-393 §2 les connaît.
 */
export const JOURNAL_ECARTS = [
  'Filtered out files with invalid extensions',
  'Failed to extend patch',
  'Patch too large, skipping',
  'File was fully skipped',
  'Unreadable-file',
];
/** Ce que l'action journalise quand un commentaire n'est pas une commande. */
export const JOURNAL_IGNORE = 'Ignoring comment not starting with /';
/** Depuis quand chercher un run sur commentaire encore actif au début du run. */
export const AVANCE_RUNS_COMMENTAIRE_MS = 60 * 60 * 1000;

const date = (iso) => {
  const t = Date.parse(iso ?? '');
  if (Number.isNaN(t)) throw new Error(`date illisible : ${iso}`);
  return t;
};

/**
 * Une commande PR-Agent, comme v0.49.0 la reconnaît (`github_action_runner.py`,
 * `github_common.py`) : un corps qui commence par « / » après les blancs de
 * `str.lstrip()` de Python (`\s` de JS, plus `\x1c`-`\x1f` et `\x85`), ou une
 * citation (« > ![image] … ») reformatée en `/ask` — toute citation qui
 * contient `/ask` compte, par prudence. Quel que soit l'expéditeur : la lettre
 * de D-393 §2(d) ne l'excepte pas.
 */
export const estCommande = (c) => {
  if (typeof c?.body !== 'string') return false;
  const corps = c.body.replace(/^[\s\x1c-\x1f\x85]+/u, '');
  return corps.startsWith('/') || (corps.startsWith('>') && corps.includes('/ask'));
};

/** Gabarit d'un commentaire de PR-Agent (`github-actions[bot]`). */
export function gabarit(corps, tete) {
  const c = typeof corps === 'string' ? corps : '';
  if (c.includes(MARQUEUR_REVUE)) return 'revue';
  if (c.includes(MARQUEUR_DESCRIPTION)) return 'description';
  const avis = AVIS_RE.exec(c.trim());
  if (avis && (tete === undefined || avis[1] === tete)) return 'avis';
  return 'autre';
}

/**
 * Le bloc d'état du commentaire persistant. Rend `{ present: false }`, ou
 * `{ present: true, defaut }` avec `defaut` à `null` quand le bloc est unique,
 * lisible, à la tête et sans fichier exclu.
 */
export function lireBloc(corps, tete) {
  const n = corps.split(ESPACE_BLOC).length - 1;
  if (n === 0) return { present: false, defaut: null };
  if (n > 1) return { present: true, defaut: `${n} blocs d'état — un seul admis` };
  const m = BLOC_RE.exec(corps);
  if (!m) return { present: true, defaut: "bloc d'état mal formé" };
  if (m[1] !== '1') return { present: true, defaut: `bloc d'état en version ${m[1]} — seule la v1 est connue` };
  let etat;
  try {
    etat = JSON.parse(m[2]);
  } catch {
    return { present: true, defaut: "bloc d'état illisible (JSON)" };
  }
  const run = etat?.last_run;
  if (!run || typeof run !== 'object') return { present: true, defaut: "bloc d'état sans `last_run`" };
  if (run.head_sha !== tete) return { present: true, defaut: `\`last_run.head_sha\` = ${String(run.head_sha).slice(0, 8)}, pas la tête` };
  if (!Array.isArray(run.excluded_files)) return { present: true, defaut: '`excluded_files` absent' };
  if (run.excluded_files.length > 0) {
    return { present: true, defaut: `${run.excluded_files.length} fichier(s) exclu(s) de la revue (${run.excluded_files.slice(0, 3).join(', ')})` };
  }
  return { present: true, defaut: null };
}

/** Le dernier run `pull_request` de la PR sur la tête, ou `null`. */
export function choisirRun(runs, { tete, branche }) {
  const candidats = runs.filter((r) => r.event === 'pull_request' && r.head_sha === tete && r.head_branch === branche);
  if (candidats.length === 0) return null;
  return candidats.sort((a, b) => date(b.run_started_at) - date(a.run_started_at) || b.id - a.id)[0];
}

/** Le run est-il vert et conclu ? Seul un tel run a un journal à lire. */
export const estVert = (run) => run?.status === 'completed' && run?.conclusion === 'success';

/** Les PR que nomme le journal, par leur URL d'API. */
const prsDuJournal = (journal) => [...journal.matchAll(/api\.github\.com\/repos\/([^/\s]+\/[^/\s]+)\/pulls\/(\d+)/g)].map((m) => `${m[1]}#${m[2]}`);

/**
 * Le verdict (D-393 §2). `run` : celui de `choisirRun`, ou `null`. `journal` :
 * texte du journal de ce run, lu seulement s'il est vert. `commentaires` :
 * ceux de la PR (issues/<N>/comments), à plat ; `revuesPr` et `enLigne` :
 * revues et commentaires en ligne de la PR. `runsCommentaire` : les runs sur
 * commentaire actifs pendant le run, chacun avec son `journal` (`null` s'il
 * n'est pas conclu). Rend `{ code, conditions: [{ id, ok, motif }] }`.
 */
export function juger({ pr, depot, tete, run, journal, commentaires, revuesPr = [], enLigne = [], runsCommentaire = [] }) {
  const conditions = [];
  const noter = (id, ok, motif) => conditions.push({ id, ok, motif });
  const nonEvaluees = (raison) => {
    for (const id of ['b', 'c', 'd']) noter(id, false, `non évaluée : ${raison}.`);
    return { code: SORTIE_DEFAUT, conditions };
  };

  if (!run) {
    noter('a', false, `aucun run \`pull_request\` de pr_agent.yml sur la tête ${tete.slice(0, 8)} (un run sur commentaire ne compte pas).`);
    return nonEvaluees('aucun run');
  }
  if (run.status !== 'completed') {
    noter('a', false, `run ${run.id} non conclu (${run.status}) — attendre sa fin.`);
    return nonEvaluees('run non conclu');
  }
  if (run.conclusion !== 'success') {
    noter('a', false, `run ${run.id} conclu \`${run.conclusion}\` — un run qui n'est pas vert ne prouve rien, même si un commentaire a été publié.`);
    return nonEvaluees("run qui n'est pas vert");
  }
  const nommees = [...new Set(prsDuJournal(journal))];
  const attendue = `${depot}#${pr}`;
  if (!journal.includes(`Reviewing PR: https://api.github.com/repos/${depot}/pulls/${pr} `) || nommees.some((n) => n !== attendue)) {
    noter('a', false, `le journal du run ${run.id} ne rattache pas la revue à la PR ${pr} seule (PR nommées : ${nommees.join(', ') || 'aucune'}).`);
  } else {
    noter('a', true, `run ${run.id}, \`pull_request\`, tête ${tete.slice(0, 8)}, conclu \`success\`, revue de la PR ${pr}.`);
  }
  const debut = date(run.run_started_at);
  const fin = date(run.updated_at);

  const ecarts = JOURNAL_ECARTS.filter((e) => journal.includes(e));
  if (journal.includes(JOURNAL_COMPRESSE)) {
    noter('b', false, `le journal dit « ${JOURNAL_COMPRESSE} » : diff compressé, la PR attend CodeRabbit.`);
  } else if (!journal.includes(JOURNAL_COMPLET)) {
    noter('b', false, `le journal ne dit pas « ${JOURNAL_COMPLET} ».`);
  } else if (ecarts.length > 0) {
    noter('b', false, `le journal dit « ${ecarts.join(' », « ')} » : un fichier a été écarté de la revue sans compression.`);
  } else {
    noter('b', true, `« ${JOURNAL_COMPLET} », aucun « ${JOURNAL_COMPRESSE} », aucun fichier écarté.`);
  }

  const duBot = commentaires.filter((c) => c.user?.login === AUTEUR_PR_AGENT);
  const revues = duBot.filter((c) => gabarit(c.body) === 'revue');
  if (revues.length === 0) {
    noter('c', false, `aucun commentaire persistant (\`${MARQUEUR_REVUE}\`).`);
  } else if (revues.length > 1) {
    noter('c', false, `${revues.length} commentaires persistants — un seul admis.`);
  } else {
    const corps = revues[0].body ?? '';
    const ecrit = date(revues[0].updated_at ?? revues[0].created_at);
    const bloc = lireBloc(corps, tete);
    const pied = PIEDS_COUVERTURE.find((p) => corps.includes(p));
    const entetes = [...corps.matchAll(ENTETE_RE)].map((m) => m[1]);
    // « Postérieure au début » (D-393 §2(c)) : l'égalité ne suffit pas.
    if (ecrit <= debut) noter('c', false, `commentaire persistant écrit avant le début du run (${revues[0].updated_at}).`);
    else if (ecrit > fin) noter('c', false, `commentaire persistant réécrit après la fin du run (${revues[0].updated_at}) : il ne vient plus de ce run.`);
    else if (bloc.defaut) noter('c', false, bloc.defaut);
    else if (entetes.some((s) => s !== tete)) noter('c', false, `l'en-tête « Review updated until commit » nomme ${entetes.find((s) => s !== tete).slice(0, 8)}, pas la tête.`);
    else if (pied) noter('c', false, `le commentaire persistant porte « ${pied} » : la revue ne couvre pas tout le diff.`);
    else noter('c', true, bloc.present ? 'écrit pendant le run ; bloc unique, à la tête, sans fichier exclu.' : "écrit pendant le run ; sans bloc (aucune remarque depuis l'ouverture).");
  }

  const defautsD = [];
  const pendant = duBot.filter((c) => gabarit(c.body) !== 'revue' && date(c.updated_at ?? c.created_at) >= debut);
  const parGabarit = (g) => pendant.filter((c) => gabarit(c.body, tete) === g);
  const autres = parGabarit('autre');
  if (autres.length > 0) {
    const tetes = autres.map((c) => `« ${String(c.body ?? '').trim().split('\n')[0].slice(0, 40)} »`).join(', ');
    defautsD.push(`${autres.length} autre(s) commentaire(s) de PR-Agent depuis le début du run (${tetes}) — liste fermée, un avis doit nommer la tête`);
  }
  for (const g of ['description', 'avis']) {
    const n = parGabarit(g).length;
    if (n > 1) defautsD.push(`${n} commentaires « ${g} » depuis le début du run — un seul admis`);
  }
  const ailleurs = [
    ...revuesPr.filter((r) => r.user?.login === AUTEUR_PR_AGENT && date(r.submitted_at ?? r.updated_at) >= debut),
    ...enLigne.filter((c) => c.user?.login === AUTEUR_PR_AGENT && date(c.updated_at ?? c.created_at) >= debut),
  ];
  if (ailleurs.length > 0) defautsD.push(`${ailleurs.length} revue(s) ou commentaire(s) en ligne de PR-Agent depuis le début du run`);
  const apres = commentaires.filter((c) => estCommande(c) && date(c.created_at) >= debut);
  if (apres.length > 0) defautsD.push(`${apres.length} commande(s) PR-Agent postée(s) après le début du run (${apres.map((c) => c.id).join(', ')})`);
  for (const r of runsCommentaire) {
    if (r.journal === null) defautsD.push(`run sur commentaire ${r.id} non conclu pendant le run`);
    else if (!r.journal.includes(JOURNAL_IGNORE)) defautsD.push(`run sur commentaire ${r.id}, actif pendant le run, a lancé une commande (« ${r.display_title ?? '?'} »)`);
  }
  if (defautsD.length > 0) noter('d', false, `${defautsD.join(' ; ')}.`);
  else noter('d', true, `depuis le début du run : ${pendant.length === 0 ? 'aucun autre commentaire' : pendant.map((c) => gabarit(c.body)).join(' et ')} ; aucune commande en cours ni postée après lui.`);

  return { code: conditions.every((c) => c.ok) ? SORTIE_PREUVE : SORTIE_DEFAUT, conditions };
}

export function analyserArguments(argv) {
  if (argv.length === 1 && /^[1-9]\d*$/.test(argv[0])) return { pr: Number(argv[0]) };
  return { erreur: 'usage : node scripts/wn-revue-pr-agent.mjs <numéro de PR>' };
}

const RUNS = 'repos/{owner}/{repo}/actions/workflows/pr_agent.yml/runs';
const iso = (t) => new Date(t).toISOString().replace(/\.\d{3}Z$/, 'Z');
const aPlat = (pages) => pages.flatMap((page) => page.workflow_runs ?? []);

/**
 * Collecte puis juge. Dépendances injectées : `lireJson(chemin, paginer)` —
 * `paginer` vrai rend le tableau de pages de `gh api --paginate --slurp`, faux
 * un seul objet — et `lireJournal(id)`, qui rend le journal d'un run. Toute
 * lecture qui lève rend `2`. Rend `{ code, lignes }`.
 */
export function lire({ pr, lireJson, lireJournal }) {
  const lignes = [];
  const avertissements = [];
  let tete;
  let verdict;
  let run = null;
  const journalDe = (id) => {
    const j = lireJournal(id);
    if (typeof j !== 'string') throw new Error(`journal du run ${id} illisible`);
    return j;
  };
  try {
    const p = lireJson(`repos/{owner}/{repo}/pulls/${pr}`, false);
    tete = p?.head?.sha;
    const branche = p?.head?.ref;
    const depot = p?.base?.repo?.full_name;
    if (!/^[0-9a-f]{40}$/.test(tete ?? '') || !branche || !depot) throw new Error('tête, branche ou dépôt de la PR illisible');
    run = choisirRun(aPlat(lireJson(`${RUNS}?head_sha=${tete}&event=pull_request&per_page=100`, true)), { tete, branche });
    const journal = estVert(run) ? journalDe(run.id) : null;
    const commentaires = lireJson(`repos/{owner}/{repo}/issues/${pr}/comments?per_page=100`, true).flat();
    const revuesPr = lireJson(`repos/{owner}/{repo}/pulls/${pr}/reviews?per_page=100`, true).flat();
    const enLigne = lireJson(`repos/{owner}/{repo}/pulls/${pr}/comments?per_page=100`, true).flat();
    const fichiers = lireJson(`repos/{owner}/{repo}/pulls/${pr}/files?per_page=100`, true).flat();
    if (fichiers.some((f) => f.filename === WORKFLOW || f.previous_filename === WORKFLOW)) {
      avertissements.push(`· la PR modifie ${WORKFLOW} : PR-Agent l'a revue sous la configuration qu'elle modifie — D-393 §6, \`wn-reviewer\` avant le merge, par sa file.`);
    }
    const runsCommentaire = [];
    if (estVert(run)) {
      const debut = date(run.run_started_at);
      const fin = date(run.updated_at);
      const fenetre = `${iso(debut - AVANCE_RUNS_COMMENTAIRE_MS)}..${iso(fin)}`;
      const candidats = aPlat(lireJson(`${RUNS}?event=issue_comment&created=${fenetre}&per_page=100`, true));
      // Actif pendant le run : créé avant sa fin, pas fini avant son début. Un
      // run sauté (expéditeur robot, non-membre) n'a rien exécuté.
      for (const r of candidats) {
        if (r.event !== 'issue_comment' || r.conclusion === 'skipped' || date(r.created_at) > fin) continue;
        if (r.status === 'completed' && date(r.updated_at) < debut) continue;
        runsCommentaire.push({ id: r.id, display_title: r.display_title, journal: r.status === 'completed' ? journalDe(r.id) : null });
      }
    }
    verdict = juger({ pr, depot, tete, run, journal, commentaires, revuesPr, enLigne, runsCommentaire });
  } catch (err) {
    lignes.push(`❌ Lecture impossible — la preuve n'est pas établie : ${String(err?.message ?? err).split('\n')[0]}`);
    lignes.push(`REVUE pr-agent code=${SORTIE_ILLISIBLE} pr=${pr}`);
    return { code: SORTIE_ILLISIBLE, lignes };
  }
  for (const c of verdict.conditions) lignes.push(`${c.ok ? '✓' : '❌'} (${c.id}) ${c.motif}`);
  lignes.push(...avertissements);
  lignes.push(`REVUE pr-agent code=${verdict.code} pr=${pr} tete=${tete}${run ? ` run=${run.id}` : ''}`);
  return { code: verdict.code, lignes };
}

// ── Câblage CLI ─────────────────────────────────────────────────────────────

// Tampon large : le journal d'un run et les commentaires d'une longue PR
// dépassent le Mio par défaut, et `ENOBUFS` se lirait « lecture impossible ».
function lancer(cmd, args) {
  return execFileSync(cmd, args, { cwd: RACINE, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 256 * 1024 * 1024 });
}

function principal(argv) {
  const args = analyserArguments(argv);
  if (args.erreur) {
    console.error(args.erreur);
    return SORTIE_USAGE;
  }
  const { code, lignes } = lire({
    pr: args.pr,
    lireJson: (chemin, paginer) => JSON.parse(lancer('gh', ['api', ...(paginer ? ['--paginate', '--slurp'] : []), chemin])),
    lireJournal: (id) => lancer('gh', ['run', 'view', String(id), '--log']),
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
