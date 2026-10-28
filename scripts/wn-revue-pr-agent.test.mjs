// Banc du lecteur de la revue PR-Agent (D-393 §2) — sans réseau : le noyau et
// la collecte reçoivent des lectures simulées, aux gabarits constatés sur
// #1766, #1769 et #1764 (PR-Agent v0.49.0). Le câblage dans `wn-merge` et la
// règle 1.6 se lit sur les fichiers réels.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  JOURNAL_ECARTS,
  JOURNAL_IGNORE,
  SORTIE_DEFAUT,
  SORTIE_ILLISIBLE,
  SORTIE_PREUVE,
  SORTIE_USAGE,
  analyserArguments,
  choisirRun,
  estCommande,
  gabarit,
  juger,
  lire,
  lireBloc,
} from './wn-revue-pr-agent.mjs';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const lireFichier = (chemin) => readFileSync(join(RACINE, chemin), 'utf8');
const TETE = 'a'.repeat(40);
const MAIN = 'b'.repeat(40);
const ANCIENNE = 'c'.repeat(40);
const BRANCHE = 'lot/exemple';
const DEPOT = 'proprietaire/depot';
const PR_N = 7;
const DEBUT = '2026-10-28T21:01:06Z';
const PENDANT = '2026-10-28T21:01:56Z';
const FIN = '2026-10-28T21:02:01Z';
const AVANT = '2026-10-28T20:57:16Z';
const APRES = '2026-10-28T21:30:00Z';
const URL = `https://github.com/${DEPOT}`;

const run = (champs = {}) => ({
  id: 100,
  event: 'pull_request',
  status: 'completed',
  conclusion: 'success',
  head_sha: TETE,
  head_branch: BRANCHE,
  run_started_at: DEBUT,
  created_at: DEBUT,
  updated_at: FIN,
  ...champs,
});
const runCommentaire = (champs = {}) => run({ id: 200, event: 'issue_comment', head_sha: MAIN, head_branch: 'main', created_at: PENDANT, updated_at: PENDANT, ...champs });
const nommer = (n = PR_N) => `pr_reviewer:run - Reviewing PR: https://api.github.com/repos/${DEPOT}/pulls/${n} ...`;
const JOURNAL = `${nommer()}\nget_pr_diff - Tokens: 6257, total tokens under limit: 32000, returning full diff.\npublish_persistent_comment_full - Persistent mode - updating comment`;
const bloc = (lastRun = {}) =>
  `<!-- pr-agent-review-state:v1\n${JSON.stringify({
    findings: [],
    last_run: { complete: true, excluded_files: [], head_sha: TETE, kind: 'full', run_id: `${URL}/commit/${TETE}`, ...lastRun },
    schema_version: 1,
  })}\n-->`;
const corpsRevue = (suite = bloc(), sha = TETE) => `## PR Reviewer Guide 🔍\n\n<!-- pr-agent:review:full -->\n\n#### (Review updated until commit ${URL}/commit/${sha})\n\n${suite}`;
const bot = { login: 'github-actions[bot]', type: 'Bot' };
const membre = { login: 'responsable', type: 'User' };
let prochainId = 1;
const commentaire = (body, champs = {}) => ({ id: prochainId++, user: bot, body, created_at: PENDANT, updated_at: PENDANT, ...champs });
const revue = (champs = {}, corps = corpsRevue()) => commentaire(corps, { created_at: AVANT, ...champs });
const DESCRIPTION = '## Title\n\n<!-- pr-agent:describe:persistent -->\n\ndocs : un titre';
const avis = (sha = TETE) => `**[Persistent review](${URL}/pull/7#issuecomment-1)** updated to latest commit ${URL}/commit/${sha}`;

const base = (champs = {}) => ({ pr: PR_N, depot: DEPOT, tete: TETE, run: run(), journal: JOURNAL, commentaires: [revue({ updated_at: PENDANT })], ...champs });
const etat = (v, id) => v.conditions.find((c) => c.id === id);
const seuleEchoue = (v, id) => {
  assert.equal(v.code, SORTIE_DEFAUT);
  for (const c of v.conditions) assert.equal(c.ok, c.id !== id, `(${c.id}) ${c.motif}`);
};
const nonEvaluees = (v) => {
  assert.equal(v.code, SORTIE_DEFAUT);
  for (const id of ['b', 'c', 'd']) assert.match(etat(v, id).motif, /non évaluée/);
};

