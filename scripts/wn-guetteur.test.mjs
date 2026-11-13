// Banc du guetteur borné (`scripts/wn-guetteur.mjs`). Le guetteur de
// l'intégrateur vivait hors dépôt, avec un `--test` maison : une déclaration
// en gras manquée (2026-10-30) a coûté un repli. Ses cas sont repris ici à
// l'identique, et chaque sonde a les siens.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  declaration,
  declarationsNeuves,
  ligneDeclaration,
  evenementMerge,
  runsEnAttente,
  guetter,
} from './wn-guetteur.mjs';

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'wn-guetteur.mjs');

// ── Motif « prête @<sha> » : cas du guetteur hors dépôt, à l'identique ──────

for (const [corps, attendu] of [
  ['prête @0523acd6639c34e8d954c5319158787141dca68a\n\n- CI vert', '0523acd6639c34e8d954c5319158787141dca68a'],
  ['**prête @da974543c333a62663a3525556fd5d215c5fdbfb** — Handoff : …', 'da974543c333a62663a3525556fd5d215c5fdbfb'],
  ['**prête @5e7e1312a41fa9dda10df0a46ad734376f034da7**\n\n- Handoff', '5e7e1312a41fa9dda10df0a46ad734376f034da7'],
  ['> prete @ abcdef1', 'abcdef1'],
  ['Intro\n\n- prête @`1234567`', '1234567'],
  ['**Suspendue — « prête @5e7e1312 » retirée.**', null],
  ['La file peut la redéclarer « prête » en citant ce handoff', null],
  ['Verdict : la PR est prête.', null],
  ['', null],
  [undefined, null],
]) {
  test(`motif : ${JSON.stringify(String(corps).slice(0, 40))} → ${attendu}`, () => {
    assert.equal(declaration(corps), attendu);
  });
}

// ── Sonde « prete » ────────────────────────────────────────────────────────

const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);

test('prete : neuves seulement, robots ignorés, triées par date', () => {
  const prs = [
    {
      number: 12,
      headRefOid: SHA_A,
      commentaires: [
        { id: 3, user: { type: 'User' }, body: `prête @${SHA_A.slice(0, 8)}`, created_at: '2026-11-13T10:02:00Z' },
        { id: 4, user: { type: 'Bot' }, body: `prête @${SHA_A}`, created_at: '2026-11-13T10:00:00Z' },
      ],
    },
    {
      number: 11,
      headRefOid: SHA_B,
      commentaires: [
        { id: 1, user: { type: 'User' }, body: `prête @${SHA_B}`, created_at: '2026-11-13T09:00:00Z' },
        { id: 2, user: { type: 'User' }, body: `**prête @${SHA_A}**`, created_at: '2026-11-13T10:01:00Z' },
      ],
    },
  ];
  const neuves = declarationsNeuves(prs, new Set(['c:1']));
  assert.deepEqual(neuves.map((d) => d.id), [2, 3]);
  assert.equal(ligneDeclaration(neuves[0]), `11:${SHA_A} c:2 at=2026-11-13T10:01:00Z TÊTE-DIFFÉRENTE head=${SHA_B}`);
  assert.equal(ligneDeclaration(neuves[1]), `12:${SHA_A.slice(0, 8)} c:3 at=2026-11-13T10:02:00Z tête=ok`);
});

test('prete : une redéclaration du même sha (commentaire neuf) est neuve', () => {
  const prs = [{
    number: 7,
    headRefOid: SHA_A,
    commentaires: [
      { id: 10, user: { type: 'User' }, body: `prête @${SHA_A}`, created_at: '2026-11-13T09:00:00Z' },
      { id: 11, user: { type: 'User' }, body: `prête @${SHA_A}`, created_at: '2026-11-13T11:00:00Z' },
    ],
  }];
  assert.deepEqual(declarationsNeuves(prs, new Set(['c:10'])).map((d) => d.id), [11]);
});

// ── Sonde « merge » ────────────────────────────────────────────────────────

test('merge : ouverte → rien ; mergée → commit ; fermée → dite', () => {
  assert.equal(evenementMerge('2070', { state: 'OPEN' }), null);
  assert.equal(
    evenementMerge('2070', { state: 'MERGED', mergeCommit: { oid: 'abc' }, mergedAt: '2026-11-13T18:23:00Z' }),
    'MERGEE pr=2070 commit=abc le=2026-11-13T18:23:00Z',
  );
  assert.equal(evenementMerge('9', { state: 'CLOSED', closedAt: 'x' }), 'FERMEE-SANS-MERGE pr=9 le=x');
});

test('merge : un état inconnu est une erreur de lecture, pas un « rien »', () => {
  assert.throws(() => evenementMerge('9', { state: 'DRAFTISH' }), /inconnu/);
  assert.throws(() => evenementMerge('9', {}), /inconnu/);
});

// ── Sonde « release-db » ───────────────────────────────────────────────────

