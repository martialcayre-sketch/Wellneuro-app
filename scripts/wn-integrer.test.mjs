// Banc de `scripts/wn-integrer.mjs` (`D-546`). Le script de merge de
// l'intégrateur vivait hors dépôt, sans banc : chaque garde a ici ses cas, et
// le passage complet se joue sur des dépendances simulées — aucun appel à
// GitHub, aucun merge.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CODES,
  DELAI_FILET_S,
  DELAI_REPENTIR_S,
  MARQUE_INTEGRATEUR,
  declarationServie,
  etatBail,
  focusSansVerdict,
  integrer,
  operationBail,
  parolesApres,
  prendreBail,
  repliD448,
  secondesRestantes,
  verdictGardes,
} from './wn-integrer.mjs';

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'wn-integrer.mjs');
const SHA = 'a'.repeat(40);
const AUTRE_SHA = 'b'.repeat(40);
const T0 = '2026-11-20T10:00:00Z';
const ms = (iso) => Date.parse(iso);
const plus = (s) => ms(T0) + s * 1000;
const PROPRIO = { type: 'User', login: 'proprio' };
const commentaire = (id, body, at, user = PROPRIO, association = 'OWNER') => ({ id, body, created_at: at, user, author_association: association });

// ── Déclaration servie ─────────────────────────────────────────────────────

test('déclaration servie : la dernière sur ce sha, robots et autres sha écartés', () => {
  const cs = [
    commentaire(1, `prête @${SHA}`, '2026-11-20T09:00:00Z'),
    commentaire(2, `**prête @${SHA.slice(0, 8)}**`, T0),
    commentaire(3, `prête @${SHA}`, '2026-11-20T11:00:00Z', { type: 'Bot', login: 'robot' }),
    commentaire(4, `prête @${AUTRE_SHA}`, '2026-11-20T12:00:00Z'),
  ];
  assert.equal(declarationServie(cs, SHA).id, 2);
  assert.equal(declarationServie(cs, 'c'.repeat(40)), null);
});

test('déclaration servie : un préfixe de moins de sept caractères ne sert pas', () => {
  assert.equal(declarationServie([commentaire(1, 'prête @aaaaaa', T0)], SHA), null);
});

// ── Paroles après la déclaration ───────────────────────────────────────────

test('paroles : commentaire, revue soumise, en ligne ; la déclaration et l\'antérieur exclus', () => {
  const decl = commentaire(2, `prête @${SHA}`, T0);
  const p = parolesApres(decl, {
    commentaires: [decl, commentaire(1, 'avant', '2026-11-20T09:59:59Z'), commentaire(5, 'Refusé, ne pas merger.', '2026-11-20T10:02:00Z')],
    revues: [{ id: 7, user: { type: 'Bot', login: 'pr-agent' }, submitted_at: '2026-11-20T10:03:00Z' }, { id: 8, user: PROPRIO }],
    enLigne: [{ id: 9, user: PROPRIO, body: 'nit', created_at: '2026-11-20T10:01:00Z' }],
  });
  assert.deepEqual(p.map((x) => [x.type, x.id]), [['en-ligne', 9], ['commentaire', 5], ['revue', 7]]);
  assert.equal(p[2].robot, true);
});

test('paroles : un commentaire marqué de l\'intégrateur est signalé comme tel', () => {
  const decl = commentaire(2, `prête @${SHA}`, T0);
  const [p] = parolesApres(decl, { commentaires: [commentaire(6, `${MARQUE_INTEGRATEUR}\nPrise en charge.`, '2026-11-20T10:01:00Z')], proprietaire: 'proprio' });
  assert.equal(p.integrateur, true);
});

test('paroles : un tiers qui recopie la marque n\'est pas l\'intégrateur', () => {
  const decl = commentaire(2, `prête @${SHA}`, T0);
  const tiers = commentaire(6, `${MARQUE_INTEGRATEUR}\nok`, '2026-11-20T10:01:00Z', { type: 'User', login: 'tiers' }, 'NONE');
  const membre = commentaire(7, `${MARQUE_INTEGRATEUR}\nok`, '2026-11-20T10:01:00Z', PROPRIO, 'MEMBER');
  const p = parolesApres(decl, { commentaires: [tiers, membre], proprietaire: 'proprio' });
  assert.deepEqual(p.map((x) => x.integrateur), [false, false]);
  // Sans propriétaire lu, aucune marque ne vaut.
  assert.equal(parolesApres(decl, { commentaires: [commentaire(8, `${MARQUE_INTEGRATEUR}`, '2026-11-20T10:01:00Z')] })[0].integrateur, false);
});

test('paroles : une parole de la même seconde que la déclaration compte', () => {
  const decl = commentaire(2, `prête @${SHA}`, T0);
  assert.equal(parolesApres(decl, { commentaires: [commentaire(3, 'Non.', T0)] }).length, 1);
});