// ── Le cas constaté : preuve tenue ──────────────────────────────────────────

test('preuve tenue : run vert de la PR, diff complet, revue écrite pendant le run, avis seul à côté', () => {
  const v = juger(base({ commentaires: [revue({ updated_at: PENDANT }), commentaire(avis())] }));
  assert.equal(v.code, SORTIE_PREUVE, JSON.stringify(v));
  assert.deepEqual(v.conditions.map((c) => c.id), ['a', 'b', 'c', 'd']);
});

test('preuve tenue à l’ouverture : revue créée pendant le run, avec la description', () => {
  const v = juger(base({ commentaires: [commentaire(DESCRIPTION), revue({ created_at: PENDANT, updated_at: PENDANT })] }));
  assert.equal(v.code, SORTIE_PREUVE, JSON.stringify(v));
});

test('revue sans remarque : aucun bloc, écrite pendant le run — preuve tenue', () => {
  const v = juger(base({ commentaires: [revue({ updated_at: PENDANT }, corpsRevue('Aucune remarque.'))] }));
  assert.equal(v.code, SORTIE_PREUVE, JSON.stringify(v));
  assert.match(etat(v, 'c').motif, /sans bloc/);
});

// ── (a) ─────────────────────────────────────────────────────────────────────

test('(a) : aucun run `pull_request` sur la tête — le reste non évalué', () => {
  const v = juger(base({ run: null, journal: null }));
  assert.match(etat(v, 'a').motif, /aucun run/);
  nonEvaluees(v);
});

test('(a) : run rouge avec commentaire publié — un run rouge ne prouve rien', () => {
  const v = juger(base({ run: run({ conclusion: 'failure' }), journal: null }));
  assert.match(etat(v, 'a').motif, /failure/);
  nonEvaluees(v);
});

test('(a) : run en cours, annulé ou sauté', () => {
  for (const champs of [{ status: 'in_progress', conclusion: null }, { conclusion: 'cancelled' }, { conclusion: 'skipped' }]) {
    nonEvaluees(juger(base({ run: run(champs), journal: null })));
  }
});

test('(a) seule : le journal ne nomme pas cette PR, ou en nomme une autre', () => {
  for (const journal of [JOURNAL.replace(nommer(), ''), JOURNAL.replace(nommer(), nommer(8)), `${JOURNAL}\n${nommer(8)}`, JOURNAL.replace(nommer(), nommer(70))]) {
    const v = juger(base({ journal }));
    seuleEchoue(v, 'a');
    assert.match(etat(v, 'a').motif, /ne rattache pas/);
  }
});

test('choix du run : un run sur commentaire, même nommant la tête, ne compte jamais', () => {
  // Le run `issue_comment` porte la tête de `main` : il ne sort pas d'une liste filtrée par la tête.
  assert.equal(choisirRun([runCommentaire()], { tete: TETE, branche: BRANCHE }), null);
  // Et si l'API rendait quand même un run sur commentaire à la tête, l'événement l'écarte.
  assert.equal(choisirRun([run({ event: 'issue_comment' })], { tete: TETE, branche: BRANCHE }), null);
});

test('choix du run : le dernier run de la tête l’emporte — un vert plus ancien ne couvre pas un rouge plus récent', () => {
  const vert = run({ id: 1, run_started_at: '2026-10-28T20:00:00Z' });
  const rouge = run({ id: 2, conclusion: 'failure', run_started_at: DEBUT });
  assert.equal(choisirRun([vert, rouge], { tete: TETE, branche: BRANCHE }).id, 2);
  // Une autre tête, une autre branche : écartées.
  assert.equal(choisirRun([run({ head_sha: ANCIENNE }), run({ head_branch: 'autre' })], { tete: TETE, branche: BRANCHE }), null);
});

// ── (b) ─────────────────────────────────────────────────────────────────────

test('(b) seule : « pruning diff » — la PR attend CodeRabbit, même si « returning full diff » figure aussi', () => {
  const v = juger(base({ journal: `${JOURNAL}\nTokens: 35667, total tokens over limit: 32000, pruning diff.` }));
  seuleEchoue(v, 'b');
  assert.match(etat(v, 'b').motif, /pruning diff/);
});

