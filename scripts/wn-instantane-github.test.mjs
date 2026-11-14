// Banc de l'instantané GitHub (lot L2) — hermétique : l'API, les journaux et
// git sont des fonctions injectées ; aucun `gh`, aucun réseau, aucun dépôt.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  RE_DECLARATION,
  SORTIE_ECRIT,
  SORTIE_ILLISIBLE,
  SORTIE_PARTIEL,
  SORTIE_USAGE,
  analyserArguments,
  declarations,
  motifErreur,
  prendre,
  principal,
  resumerChecks,
  resumerCorps,
  sousLeDepot,
} from './wn-instantane-github.mjs';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const T0 = Date.parse('2026-01-10T12:00:00Z');
const TETE = 'a'.repeat(40);
const SECRET = 'TEXTE-LIBRE-A-NE-PAS-RECOPIER';

const commentaire = (body, extra = {}) => ({ body, user: { login: 'compte-exemple' }, author_association: 'OWNER', created_at: '2026-01-10T11:00:00Z', updated_at: '2026-01-10T11:00:00Z', ...extra });

test('déclaration : forme simple, gras, casse ; pas au milieu d\'une ligne', () => {
  for (const corps of [`prête @${TETE}`, `**Prête @${TETE}**`, `  PRÊTE @ ${TETE.slice(0, 7)}`, `prete @${TETE}`, `Intro\n\nprête @${TETE}\n- Handoff`]) {
    assert.ok(RE_DECLARATION.test(corps), corps);
  }
  for (const corps of [`pas prête @${TETE}`, `prête sans sha`, `prête @${TETE.slice(0, 6)}`]) {
    assert.ok(!RE_DECLARATION.test(corps), corps);
  }
});

test('déclarations : auteur, association, sha, tête, handoffs — sans le texte', () => {
  const ds = declarations([
    commentaire(`prête @${TETE}\n\n- Handoff : \`docs/claude/handoffs/2026-01-10-1200-exemple.md\`\n${SECRET}`),
    commentaire(`**Prête @${'b'.repeat(40)}**`, { author_association: 'CONTRIBUTOR', created_at: '2026-01-10T10:00:00Z' }),
    commentaire('Revue : rien à signaler.'),
    { body: null },
  ], TETE);
  assert.equal(ds.length, 2);
  assert.deepEqual(ds[0], { auteur: 'compte-exemple', association: 'OWNER', cree_le: '2026-01-10T11:00:00Z', modifie_le: '2026-01-10T11:00:00Z', sha: TETE, sur_tete: true, handoffs: ['docs/claude/handoffs/2026-01-10-1200-exemple.md'] });
  assert.equal(ds[1].sur_tete, false);
  assert.equal(ds[1].association, 'CONTRIBUTOR');
  assert.doesNotMatch(JSON.stringify(ds), new RegExp(SECRET));
});

test('checks : dernière exécution par nom, en échec, en cours, état exact du check requis', () => {
  const r = resumerChecks([{ check_runs: [
    { name: 'verify', status: 'completed', conclusion: 'success', started_at: '2026-01-10T11:00:00Z' },
    { name: 'lint', status: 'completed', conclusion: 'skipped', started_at: '2026-01-10T11:00:00Z' },
    { name: 'e2e', status: 'completed', conclusion: 'failure', started_at: '2026-01-10T11:00:00Z' },
    { name: 'pr-agent', status: 'in_progress', conclusion: null, started_at: '2026-01-10T11:00:00Z' },
  ] }, { check_runs: [
    { name: 'annule', status: 'completed', conclusion: 'cancelled' },
    { name: 'action', status: 'completed', conclusion: 'action_required' },
    { name: 'e2e', status: 'completed', conclusion: 'success', started_at: '2026-01-10T11:30:00Z' },
  ] }]);
  assert.deepEqual(r, { total: 6, succes: 3, echecs: ['action', 'annule'], en_cours: ['pr-agent'], requis: { verify: 'success' } }, 'le re-run vert de e2e remplace son échec');
  assert.deepEqual(resumerChecks([]), { total: 0, succes: 0, echecs: [], en_cours: [], requis: {} });
  assert.deepEqual(resumerChecks([{ check_runs: [{ name: 'verify', status: 'completed', conclusion: 'skipped' }] }]).requis, { verify: 'skipped' });
  assert.deepEqual(resumerChecks([{ check_runs: [{ name: 'verify', status: 'queued' }] }]).requis, { verify: 'en_cours' });
});