test('paroles : la marque ne vaut qu\'en première ligne d\'un commentaire humain de conversation', () => {
  const decl = commentaire(2, `prête @${SHA}`, T0);
  const apres = '2026-11-20T10:01:00Z';
  const p = parolesApres(decl, {
    commentaires: [
      commentaire(6, `Refus.\n> ${MARQUE_INTEGRATEUR}`, apres),
      commentaire(7, `${MARQUE_INTEGRATEUR}\nrobot`, apres, { type: 'Bot', login: 'robot' }),
    ],
    revues: [{ id: 8, user: PROPRIO, body: `${MARQUE_INTEGRATEUR}\nRefus`, submitted_at: apres }],
    enLigne: [{ id: 9, user: PROPRIO, body: `${MARQUE_INTEGRATEUR}\nRefus`, created_at: apres }],
  });
  assert.equal(p.length, 4);
  assert.ok(p.every((x) => x.integrateur === false));
});

test('modification : un ancien commentaire réécrit en « prête » n\'est jamais servi', () => {
  const vieux = { ...commentaire(1, `prête @${SHA}`, '2026-11-20T08:00:00Z'), updated_at: T0 };
  assert.equal(declarationServie([vieux], SHA), null);
  assert.equal(verdictGardes({ ...base, decl: declarationServie([vieux], SHA) }).code, CODES.declaration);
});

test('modification : une déclaration barrée n\'est plus servie ; la précédente est suspendue par la modification', () => {
  const premiere = commentaire(1, `prête @${SHA}`, '2026-11-20T09:00:00Z');
  const barree = { ...commentaire(2, `~~prête @${SHA}~~ retirée`, T0), updated_at: '2026-11-20T10:05:00Z' };
  assert.equal(declarationServie([barree], SHA), null);
  const servie = declarationServie([premiere, barree], SHA);
  assert.equal(servie.id, 1);
  const paroles = parolesApres(servie, { commentaires: [premiere, barree] });
  assert.equal(verdictGardes({ ...base, decl: servie, paroles, maintenantMs: plus(DELAI_REPENTIR_S + 600) }).code, CODES.parole);
});

test('modification : un commentaire antérieur modifié après la déclaration est une parole', () => {
  const decl = commentaire(2, `prête @${SHA}`, T0);
  const edite = { ...commentaire(1, 'Finalement, refus.', '2026-11-20T09:00:00Z'), updated_at: '2026-11-20T10:05:00Z' };
  const [p] = parolesApres(decl, { commentaires: [edite, decl] });
  assert.deepEqual([p.id, p.at], [1, '2026-11-20T10:05:00Z']);
});

// ── Verdict des gardes ─────────────────────────────────────────────────────

const decl = commentaire(2, `prête @${SHA}`, T0);
const BAIL = { session: '/s/integrateur', pris_le: T0 };
const base = { decl, motifs: [], paroles: [], maintenantMs: plus(DELAI_REPENTIR_S), mode: 'merge', bail: BAIL, session: '/s/integrateur' };
const parole = (extra = {}) => ({ type: 'commentaire', id: 5, auteur: 'proprio', robot: false, at: '2026-11-20T10:02:00Z', integrateur: false, ...extra });

for (const [libelle, e, code] of [
  ['tout vert, dix minutes pile', {}, CODES.ok],
  ['aucune déclaration', { decl: null }, CODES.declaration],
  ['origine non vérifiée', { motifs: ['fourche'] }, CODES.origine],
  ['parole humaine après la déclaration', { paroles: [parole()] }, CODES.parole],
  ['parole d\'un robot après la déclaration', { paroles: [parole({ robot: true, auteur: 'pr-agent' })] }, CODES.parole],
  ['prise en charge de l\'intégrateur seule', { paroles: [parole({ integrateur: true })] }, CODES.ok],
  ['délai non échu (9 min 59 s)', { maintenantMs: plus(DELAI_REPENTIR_S - 1) }, CODES.delai],
  ['bail libre', { bail: null }, CODES.bail],
  ['bail d\'une autre session', { bail: { session: '/s/autre' } }, CODES.bail],
  ['sans-merge : délai et bail dits, pas exigés', { mode: 'sans-merge', maintenantMs: plus(1), bail: null }, CODES.ok],
  ['sans-merge : la parole suspend quand même', { mode: 'sans-merge', paroles: [parole()] }, CODES.parole],
  ['filet : avant vingt minutes', { mode: 'filet', bail: null, maintenantMs: plus(DELAI_FILET_S - 1) }, CODES.delai],
  ['filet : vingt minutes, sans bail', { mode: 'filet', bail: null, maintenantMs: plus(DELAI_FILET_S) }, CODES.ok],
  ['filet : l\'intégrateur a pris la PR', { mode: 'filet', bail: null, maintenantMs: plus(DELAI_FILET_S), paroles: [parole({ integrateur: true })] }, CODES.parole],
]) {
  test(`gardes : ${libelle} → ${code}`, () => {
    assert.equal(verdictGardes({ ...base, ...e }).code, code);
  });
}