test('(b) seule : journal muet sur le diff', () => {
  seuleEchoue(juger(base({ journal: `${nommer()}\nPersistent mode - updating comment` })), 'b');
});

test('(b) seule : un fichier écarté sans compression (extension refusée, patch non étendu…)', () => {
  for (const ecart of JOURNAL_ECARTS) {
    const v = juger(base({ journal: `${JOURNAL}\n${ecart}: web/.gitignore` }));
    seuleEchoue(v, 'b');
    assert.match(etat(v, 'b').motif, /écarté/);
  }
});

// ── (c) ─────────────────────────────────────────────────────────────────────

test('(c) seule : bloc écrit avant le run — commentaire d’une tête précédente', () => {
  const v = juger(base({ commentaires: [revue({ updated_at: AVANT }, corpsRevue(bloc({ head_sha: ANCIENNE }), ANCIENNE))] }));
  seuleEchoue(v, 'c');
  assert.match(etat(v, 'c').motif, /avant le début/);
});

test('(c) seule : revue sans bloc écrite avant le run, ou à la seconde même du début', () => {
  seuleEchoue(juger(base({ commentaires: [revue({ updated_at: AVANT }, corpsRevue('Aucune remarque.'))] })), 'c');
  seuleEchoue(juger(base({ commentaires: [revue({ updated_at: DEBUT })] })), 'c');
});

test('(c) seule : commentaire réécrit après la fin du run', () => {
  const v = juger(base({ commentaires: [revue({ updated_at: APRES })] }));
  seuleEchoue(v, 'c');
  assert.match(etat(v, 'c').motif, /après la fin/);
});

test('(c) seule : deux blocs d’état', () => {
  const v = juger(base({ commentaires: [revue({ updated_at: PENDANT }, corpsRevue(`${bloc()}\n${bloc()}`))] }));
  seuleEchoue(v, 'c');
  assert.match(etat(v, 'c').motif, /2 blocs/);
});

test('(c) seule : bloc à une autre tête, fichiers exclus, bloc illisible', () => {
  const cas = [
    [bloc({ head_sha: ANCIENNE }), /pas la tête/],
    [bloc({ excluded_files: ['web/src/a.ts'] }), /exclu/],
    [bloc({ excluded_files: undefined }), /excluded_files/],
    ['<!-- pr-agent-review-state:v1\n{pas du json}\n-->', /illisible/],
    ['<!-- pr-agent-review-state:v2\n{}\n-->', /version 2/],
    ['<!-- pr-agent-review-state:v1 {} -->', /mal formé/],
  ];
  for (const [suite, motif] of cas) {
    const v = juger(base({ commentaires: [revue({ updated_at: PENDANT }, corpsRevue(suite))] }));
    seuleEchoue(v, 'c');
    assert.match(etat(v, 'c').motif, motif);
  }
});

test('(c) seule : sans bloc, un en-tête « Review updated until commit » qui nomme une autre tête', () => {
  const v = juger(base({ commentaires: [revue({ updated_at: PENDANT }, corpsRevue('Aucune remarque.', ANCIENNE))] }));
  seuleEchoue(v, 'c');
  assert.match(etat(v, 'c').motif, /en-tête/);
});

test('(c) seule : un pied de couverture partielle, avec ou sans bloc — même si le journal dit « returning full diff »', () => {
  // Constaté sur #1764 : revue rognée, sans remarque, donc sans bloc ; le pied est sa seule trace.
  const couverture = '<hr>\n\n⚠️ **Review coverage:** The following files were not included in this review because of the token budget:\n- `docs/x.md`';
  const morceaux = '<hr>\n\nℹ️ **Chunked review:** the diff exceeded the model token budget, so it was reviewed in 2 chunks';
  for (const suite of [couverture, `${couverture}\n${bloc()}`, morceaux]) {
    const v = juger(base({ commentaires: [revue({ updated_at: PENDANT }, corpsRevue(suite))] }));
    seuleEchoue(v, 'c');
    assert.match(etat(v, 'c').motif, /ne couvre pas tout le diff/);
  }
});