test('release-db : seuls les runs en attente, hors ignorés', () => {
  const runs = [
    { id: 1, status: 'waiting', head_sha: SHA_A, created_at: 't1', html_url: 'u1' },
    { id: 2, status: 'in_progress', head_sha: SHA_B, created_at: 't2' },
    { id: 3, status: 'waiting', head_sha: SHA_B, created_at: 't3', html_url: 'u3' },
  ];
  assert.deepEqual(runsEnAttente(runs), [
    `ATTENTE-APPROBATION run=1 sha=${SHA_A.slice(0, 8)} depuis=t1 u1`,
    `ATTENTE-APPROBATION run=3 sha=${SHA_B.slice(0, 8)} depuis=t3 u3`,
  ]);
  assert.deepEqual(runsEnAttente(runs, new Set(['1'])).length, 1);
});

// ── Boucle bornée ──────────────────────────────────────────────────────────

const sansAttente = { pas: 0, attendre: async () => {} };

test('boucle : un événement à la troisième lecture → 0, avec ses lignes', async () => {
  let n = 0;
  const r = await guetter(() => (++n === 3 ? ['E'] : []), { iter: 5, ...sansAttente });
  assert.deepEqual(r, { code: 0, lignes: ['E'], erreurs: 0 });
  assert.equal(n, 3);
});

test('boucle : rien pendant toute la passe → 3', async () => {
  let n = 0;
  const r = await guetter(() => { n++; return []; }, { iter: 4, ...sansAttente });
  assert.equal(r.code, 3);
  assert.equal(n, 4);
});

test('boucle : aucune lecture aboutie → 2, jamais 3', async () => {
  const journal = [];
  const r = await guetter(() => { throw new Error('gh hors ligne'); }, { iter: 3, ...sansAttente, journal: (l) => journal.push(l) });
  assert.equal(r.code, 2);
  assert.equal(r.erreurs, 3);
  assert.equal(journal.length, 3);
});

test('boucle : des erreurs puis une lecture aboutie sans rien → 3', async () => {
  let n = 0;
  const r = await guetter(() => { if (++n < 3) throw new Error('x'); return []; }, { iter: 3, ...sansAttente });
  assert.deepEqual([r.code, r.erreurs], [3, 2]);
});

test('boucle : pas d\'attente après la dernière lecture', async () => {
  let attentes = 0;
  await guetter(() => [], { iter: 3, pas: 1, attendre: async () => { attentes++; } });
  assert.equal(attentes, 2);
});

// ── Interface ──────────────────────────────────────────────────────────────

// Revue `wn-reviewer` (P1) : lancé par un lien symbolique, le garde « exécuté
// directement » comparait des chemins non résolus et le script sortait en 0
// — « événement » — sans rien lire. La bascule de l'intégrateur passera
// naturellement par un lien.
test('lancé par un lien symbolique : le script s\'exécute (usage refusé → 4, jamais 0)', () => {
  const dossier = mkdtempSync(path.join(tmpdir(), 'wn-guetteur-'));
  try {
    const lien = path.join(dossier, 'guetter.mjs');
    symlinkSync(SCRIPT, lien);
    const r = spawnSync('node', [lien, 'inconnue'], { encoding: 'utf8' });
    assert.equal(r.status, 4, r.stdout + r.stderr);
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
});

test('lancé par un chemin relatif : usage refusé → 4', () => {
  const r = spawnSync('node', [path.relative(path.dirname(SCRIPT), SCRIPT), 'inconnue'], {
    encoding: 'utf8',
    cwd: path.dirname(SCRIPT),
  });
  assert.equal(r.status, 4, r.stdout + r.stderr);
});

// Remarque de PR-Agent (#2076) : un fichier des traitées absent faisait
// réessayer toute la passe (45 × 60 s) avant de rendre 2. Il est refusé avant
// la boucle, sans lecture `gh` ; le délai borne le test s'il régressait.
test('prete sur un fichier des traitées absent : 4 aussitôt, avant toute lecture', () => {
  const dossier = mkdtempSync(path.join(tmpdir(), 'wn-guetteur-'));
  try {
    const absent = path.join(dossier, 'traitees.txt');
    const r = spawnSync('node', [SCRIPT, 'prete', absent], { encoding: 'utf8', timeout: 15000 });
    assert.equal(r.status, 4, r.stdout + r.stderr);
    assert.match(r.stderr, /fichier des traitées introuvable/);
    assert.equal(r.stdout, '');
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
});

test('prete sur un chemin illisible (un dossier) : 4 aussitôt, avant toute lecture', () => {
  const dossier = mkdtempSync(path.join(tmpdir(), 'wn-guetteur-'));
  try {
    const r = spawnSync('node', [SCRIPT, 'prete', dossier], { encoding: 'utf8', timeout: 15000 });
    assert.equal(r.status, 4, r.stdout + r.stderr);
    assert.equal(r.stdout, '');
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
});

for (const args of [[], ['inconnue'], ['merge'], ['merge', 'abc'], ['prete'], ['release-db', 'x'], ['merge', '1', '--iter', '0'], ['merge', '1', '--pas', '-1']]) {
  test(`usage refusé → 4 : ${args.join(' ') || '(vide)'}`, () => {
    const r = spawnSync('node', [SCRIPT, ...args], { encoding: 'utf8' });
    assert.equal(r.status, 4, r.stdout + r.stderr);
  });
}