// ── Focus areas de PR-Agent (partie 14) ─────────────────────────────────────

for (const [libelle, e, code] of [
  ['focus areas toutes citées', { focus: { titres: ['A'], manquants: [] } }, CODES.ok],
  ['une focus area sans verdict', { focus: { titres: ['A', 'B'], manquants: ['B'] } }, CODES.focus],
  ['focus areas illisibles', { focus: { titres: null, manquants: [] } }, CODES.focus],
  ['sans-merge : une focus area sans verdict refuse aussi', { mode: 'sans-merge', bail: null, focus: { titres: ['A'], manquants: ['A'] } }, CODES.focus],
  ['filet : une focus area sans verdict refuse aussi', { mode: 'filet', bail: null, maintenantMs: plus(DELAI_FILET_S), focus: { titres: ['A'], manquants: ['A'] } }, CODES.focus],
  ['aucune déclaration passe avant les focus areas', { decl: null, focus: { titres: null, manquants: [] } }, CODES.declaration],
]) {
  test(`gardes : ${libelle} → ${code}`, () => {
    assert.equal(verdictGardes({ ...base, ...e }).code, code);
  });
}

test('gardes : le motif nomme chaque titre sans verdict', () => {
  const v = verdictGardes({ ...base, focus: { titres: ['Garde affaiblie', 'Tri incomplet'], manquants: ['Tri incomplet'] } });
  assert.match(v.motif, /^1 focus area\(s\) de PR-Agent sans verdict cité jusqu'à la déclaration : « Tri incomplet » — /);
});

const BOT_ACTIONS = { type: 'Bot', login: 'github-actions[bot]' };
const zoneFocus = (titre) => `<details><summary><a href='https://x/pull/42/files#diff-1'><strong>${titre}</strong></a>\n\nExplication.\n</summary>\n</details>`;
const revuePrAgent = (titres, at = '2026-11-20T09:40:00Z') => ({
  id: 900,
  user: BOT_ACTIONS,
  created_at: '2026-11-20T09:00:00Z',
  updated_at: at,
  body: `## PR Reviewer Guide 🔍\n\n<!-- pr-agent:review:full -->\n\n<table>\n<tr><td>⚡&nbsp;<strong>${titres.length ? 'Recommended focus areas for review' : 'No major issues detected'}</strong><br><br>\n\n${titres.map(zoneFocus).join('\n\n')}\n</td></tr>\n</table>`,
});

test('focus : sans commentaire persistant, rien à exiger', () => {
  assert.deepEqual(focusSansVerdict(decl, { commentaires: [decl], proprietaire: 'proprio' }), { titres: [], manquants: [] });
});

test('focus : revue sans focus area, rien à exiger', () => {
  assert.deepEqual(focusSansVerdict(decl, { commentaires: [revuePrAgent([]), decl], proprietaire: 'proprio' }).manquants, []);
});

test('focus : cité dans un commentaire de verdict antérieur, ou dans la déclaration elle-même', () => {
  const verdicts = commentaire(3, '- **Garde affaiblie** : écartée, avec motif.', '2026-11-20T09:50:00Z');
  const declCitante = commentaire(4, `Verdict : « Tri incomplet », corrigé.\nprête @${SHA}`, T0);
  const r = focusSansVerdict(declCitante, { commentaires: [revuePrAgent(['Garde affaiblie', 'Tri incomplet']), verdicts, declCitante], proprietaire: 'proprio' });
  assert.deepEqual(r, { titres: ['Garde affaiblie', 'Tri incomplet'], manquants: [] });
});

test('focus : la déclaration seule, sans citation (#2274, #2278) → manquants', () => {
  const r = focusSansVerdict(decl, { commentaires: [revuePrAgent(['Décision D-xxx absente', 'Licence CC BY-NC']), decl], proprietaire: 'proprio' });
  assert.deepEqual(r.manquants, ['Décision D-xxx absente', 'Licence CC BY-NC']);
});

test('focus : une citation postérieure à la déclaration ne compte pas (la parole suspend, la file redéclare)', () => {
  const tard = commentaire(6, '**Garde affaiblie** : routée.', '2026-11-20T10:01:00Z');
  assert.deepEqual(focusSansVerdict(decl, { commentaires: [revuePrAgent(['Garde affaiblie']), decl, tard], proprietaire: 'proprio' }).manquants, ['Garde affaiblie']);
});

test('focus : une citation antérieure modifiée après la déclaration ne compte pas', () => {
  const edite = { ...commentaire(6, '**Garde affaiblie** : routée.', '2026-11-20T09:50:00Z'), updated_at: '2026-11-20T10:01:00Z' };
  assert.deepEqual(focusSansVerdict(decl, { commentaires: [revuePrAgent(['Garde affaiblie']), edite, decl], proprietaire: 'proprio' }).manquants, ['Garde affaiblie']);
});

test('focus : la citation d\'un tiers, d\'un robot ou d\'un non-OWNER ne compte pas', () => {
  const revue = revuePrAgent(['Garde affaiblie']);
  for (const auteur of [
    commentaire(7, '**Garde affaiblie** : écartée.', '2026-11-20T09:50:00Z', { type: 'User', login: 'tiers' }, 'CONTRIBUTOR'),
    commentaire(7, '**Garde affaiblie** : écartée.', '2026-11-20T09:50:00Z', { type: 'Bot', login: 'proprio' }),
    commentaire(7, '**Garde affaiblie** : écartée.', '2026-11-20T09:50:00Z', PROPRIO, 'MEMBER'),
  ]) {
    assert.deepEqual(focusSansVerdict(decl, { commentaires: [revue, auteur, decl], proprietaire: 'proprio' }).manquants, ['Garde affaiblie']);
  }
  // Propriétaire inconnu : personne ne cite.
  const cite = commentaire(7, '**Garde affaiblie** : écartée.', '2026-11-20T09:50:00Z');
  assert.deepEqual(focusSansVerdict(decl, { commentaires: [revue, cite, decl], proprietaire: '' }).manquants, ['Garde affaiblie']);
});

test('focus : la marque recopiée par un humain n\'est pas la revue de PR-Agent', () => {
  const leurre = { ...revuePrAgent(['Leurre']), user: PROPRIO, author_association: 'OWNER' };
  assert.deepEqual(focusSansVerdict(decl, { commentaires: [leurre, decl], proprietaire: 'proprio' }), { titres: [], manquants: [] });
});

test('focus : de deux commentaires persistants, le dernier écrit fait foi', () => {
  const ancien = { ...revuePrAgent(['Ancien'], '2026-11-20T09:10:00Z'), id: 901 };
  const recent = revuePrAgent(['Récent'], '2026-11-20T09:40:00Z');
  assert.deepEqual(focusSansVerdict(decl, { commentaires: [recent, ancien, decl], proprietaire: 'proprio' }).titres, ['Récent']);
});

test('focus : le commentaire marqué de l\'intégrateur qui reprend un refus ne cite pas pour la file', () => {
  const refus = commentaire(3, `${MARQUE_INTEGRATEUR}\nREFUS code=26 : 1 focus area(s) … « Garde affaiblie » — la file redéclare`, '2026-11-20T09:50:00Z');
  assert.deepEqual(focusSansVerdict(decl, { commentaires: [revuePrAgent(['Garde affaiblie']), refus, decl], proprietaire: 'proprio' }).manquants, ['Garde affaiblie']);
});

test('focus : manquant et parole après la déclaration → 26 l\'emporte (même geste : redéclarer)', () => {
  const v = verdictGardes({ ...base, paroles: [parole()], focus: { titres: ['A'], manquants: ['A'] } });
  assert.equal(v.code, CODES.focus);
});

test('focus : une remarque d\'une tête précédente, « résolue » au bloc, attend encore son verdict', () => {
  const etat = { findings: [{ body: '**Incohérence documentaire**\n\nExplication.', state: 'RESOLVED', last_seen_head_sha: AUTRE_SHA }], last_run: { head_sha: SHA, excluded_files: [] } };
  const r = revuePrAgent([]);
  r.body += `\n\n<!-- pr-agent-review-state:v1\n${JSON.stringify(etat)}\n-->`;
  assert.deepEqual(focusSansVerdict(decl, { commentaires: [r, decl], proprietaire: 'proprio' }).manquants, ['Incohérence documentaire']);
  const cite = commentaire(3, '« Incohérence documentaire » (tête précédente) : corrigée en 1234567.', '2026-11-20T09:50:00Z');
  assert.deepEqual(focusSansVerdict(decl, { commentaires: [r, cite, decl], proprietaire: 'proprio' }).manquants, []);
});

test('focus : section présente, gabarit inconnu → titres null', () => {
  const r = { ...revuePrAgent([]), body: '<!-- pr-agent:review:full -->\nRecommended focus areas for review\n- Garde affaiblie' };
  assert.equal(focusSansVerdict(decl, { commentaires: [r, decl], proprietaire: 'proprio' }).titres, null);
});

test('gardes : en sans-merge, le délai restant est dit dans les notes', () => {
  const v = verdictGardes({ ...base, mode: 'sans-merge', maintenantMs: plus(60), bail: null });
  assert.equal(v.notes.length, 2);
  assert.match(v.notes[0], /encore 540 s/);
});

test('délai : une date illisible ne vaut jamais délai échu', () => {
  assert.equal(secondesRestantes('pas une date', plus(10_000), DELAI_REPENTIR_S), DELAI_REPENTIR_S);
});

// ── Bail ───────────────────────────────────────────────────────────────────

test('bail : prise, tenue, refus, reprise déclarée', () => {
  assert.equal(etatBail(null, 's1'), 'libre');
  assert.equal(etatBail({}, 's1'), 'libre');
  const pris = prendreBail(null, 's1', T0);
  assert.deepEqual([pris.ok, pris.bail], [true, { session: 's1', pris_le: T0 }]);
  assert.equal(prendreBail(pris.bail, 's1', T0).bail, pris.bail);
  assert.equal(prendreBail(pris.bail, 's2', T0).ok, false);
  const repris = prendreBail(pris.bail, 's2', T0, { reprendre: true });
  assert.deepEqual(repris.bail, { session: 's2', pris_le: T0, repris_de: 's1' });
});

test('bail sur disque : prise, refus, reprise, rendu, verrou tenu, fichier illisible', () => {
  const rep = mkdtempSync(path.join(tmpdir(), 'wn-integrer-bail-'));
  try {
    assert.equal(operationBail(rep, 'prendre', 's1', { quand: T0 }).code, CODES.ok);
    assert.equal(operationBail(rep, 'prendre', 's2', { quand: T0 }).code, CODES.bail);
    assert.equal(operationBail(rep, 'rendre', 's2', { quand: T0 }).code, CODES.bail);
    assert.equal(operationBail(rep, 'prendre', 's2', { quand: T0, reprendre: true }).code, CODES.ok);
    // L'ancien tenant ne peut plus effacer le bail repris.
    assert.equal(operationBail(rep, 'rendre', 's1', { quand: T0 }).code, CODES.bail);
    assert.match(operationBail(rep, 'voir', 's2').texte, /bail tenu/);
    // Un verrou déjà pris : refus, sans nouvel essai.
    mkdirSync(path.join(rep, 'bail.verrou'));
    assert.equal(operationBail(rep, 'rendre', 's2', { quand: T0 }).code, CODES.bail);
    rmdirSync(path.join(rep, 'bail.verrou'));
    assert.equal(operationBail(rep, 'rendre', 's2', { quand: T0 }).code, CODES.ok);
    assert.match(operationBail(rep, 'voir', 's2').texte, /bail libre/);
    // Un bail illisible n'est jamais libre.
    writeFileSync(path.join(rep, 'bail.json'), '{pas du json');
    assert.equal(operationBail(rep, 'prendre', 's3', { quand: T0 }).code, CODES.bail);
    assert.equal(operationBail(rep, 'prendre', 's3', { quand: T0, reprendre: true }).code, CODES.ok);
    const j = readFileSync(path.join(rep, 'journal.jsonl'), 'utf8').trim().split('\n').map((x) => JSON.parse(x));
    assert.deepEqual(j.map((x) => x.bail), ['pris', 'pris', 'rendu', 'pris']);
    assert.equal(j[1].motif, 'repris de s1');
  } finally { rmSync(rep, { recursive: true, force: true }); }
});

// ── Passage complet, dépendances simulées ──────────────────────────────────

function simulation({ lectures, codesEtapes = {}, copiePrincipale = true, maintenantMs = plus(DELAI_REPENTIR_S + 5), empilees = [], bail = BAIL, mainDistant = 'm'.repeat(40), codeFf = 0, scriptsDiffèrent = false }) {
  const rep = mkdtempSync(path.join(tmpdir(), 'wn-integrer-'));
  const appels = [];
  const dits = [];
  let lu = 0;
  const deps = {
    dire: (x) => dits.push(x),
    lancerCmd: (cmd, args) => {
      appels.push([cmd, ...args].join(' '));
      if (cmd === 'node') return { code: codesEtapes[path.basename(args[0])] ?? 0, texte: 'ok\n' };
      if (cmd === 'git' && args[0] === 'ls-remote') return { code: 0, texte: `${mainDistant}\trefs/heads/main\n` };
      if (cmd === 'git' && args[0] === 'rev-parse' && args[1] === 'origin/main') return { code: 0, texte: `${'m'.repeat(40)}\n` };
      if (cmd === 'git' && args[0] === 'diff' && args[1] === '--quiet') return { code: scriptsDiffèrent ? 1 : 0, texte: '' };
      if (cmd === 'git' && args[0] === 'merge' && args[1] === '--ff-only') return { code: codeFf, texte: codeFf ? 'fatal: Not possible to fast-forward\n' : 'Fast-forward\n' };
      return { code: 0, texte: '' };
    },
    lire: () => {
      const l = lectures[Math.min(lu, lectures.length - 1)];
      lu++;
      if (l instanceof Error) throw l;
      return l;
    },
    maintenant: () => maintenantMs,
    session: '/s/integrateur',
    scratch: rep,
    rep,
    copiePrincipale,
    lireBail: () => bail,
    prsSurBase: () => empilees,
  };
  const journal = () => readFileSync(path.join(rep, 'journal.jsonl'), 'utf8').trim().split('\n').map((x) => JSON.parse(x));
  return { deps, appels, dits, journal, nettoyer: () => rmSync(rep, { recursive: true, force: true }) };
}

const lecture = ({ commentaires = [decl], revues = [], enLigne = [], head = SHA, state = 'OPEN', merge = null } = {}) => ({
  pr: { number: 42, state, headRefOid: head, headRefName: 'docs/lot', title: 'docs(x) : lot', isCrossRepository: false, headRepositoryOwner: { login: 'proprio' }, mergeCommit: merge },
  proprietaire: 'proprio',
  nomDepot: 'proprio/depot',
  commentaires,
  revues,
  enLigne,
});
const merges = (appels) => appels.filter((a) => a.startsWith('gh pr merge'));

test('passage : tout vert → merge lié au sha, journal à 0, avance de la copie', async () => {
  const s = simulation({ lectures: [lecture(), lecture(), lecture({ state: 'MERGED', merge: { oid: 'c'.repeat(40) } })] });
  try {
    assert.equal(await integrer(42, SHA, 'merge', s.deps), CODES.ok);
    const [m] = merges(s.appels);
    assert.match(m, new RegExp(`--squash --delete-branch --match-head-commit ${SHA} --subject docs\\(x\\) : lot \\(#42\\)`));
    assert.ok(s.appels.includes('git merge --ff-only origin/main'));
    const [j] = s.journal();
    assert.deepEqual([j.code, j.commit, j.filet], [0, 'c'.repeat(40), false]);
  } finally { s.nettoyer(); }
});

test('passage : une parole arrivée pendant les contrôles suspend, aucun merge', async () => {
  const refus = commentaire(5, 'Non, ne pas merger.', '2026-11-20T10:10:30Z');
  const s = simulation({ lectures: [lecture(), lecture({ commentaires: [decl, refus] })] });
  try {
    assert.equal(await integrer(42, SHA, 'merge', s.deps), CODES.parole);
    assert.equal(merges(s.appels).length, 0);
    assert.match(s.journal()[0].motif, /^avant merge : suspendue/);
  } finally { s.nettoyer(); }
});

test('passage : délai non échu → 20, avant tout contrôle coûteux', async () => {
  const s = simulation({ lectures: [lecture()], maintenantMs: plus(120) });
  try {
    assert.equal(await integrer(42, SHA, 'merge', s.deps), CODES.delai);
    assert.equal(s.appels.filter((a) => a.startsWith('node ')).length, 0);
  } finally { s.nettoyer(); }
});

test('passage : contrôle de fusion rouge → 12, la suite ne joue pas', async () => {
  const s = simulation({ lectures: [lecture()], codesEtapes: { 'wn-controle-fusion.mjs': 2 } });
  try {
    assert.equal(await integrer(42, SHA, 'merge', s.deps), CODES.controle);
    assert.ok(!s.appels.some((a) => a.includes('wn-chevauchement')));
    assert.equal(merges(s.appels).length, 0);
  } finally { s.nettoyer(); }
});

for (const [libelle, opts, code] of [
  ['hors de la copie principale', { copiePrincipale: false }, CODES.usage],
  ['lecture GitHub impossible', { lectures: [new Error('403')] }, CODES.lecture],
  ['PR déjà fermée', { lectures: [lecture({ state: 'CLOSED' })] }, CODES.merge],
  ['tête déplacée', { lectures: [lecture({ head: AUTRE_SHA, commentaires: [decl] })] }, CODES.teteDeplacee],
  ['PR empilées', { empilees: [43] }, CODES.empilees],
  ['bail tenu par une autre session', { bail: { session: '/s/autre' } }, CODES.bail],
  ['sonde release-db gelée', { codesEtapes: { 'wn-sonde-release-db.mjs': 1 } }, CODES.releaseDb],
]) {
  test(`passage : ${libelle} → ${code}, aucun merge`, async () => {
    const s = simulation({ lectures: [lecture()], ...opts });
    try {
      assert.equal(await integrer(42, SHA, 'merge', s.deps), code);
      assert.equal(merges(s.appels).length, 0);
      assert.equal(s.journal()[0].code, code);
    } finally { s.nettoyer(); }
  });
}

test('passage : focus area sans verdict → 26, avant tout contrôle coûteux, aucun merge', async () => {
  const s = simulation({ lectures: [lecture({ commentaires: [revuePrAgent(['Garde affaiblie']), decl] })] });
  try {
    assert.equal(await integrer(42, SHA, 'merge', s.deps), CODES.focus);
    assert.equal(s.appels.filter((a) => a.startsWith('node ')).length, 0);
    assert.equal(merges(s.appels).length, 0);
    assert.match(s.journal()[0].motif, /« Garde affaiblie »/);
  } finally { s.nettoyer(); }
});

test('passage : focus area citée avant la déclaration → merge', async () => {
  const verdict = commentaire(3, 'PR-Agent, « Garde affaiblie » : routée au carnet.', '2026-11-20T09:50:00Z');
  const commentaires = [revuePrAgent(['Garde affaiblie']), verdict, decl];
  const s = simulation({ lectures: [lecture({ commentaires }), lecture({ commentaires }), lecture({ commentaires, state: 'MERGED', merge: { oid: 'c'.repeat(40) } })] });
  try {
    assert.equal(await integrer(42, SHA, 'merge', s.deps), CODES.ok);
    assert.equal(merges(s.appels).length, 1);
  } finally { s.nettoyer(); }
});

test('passage : main avancé puis rattrapé par un autre fetch du clone → 15, aucun merge', async () => {
  // `origin/main` local reste `m…` dans la simulation, le distant est `n…` :
  // la garde compare au main vu au début, pas à une valeur relue.
  const s = simulation({ lectures: [lecture()], mainDistant: 'n'.repeat(40) });
  try {
    assert.equal(await integrer(42, SHA, 'merge', s.deps), CODES.mainBouge);
    assert.equal(merges(s.appels).length, 0);
  } finally { s.nettoyer(); }
});

test('passage : merge fait mais --ff-only refusé → 25, dit et journalisé', async () => {
  const s = simulation({ lectures: [lecture(), lecture(), lecture()], codeFf: 1 });
  try {
    assert.equal(await integrer(42, SHA, 'merge', s.deps), CODES.avance);
    assert.equal(merges(s.appels).length, 1);
    assert.deepEqual(s.journal().map((j) => j.code), [0, CODES.avance]);
  } finally { s.nettoyer(); }
});

test('passage : scripts/ différent de main (filet joué depuis une branche) → 9, rien ne joue', async () => {
  const s = simulation({ lectures: [lecture()], copiePrincipale: false, bail: null, maintenantMs: plus(DELAI_FILET_S), scriptsDiffèrent: true });
  try {
    assert.equal(await integrer(42, SHA, 'filet', s.deps), CODES.usage);
    assert.equal(s.appels.filter((a) => a.startsWith('node ')).length, 0);
    assert.equal(merges(s.appels).length, 0);
  } finally { s.nettoyer(); }
});

test('passage : sans-merge, tête déplacée pendant les contrôles → 16', async () => {
  const s = simulation({ lectures: [lecture(), lecture({ head: AUTRE_SHA })], maintenantMs: plus(30), bail: null });
  try {
    assert.equal(await integrer(42, SHA, 'sans-merge', s.deps), CODES.teteDeplacee);
  } finally { s.nettoyer(); }
});

test('passage : sans-merge, contrôles verts, ni merge ni avance', async () => {
  const s = simulation({ lectures: [lecture()], maintenantMs: plus(30), bail: null });
  try {
    assert.equal(await integrer(42, SHA, 'sans-merge', s.deps), CODES.ok);
    assert.equal(merges(s.appels).length, 0);
    assert.ok(!s.appels.includes('git merge --ff-only origin/main'));
    assert.ok(s.dits.some((x) => x.startsWith('note : délai de repentir non échu')));
  } finally { s.nettoyer(); }
});

test('passage : filet après vingt minutes, hors copie principale, sans bail ni avance', async () => {
  const s = simulation({ lectures: [lecture(), lecture(), lecture()], copiePrincipale: false, bail: null, maintenantMs: plus(DELAI_FILET_S) });
  try {
    assert.equal(await integrer(42, SHA, 'filet', s.deps), CODES.ok);
    assert.equal(merges(s.appels).length, 1);
    assert.ok(!s.appels.includes('git merge --ff-only origin/main'));
    assert.equal(s.journal()[0].filet, true);
  } finally { s.nettoyer(); }
});

// ── Preuve de revue (partie 22) ────────────────────────────────────────────

for (const [libelle, corps, attendu] of [
  ['D-448 et GO sur le sha complet', `prête @${SHA}\nRevue : D-448, wn-reviewer GO @${SHA}.`, true],
  ['D-448 et GO sur un préfixe de 7', `prête @${SHA}\nD-448 · wn-reviewer GO @${SHA.slice(0, 7)}`, true],
  ['GO en majuscules hexadécimales', `prête @${SHA}\nD-448 · wn-reviewer GO @${SHA.slice(0, 9).toUpperCase()}`, true],
  ['GO sans D-448', `prête @${SHA}\nwn-reviewer GO @${SHA}`, false],
  ['D-448 sans GO', `prête @${SHA}\nD-448 : wn-reviewer a revu.`, false],
  ['GO sur une autre tête', `prête @${SHA}\nD-448 · wn-reviewer GO @${AUTRE_SHA}`, false],
  ['GO sur un préfixe de 6', `prête @${SHA}\nD-448 · wn-reviewer GO @${SHA.slice(0, 6)}`, false],
  ['D-4480 n\'est pas D-448', `prête @${SHA}\nD-4480 · wn-reviewer GO @${SHA}`, false],
  ['GO prolongé au-delà du sha (autre objet)', `prête @${SHA}\nD-448 · wn-reviewer GO @${SHA}0`, false],
]) {
  test(`repli D-448 : ${libelle} → ${attendu}`, () => {
    assert.equal(repliD448(commentaire(2, corps, T0), SHA), attendu);
  });
}

test('repli D-448 : sans déclaration servie, aucun repli', () => {
  assert.equal(repliD448(null, SHA), false);
});

test('passage : CI non vert sur ce sha → 27, avant le déploiement, aucun merge', async () => {
  const s = simulation({ lectures: [lecture()], codesEtapes: { 'wn-attendre-ci.mjs': 1 } });
  try {
    assert.equal(await integrer(42, SHA, 'merge', s.deps), CODES.revue);
    assert.ok(s.appels.includes(`node scripts/wn-attendre-ci.mjs 42 --sha ${SHA}`));
    assert.ok(!s.appels.some((a) => a.includes('wn-revue-pr-agent') || a.includes('wn-deploiement')));
    assert.equal(merges(s.appels).length, 0);
    assert.match(s.journal()[0].motif, /^ci rend 1$/);
  } finally { s.nettoyer(); }
});

test('passage : PR-Agent ≠ 0 sans repli → 27, avant le déploiement, aucun merge', async () => {
  const s = simulation({ lectures: [lecture()], codesEtapes: { 'wn-revue-pr-agent.mjs': 1 } });
  try {
    assert.equal(await integrer(42, SHA, 'merge', s.deps), CODES.revue);
    assert.ok(s.appels.includes('node scripts/wn-revue-pr-agent.mjs 42'));
    assert.ok(!s.appels.some((a) => a.includes('wn-deploiement')));
    assert.equal(merges(s.appels).length, 0);
    assert.match(s.journal()[0].motif, /^wn-revue-pr-agent rend 1 et la déclaration servie ne cite pas/);
  } finally { s.nettoyer(); }
});

test('passage : PR-Agent ≠ 0, repli cité par un commentaire antérieur seulement → 27', async () => {
  const go = commentaire(1, `D-448 · wn-reviewer GO @${SHA}`, '2026-11-20T09:50:00Z');
  const s = simulation({ lectures: [lecture({ commentaires: [go, decl] })], codesEtapes: { 'wn-revue-pr-agent.mjs': 1 } });
  try {
    assert.equal(await integrer(42, SHA, 'merge', s.deps), CODES.revue);
    assert.equal(merges(s.appels).length, 0);
  } finally { s.nettoyer(); }
});

test('passage : PR-Agent ≠ 0, repli D-448 dans la déclaration servie → merge', async () => {
  const declRepli = commentaire(2, `prête @${SHA}\nPR-Agent : pruning diff ; D-448, wn-reviewer GO @${SHA.slice(0, 8)}.`, T0);
  const commentaires = [declRepli];
  const s = simulation({
    lectures: [lecture({ commentaires }), lecture({ commentaires }), lecture({ commentaires, state: 'MERGED', merge: { oid: 'c'.repeat(40) } })],
    codesEtapes: { 'wn-revue-pr-agent.mjs': 1 },
  });
  try {
    assert.equal(await integrer(42, SHA, 'merge', s.deps), CODES.ok);
    assert.equal(merges(s.appels).length, 1);
    assert.ok(s.dits.some((x) => x.startsWith('revue=repli D-448')));
  } finally { s.nettoyer(); }
});

for (const mode of ['sans-merge', 'filet']) {
  test(`passage : ${mode}, PR-Agent ≠ 0 sans repli → 27 aussi`, async () => {
    const s = simulation({ lectures: [lecture()], copiePrincipale: mode !== 'filet', bail: null, maintenantMs: plus(DELAI_FILET_S), codesEtapes: { 'wn-revue-pr-agent.mjs': 2 } });
    try {
      assert.equal(await integrer(42, SHA, mode, s.deps), CODES.revue);
      assert.equal(merges(s.appels).length, 0);
    } finally { s.nettoyer(); }
  });
}

// ── Interface : usage refusé avant toute lecture ───────────────────────────

for (const args of [[], ['42'], ['42', 'abc1234'], ['42', SHA, '--force'], ['bail', 'prendre', '--reprendre', 'x'], ['journal', '--n', '0']]) {
  test(`interface : ${JSON.stringify(args)} → 9`, () => {
    const r = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', env: { ...process.env, WN_S: path.join(tmpdir(), 'wn-integrer-usage') } });
    assert.equal(r.status, CODES.usage, r.stderr + r.stdout);
  });
}

test('interface : sans WN_S, refus avant toute lecture', () => {
  const env = { ...process.env };
  delete env.WN_S;
  const r = spawnSync(process.execPath, [SCRIPT, '42', SHA], { encoding: 'utf8', env });
  assert.equal(r.status, CODES.usage);
});