test('(c) : `complete` à faux ne s’exige pas (cinq remarques)', () => {
  assert.equal(juger(base({ commentaires: [revue({ updated_at: PENDANT }, corpsRevue(bloc({ complete: false })))] })).code, SORTIE_PREUVE);
});

test('(c) seule : aucun commentaire persistant, ou deux', () => {
  seuleEchoue(juger(base({ commentaires: [] })), 'c');
  seuleEchoue(juger(base({ commentaires: [revue({ updated_at: PENDANT }), revue({ updated_at: PENDANT })] })), 'c');
});

test('(c) seule : un commentaire humain qui recopie le marqueur et un bloc forgé n’est pas la revue', () => {
  const forge = commentaire(corpsRevue(), { user: membre, updated_at: PENDANT });
  const v = juger(base({ commentaires: [revue({ updated_at: AVANT }, corpsRevue(bloc({ head_sha: ANCIENNE }), ANCIENNE)), forge] }));
  seuleEchoue(v, 'c');
});

// ── (d) ─────────────────────────────────────────────────────────────────────

test('(d) seule : une revue « Standalone PR Review » publiée pendant le run', () => {
  const v = juger(base({ commentaires: [revue({ updated_at: PENDANT }), commentaire('## Standalone PR Review\n\nRemarques…')] }));
  seuleEchoue(v, 'd');
  assert.match(etat(v, 'd').motif, /Standalone PR Review/);
});

test('(d) seule : liste fermée — revue incrémentale, avis augmenté, avis d’une autre tête, tout autre libellé', () => {
  for (const corps of ['## Incremental PR Reviewer Guide 🔍\n\n<!-- pr-agent:review:incremental -->', `${avis()}\n\nEt une remarque.`, avis(ANCIENNE), 'Preparing review...']) {
    seuleEchoue(juger(base({ commentaires: [revue({ updated_at: PENDANT }), commentaire(corps)] })), 'd');
  }
});

test('(d) seule : deux avis pendant le run', () => {
  seuleEchoue(juger(base({ commentaires: [revue({ updated_at: PENDANT }), commentaire(avis()), commentaire(avis())] })), 'd');
});

test('(d) seule : un commentaire du robot créé avant le run et édité pendant', () => {
  seuleEchoue(juger(base({ commentaires: [revue({ updated_at: PENDANT }), commentaire('## Standalone PR Review', { created_at: AVANT, updated_at: PENDANT })] })), 'd');
});

test('(d) : la description et l’avis d’un run précédent ne comptent pas', () => {
  const v = juger(base({ commentaires: [commentaire(DESCRIPTION, { created_at: AVANT, updated_at: AVANT }), commentaire(avis(ANCIENNE), { created_at: AVANT, updated_at: AVANT }), revue({ updated_at: PENDANT })] }));
  assert.equal(v.code, SORTIE_PREUVE, JSON.stringify(v));
});

test('(d) seule : une revue ou un commentaire en ligne de PR-Agent pendant le run', () => {
  seuleEchoue(juger(base({ revuesPr: [{ user: bot, submitted_at: PENDANT, body: 'revue' }] })), 'd');
  seuleEchoue(juger(base({ enLigne: [{ user: bot, created_at: PENDANT, updated_at: PENDANT, body: 'remarque' }] })), 'd');
  // Ceux d'avant le run, ou d'un humain, ne comptent pas.
  assert.equal(juger(base({ revuesPr: [{ user: bot, submitted_at: AVANT }, { user: membre, submitted_at: PENDANT }] })).code, SORTIE_PREUVE);
});

test('(d) seule : une commande `/review` postée après le début du run, par qui que ce soit', () => {
  const corps = ['/review', '  /review --ignore.glob=[]', '/describe', '\x85/review', '> ![image](x.png)\n/ask pourquoi ?'];
  for (const c of corps) {
    for (const user of [membre, { login: 'coderabbitai[bot]', type: 'Bot' }]) {
      const v = juger(base({ commentaires: [revue({ updated_at: PENDANT }), commentaire(c, { user, created_at: PENDANT })] }));
      seuleEchoue(v, 'd');
      assert.match(etat(v, 'd').motif, /après le début/);
    }
  }
});