test('motif d\'erreur : une réponse illisible ne se recopie pas', () => {
  let err;
  try {
    JSON.parse(`{${SECRET}`);
  } catch (e) {
    err = e;
  }
  assert.equal(motifErreur(err), 'réponse illisible (JSON)');
  assert.equal(motifErreur(new Error('gh: HTTP 502: Bad Gateway (https://api.github.com/…)\nsuite')), 'HTTP 502');
  assert.equal(motifErreur(new Error('jeton ghp_abcdefghijklmnopqrstuvwxyz0123 refusé')), '(masqué)');
});

test('lecture seule : la source n\'écrit jamais côté GitHub', () => {
  const source = readFileSync(join(RACINE, 'scripts', 'wn-instantane-github.mjs'), 'utf8');
  assert.doesNotMatch(source, /'-X'|'--method'|'-f'|'-F'|'--field'|'--raw-field'|'--input'|\bPOST\b|\bPATCH\b|\bDELETE\b|\bPUT\b/);
  assert.match(source, /lancer\('gh', \['api', \.\.\.\(paginer \? \['--paginate', '--slurp'\] : \[\]\), chemin\]\)/);
});

test('sortie refusée dans tout arbre de travail : ce dépôt, une copie voisine, un lien, un dossier absent', () => {
  const base = mkdtempSync(join(tmpdir(), 'wn-instantane-'));
  try {
    const depot = join(base, 'depot');
    mkdirSync(join(depot, '.' + 'git'), { recursive: true });
    mkdirSync(join(depot, 'sous'), { recursive: true });
    const libre = join(base, 'libre');
    mkdirSync(libre);
    symlinkSync(join(depot, 'sous'), join(libre, 'lien'));
    assert.ok(sousLeDepot(join(depot, 'sous', 'i.json'), libre), 'copie voisine');
    assert.ok(sousLeDepot(join(libre, 'lien', 'i.json'), libre), 'lien symbolique vers un dépôt');
    assert.ok(sousLeDepot(join(base, 'absent', 'i.json'), libre), 'dossier parent introuvable');
    assert.ok(!sousLeDepot(join(libre, 'i.json'), join(base, 'autre')));
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('corps : longueur, empreinte, handoffs — jamais le texte', () => {
  const c = resumerCorps(`${SECRET}\ndocs/claude/handoffs/2026-01-10-1200-exemple.md`);
  assert.equal(c.handoffs[0], 'docs/claude/handoffs/2026-01-10-1200-exemple.md');
  assert.match(c.empreinte, /^[0-9a-f]{16}$/);
  assert.doesNotMatch(JSON.stringify(c), new RegExp(SECRET));
  assert.equal(resumerCorps(null).longueur, 0);
});

test('arguments et sortie : --sortie requis, refusé sous le dépôt', () => {
  assert.deepEqual(analyserArguments(['--sortie', '/tmp/i.json']).options, { sortie: '/tmp/i.json', sondes: true, fermees: 100 });
  assert.equal(analyserArguments(['--sortie', 'i', '--sans-sondes', '--fermees', '20']).options.fermees, 20);
  for (const argv of [[], ['--sortie'], ['--sortie', 'i', '--fermees', '0'], ['--sortie', 'i', '--fermees', '101'], ['--sortie', 'i', '--ecrire']]) {
    assert.ok(analyserArguments(argv).erreur, argv.join(' '));
  }
  assert.ok(sousLeDepot(join(RACINE, 'instantane.json')));
  assert.ok(sousLeDepot(RACINE));
  // La copie principale voisine se prouve en dossier temporaire (test
  // suivant) : au-dessus de RACINE, il y a un dépôt sur ce Mac, pas sur le runner.
  assert.ok(!sousLeDepot(join(tmpdir(), 'ailleurs.json')));
  assert.equal(principal(['--sortie', join(RACINE, 'web', 'instantane.json')], {}).code, SORTIE_USAGE);
});

// ── La collecte, sur une API simulée ────────────────────────────────────────

function api({ casse = [] } = {}) {
  const lus = [];
  const reponses = {
    'repos/{owner}/{repo}/pulls?state=open&per_page=100': [[
      { number: 101, title: SECRET, body: SECRET, draft: false, user: { login: 'compte-exemple' }, head: { sha: TETE, ref: 'chore/exemple', repo: { full_name: 'exemple/depot' } }, base: { ref: 'main' }, updated_at: '2026-01-10T11:30:00Z' },
      { number: 102, title: 'x', body: '', draft: true, user: { login: 'tiers' }, head: { sha: 'c'.repeat(40), ref: 'patch', repo: { full_name: 'tiers/depot' } }, base: { ref: 'main' }, updated_at: '2026-01-10T11:00:00Z' },
    ]],
    'repos/{owner}/{repo}/pulls?state=closed&sort=updated&direction=desc&per_page=100': [
      { number: 99, state: 'closed', merged_at: '2026-01-09T10:00:00Z', merge_commit_sha: 'd'.repeat(40), closed_at: '2026-01-09T10:00:00Z', user: { login: 'compte-exemple' }, head: { sha: 'e'.repeat(40) }, title: SECRET },
      { number: 98, state: 'closed', merged_at: null, closed_at: '2026-01-08T10:00:00Z', user: { login: 'compte-exemple' }, head: { sha: 'f'.repeat(40) } },
    ],
    'repos/{owner}/{repo}': { full_name: 'exemple/depot' },
    'repos/{owner}/{repo}/commits/main': { sha: '9'.repeat(40) },
    [`repos/{owner}/{repo}/commits/${TETE}`]: { author: { login: 'compte-exemple' }, committer: { login: 'web-flow' }, commit: { verification: { verified: true } } },
    [`repos/{owner}/{repo}/commits/${'c'.repeat(40)}`]: { author: null, committer: null, commit: {} },
    'repos/{owner}/{repo}/pulls/101/files?per_page=100': [[{ filename: 'scripts/a.mjs' }, { filename: 'docs/b.md', previous_filename: 'docs/a.md' }]],
    'repos/{owner}/{repo}/pulls/102/files?per_page=100': [[{ filename: 'scripts/a.mjs' }]],
    [`repos/{owner}/{repo}/commits/${TETE}/check-runs?per_page=100`]: [{ check_runs: [{ name: 'verify', status: 'completed', conclusion: 'success' }] }],
    [`repos/{owner}/{repo}/commits/${'c'.repeat(40)}/check-runs?per_page=100`]: [{ check_runs: [] }],
    'repos/{owner}/{repo}/issues/101/comments?per_page=100': [[commentaire(`prête @${TETE}`)]],
    'repos/{owner}/{repo}/issues/102/comments?per_page=100': [[]],
  };
  const lireJson = (chemin) => {
    lus.push(chemin);
    if (casse.some((c) => chemin.includes(c))) throw new Error(`HTTP 502 sur ${chemin}`);
    if (!(chemin in reponses)) throw new Error(`chemin non simulé : ${chemin}`);
    return structuredClone(reponses[chemin]);
  };
  return { lireJson, lus };
}
const sansReseau = { lireJournal: () => { throw new Error('journal non simulé'); }, git: () => { throw new Error('git non simulé'); }, maintenant: T0 };

test('collecte sans sondes : ouvertes en détail, fermées en bref, origine de la tête', () => {
  const { lireJson, lus } = api();
  const { code, instantane, erreurs } = prendre({ lireJson, ...sansReseau, sondes: false });
  assert.equal(code, SORTIE_ECRIT, JSON.stringify(erreurs));
  assert.equal(instantane.schema, 1);
  assert.equal(instantane.pris_le, '2026-01-10T12:00:00.000Z');
  assert.equal(instantane.tete_main, '9'.repeat(40));
  const [p101, p102, p99, p98] = instantane.prs;
  assert.equal(p101.meme_depot, true);
  assert.deepEqual(p101.commit, { auteur: 'compte-exemple', commiteur: 'web-flow', verifie: true });
  assert.deepEqual(p101.fichiers, ['docs/a.md', 'docs/b.md', 'scripts/a.mjs']);
  assert.equal(p101.declarations[0].sur_tete, true);
  assert.equal(p101.revue_pr_agent, null, 'sans sondes : non sondée, pas verte');
  assert.equal(p102.meme_depot, false, 'fork');
  assert.equal(p102.brouillon, true);
  assert.deepEqual([p99.etat, p99.merge_commit, p98.etat, p98.merge_commit], ['merged', 'd'.repeat(40), 'closed', null]);
  assert.doesNotMatch(JSON.stringify(instantane), new RegExp(SECRET), 'ni titre ni corps recopiés');
  assert.ok(lus.every((c) => !/\b(POST|PATCH|DELETE)\b/.test(c)));
});

test('une lecture en échec par PR : instantané partiel (1), la lecture dite', () => {
  const { lireJson } = api({ casse: ['check-runs'] });
  const { code, instantane, erreurs } = prendre({ lireJson, ...sansReseau, sondes: false });
  assert.equal(code, SORTIE_PARTIEL);
  assert.equal(instantane.prs[0].checks, null);
  assert.deepEqual(erreurs.map((e) => [e.pr, e.lecture]), [[101, 'checks'], [102, 'checks']]);
});

test('liste des PR illisible : rien n\'est écrit (2)', () => {
  const { lireJson } = api({ casse: ['state=open'] });
  const ecrits = [];
  const r = principal(['--sortie', join(tmpdir(), 'wn-instantane-banc.json')], { lireJson, ...sansReseau, ecrire: (c, x) => ecrits.push([c, x]) });
  assert.equal(r.code, SORTIE_ILLISIBLE);
  assert.deepEqual(ecrits, []);
  assert.match(r.lignes.at(-1), /^INSTANTANE code=2 rien écrit$/);
});

test('avec sondes : les gardes rendent leur code ; une lecture impossible reste 2, jamais 0', () => {
  const { lireJson } = api();
  const { instantane } = prendre({ lireJson, ...sansReseau, sondes: true });
  assert.equal(instantane.prs[0].revue_pr_agent.code, 2);
  assert.equal(instantane.prs[0].sonde_release_db.code, 2);
  assert.deepEqual(instantane.prs[0].checks.requis, { verify: 'success' });
});

test('une sonde qui lève : null et une erreur, jamais un code 0', () => {
  const { lireJson } = api();
  const leve = () => {
    throw new Error('sonde en panne');
  };
  const { code, instantane, erreurs } = prendre({ lireJson, ...sansReseau, sondes: true, gardes: { revue: leve, releaseDb: leve } });
  assert.equal(code, SORTIE_PARTIEL);
  assert.equal(instantane.prs[0].revue_pr_agent, null);
  assert.equal(instantane.prs[0].sonde_release_db, null);
  assert.deepEqual(erreurs.filter((e) => e.pr === 101).map((e) => e.lecture), ['revue PR-Agent', 'sonde release-db']);
  const vertes = prendre({ lireJson, ...sansReseau, sondes: true, gardes: { revue: () => ({ code: 0 }), releaseDb: () => ({ code: 0 }) } });
  assert.deepEqual([vertes.instantane.prs[0].revue_pr_agent, vertes.instantane.prs[0].sonde_release_db], [{ code: 0 }, { code: 0 }]);
});

test('principal : écrit le fichier demandé et rend une ligne machine', () => {
  const { lireJson } = api();
  const ecrits = [];
  const r = principal(['--sortie', join(tmpdir(), 'wn-instantane-banc.json'), '--sans-sondes'], { lireJson, ...sansReseau, ecrire: (c, x) => ecrits.push([c, x]) });
  assert.equal(r.code, SORTIE_ECRIT);
  assert.equal(ecrits.length, 1);
  assert.equal(ecrits[0][0], join(tmpdir(), 'wn-instantane-banc.json'));
  assert.equal(JSON.parse(ecrits[0][1]).prs.length, 4);
  assert.equal(r.lignes.at(-1), 'INSTANTANE code=0 pris_le=2026-01-10T12:00:00.000Z ouvertes=2 fermees=2 erreurs=0 sondes=non');
});