test('(d) : un run sur commentaire actif pendant le run qui a ignoré son commentaire — preuve tenue (constaté sur #1769)', () => {
  const v = juger(base({ runsCommentaire: [{ id: 200, journal: JOURNAL_IGNORE }] }));
  assert.equal(v.code, SORTIE_PREUVE, JSON.stringify(v));
});

test('(d) seule : un run sur commentaire actif pendant le run qui a lancé une commande, ou encore en cours', () => {
  // Commande postée avant le début, éditée ou supprimée : seul son run en garde la trace.
  let v = juger(base({ runsCommentaire: [{ id: 200, display_title: 'titre', journal: nommer() }] }));
  seuleEchoue(v, 'd');
  assert.match(etat(v, 'd').motif, /a lancé une commande/);
  v = juger(base({ runsCommentaire: [{ id: 200, journal: null }] }));
  seuleEchoue(v, 'd');
  assert.match(etat(v, 'd').motif, /non conclu/);
});

test('commande : ce que v0.49.0 lance', () => {
  assert.ok(estCommande({ user: membre, body: '/review' }));
  assert.ok(estCommande({ user: membre, body: '\n  /improve' }));
  assert.ok(estCommande({ user: membre, body: '\x1c\x85/review' }));
  assert.ok(estCommande({ user: membre, body: '> ![image](x)\n/ask quoi ?' }));
  assert.ok(estCommande({ user: { login: 'robot[bot]', type: 'Bot' }, body: '/review' }));
  assert.ok(!estCommande({ user: membre, body: 'Verdicts : `/review -i` ne compte jamais.' }));
  assert.ok(!estCommande({ user: membre, body: null }));
});

test('gabarits : revue, description, avis d’une ligne à la tête, autre', () => {
  assert.equal(gabarit(corpsRevue()), 'revue');
  assert.equal(gabarit(DESCRIPTION), 'description');
  assert.equal(gabarit(avis(), TETE), 'avis');
  assert.equal(gabarit(avis(ANCIENNE), TETE), 'autre');
  assert.equal(gabarit('**[Persistent review](x)** updated to latest commit'), 'autre');
  assert.equal(gabarit('## Standalone PR Review'), 'autre');
  assert.equal(gabarit(undefined), 'autre');
});

test('lireBloc : sans bloc, présent sans défaut', () => {
  assert.deepEqual(lireBloc('rien', TETE), { present: false, defaut: null });
  assert.deepEqual(lireBloc(bloc(), TETE), { present: true, defaut: null });
  // PR-Agent échappe « --> » dans le JSON : le bloc reste lisible.
  assert.equal(lireBloc(bloc({ note: 'a --\\u003e b' }), TETE).defaut, null);
});

// ── Collecte ────────────────────────────────────────────────────────────────

const PR = { head: { sha: TETE, ref: BRANCHE }, base: { repo: { full_name: DEPOT } } };
const api = (surcharges = {}) => {
  const appels = [];
  const lireJson = (chemin, paginer) => {
    appels.push(chemin);
    for (const [motif, valeur] of Object.entries(surcharges)) {
      if (motif === 'pr' ? chemin.endsWith(`/pulls/${PR_N}`) : chemin.includes(motif)) {
        if (valeur instanceof Error) throw valeur;
        return valeur;
      }
    }
    if (chemin.endsWith(`/pulls/${PR_N}`)) return PR;
    if (chemin.includes('event=pull_request')) return [{ workflow_runs: [run()] }];
    if (chemin.includes('event=issue_comment')) return [{ workflow_runs: [] }];
    if (chemin.includes(`/issues/${PR_N}/comments`)) return [[revue({ updated_at: PENDANT })], [commentaire(avis())]];
    if (chemin.includes(`/pulls/${PR_N}/reviews`) || chemin.includes(`/pulls/${PR_N}/comments`)) return [[]];
    if (chemin.includes(`/pulls/${PR_N}/files`)) return [[{ filename: 'scripts/x.mjs' }]];
    throw new Error(`chemin inattendu : ${chemin} (${paginer})`);
  };
  return { lireJson, appels };
};
const journaux = (table = {}) => {
  const lus = [];
  return { lus, lireJournal: (id) => (lus.push(id), id in table ? table[id] : JOURNAL) };
};

test('collecte : la preuve tenue sort en 0, avec la ligne REVUE et la tête entière', () => {
  const { lireJson, appels } = api();
  const r = lire({ pr: PR_N, lireJson, lireJournal: journaux().lireJournal });
  assert.equal(r.code, SORTIE_PREUVE, r.lignes.join('\n'));
  assert.equal(r.lignes.at(-1), `REVUE pr-agent code=0 pr=${PR_N} tete=${TETE} run=100`);
  assert.ok(appels.some((c) => c.includes(`head_sha=${TETE}`) && c.includes('event=pull_request')));
  // Les commentaires se lisent paginés, à plat : la seconde page porte l'avis.
  assert.match(r.lignes.find((l) => l.startsWith('✓ (d)')), /avis/);
});

test('collecte : les runs se lisent sur toutes les pages', () => {
  const { lireJson } = api({ 'event=pull_request': [{ workflow_runs: [run({ id: 1, run_started_at: '2026-10-28T20:00:00Z', conclusion: 'failure' })] }, { workflow_runs: [run()] }] });
  assert.equal(lire({ pr: PR_N, lireJson, lireJournal: journaux().lireJournal }).code, SORTIE_PREUVE);
});

test('collecte : un run `issue_comment` sur la tête de `main`, seul — défaut, jamais preuve', () => {
  const { lireJson } = api({ 'event=pull_request': [{ workflow_runs: [runCommentaire()] }] });
  assert.equal(lire({ pr: PR_N, lireJson, lireJournal: journaux().lireJournal }).code, SORTIE_DEFAUT);
});

test('collecte : un run en cours rend 1 avec son motif, sans lire de journal', () => {
  const { lireJson } = api({ 'event=pull_request': [{ workflow_runs: [run({ status: 'in_progress', conclusion: null })] }] });
  const { lus, lireJournal } = journaux();
  const r = lire({ pr: PR_N, lireJson, lireJournal });
  assert.equal(r.code, SORTIE_DEFAUT);
  assert.match(r.lignes[0], /attendre sa fin/);
  assert.deepEqual(lus, []);
});

test('collecte : runs sur commentaire — seuls ceux actifs pendant le run et non sautés se lisent', () => {
  const runs = [
    runCommentaire({ id: 201, created_at: '2026-10-28T21:00:30Z', updated_at: '2026-10-28T21:00:50Z' }), // fini avant le début
    runCommentaire({ id: 202, conclusion: 'skipped' }), // robot ou non-membre : rien exécuté
    runCommentaire({ id: 203 }), // a ignoré son commentaire
    runCommentaire({ id: 204, created_at: '2026-10-28T21:00:59Z', updated_at: APRES }), // commande d'avant le début, encore active
  ];
  const { lireJson, appels } = api({ 'event=issue_comment': [{ workflow_runs: runs }] });
  const { lus, lireJournal } = journaux({ 203: JOURNAL_IGNORE, 204: nommer() });
  const r = lire({ pr: PR_N, lireJson, lireJournal });
  assert.equal(r.code, SORTIE_DEFAUT, r.lignes.join('\n'));
  assert.match(r.lignes.find((l) => l.startsWith('❌ (d)')), /run sur commentaire 204/);
  assert.deepEqual(lus.sort(), [100, 203, 204]);
  assert.match(appels.find((c) => c.includes('event=issue_comment')), /created=2026-10-28T20:01:06Z\.\.2026-10-28T21:02:01Z/);
});

test('collecte : une PR qui modifie pr_agent.yml est signalée (D-393 §6)', () => {
  const { lireJson } = api({ [`/pulls/${PR_N}/files`]: [[{ filename: '.github/workflows/pr_agent.yml' }]] });
  const r = lire({ pr: PR_N, lireJson, lireJournal: journaux().lireJournal });
  assert.ok(r.lignes.some((l) => l.startsWith('· ') && l.includes('D-393 §6')), r.lignes.join('\n'));
});

test('collecte : toute lecture impossible sort en 2, jamais en 0', () => {
  const pannes = [
    { pr: new Error('HTTP 502') },
    { pr: { head: { sha: 'court', ref: BRANCHE }, base: PR.base } },
    { pr: { head: PR.head } },
    { 'event=pull_request': new Error('HTTP 403') },
    { [`/issues/${PR_N}/comments`]: new Error('HTTP 500') },
    { [`/pulls/${PR_N}/reviews`]: new Error('HTTP 500') },
    { [`/pulls/${PR_N}/files`]: new Error('HTTP 500') },
    { 'event=issue_comment': new Error('HTTP 500') },
    // Une date illisible n'est pas une preuve.
    { [`/issues/${PR_N}/comments`]: [[revue({ updated_at: 'hier' })]] },
  ];
  for (const surcharges of pannes) {
    const r = lire({ pr: PR_N, lireJson: api(surcharges).lireJson, lireJournal: journaux().lireJournal });
    assert.equal(r.code, SORTIE_ILLISIBLE, `${Object.keys(surcharges)} — ${r.lignes.join('\n')}`);
    assert.match(r.lignes[0], /Lecture impossible/);
  }
  const { lireJson } = api();
  assert.equal(lire({ pr: PR_N, lireJson, lireJournal: () => { throw new Error('journal expiré'); } }).code, SORTIE_ILLISIBLE);
  assert.equal(lire({ pr: PR_N, lireJson, lireJournal: () => undefined }).code, SORTIE_ILLISIBLE);
  // Le journal d'un run sur commentaire actif, illisible : pas de preuve.
  const { lireJson: avecRun } = api({ 'event=issue_comment': [{ workflow_runs: [runCommentaire({ id: 203 })] }] });
  assert.equal(lire({ pr: PR_N, lireJson: avecRun, lireJournal: journaux({ 203: undefined }).lireJournal }).code, SORTIE_ILLISIBLE);
});

// ── CLI, lecture seule, câblage ─────────────────────────────────────────────

test('arguments : un numéro de PR, rien d’autre', () => {
  assert.deepEqual(analyserArguments(['1766']), { pr: 1766 });
  for (const argv of [[], ['0'], ['abc'], ['1766', '1769'], ['-1']]) assert.ok(analyserArguments(argv).erreur, argv.join(' '));
});

test('CLI : un usage invalide sort en 3 sans rien lire', () => {
  for (const argv of [[], ['abc']]) {
    const r = spawnSync(process.execPath, [join(RACINE, 'scripts/wn-revue-pr-agent.mjs'), ...argv], { encoding: 'utf8' });
    assert.equal(r.status, SORTIE_USAGE);
    assert.match(r.stderr, /usage/);
  }
});

test('lecture seule : aucune écriture par l’API, ni commande gh qui agit', () => {
  const source = lireFichier('scripts/wn-revue-pr-agent.mjs');
  assert.doesNotMatch(source, /--method|['"]-X['"]|\b(POST|PATCH|PUT|DELETE)\b/);
  assert.doesNotMatch(source, /'gh', \['(pr|workflow|issue)'/);
  assert.doesNotMatch(source, /'git'/);
  // Seuls `gh api` (GET) et `gh run view --log`.
  assert.deepEqual([...source.matchAll(/lancer\('gh', \['([a-z]+)'(?:, '([a-z]+)')?/g)].map((m) => m.slice(1).filter(Boolean).join(' ')), ['api', 'run view']);
  assert.match(source, /\['run', 'view', String\(id\), '--log'\]/);
});

test('parité : le banc est enregistré dans `bancs-outillage-check`', () => {
  const { scripts } = JSON.parse(lireFichier('web/package.json'));
  assert.match(scripts['bancs-outillage-check'], /scripts\/wn-revue-pr-agent\.test\.mjs/);
});

test('wn-merge appelle le lecteur à l’étape 6, et la règle 1.6 le nomme', () => {
  const skill = lireFichier('.claude/skills/wn-merge/SKILL.md');
  const i6 = skill.indexOf('6. **Lire les commentaires de revue');
  const i7 = skill.indexOf('7. **Clôture opposable');
  const lecteur = skill.indexOf('node scripts/wn-revue-pr-agent.mjs <N>');
  assert.ok(i6 >= 0 && i7 > i6 && lecteur > i6 && lecteur < i7, 'le lecteur est appelé dans l’étape 6');
  assert.match(skill.slice(i6, i7), /`0` seul/);
  assert.match(skill.slice(i6, i7), /`tete=`/);
  assert.match(lireFichier('.claude/rules/pr-revue-et-release-db.md'), /node scripts\/wn-revue-pr-agent\.mjs <N>/);
});
