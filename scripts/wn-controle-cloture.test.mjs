// Banc du contrôle de clôture (E56). Il prouve que le garde refuse ce qu'il
// annonce refuser — un garde redevenu muet resterait vert, c'est la leçon de
// l'anti-secrets.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { fichiersCrees, verdictCloture } from './wn-controle-cloture.mjs';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'wn-controle-cloture.mjs');

const CODE = 'web/src/lib/protocol/cabinet.ts';
const SESSION_LOG = 'docs/claude/SESSION_LOG.md';
const HANDOFF = 'docs/claude/handoffs/2026-10-18-0400-sujet.md';

test('code + fragment de handoff créé : clôture présente, sans entrée SESSION_LOG (D-372)', () => {
  const nameStatus = `M\t${CODE}\nA\t${HANDOFF}`;
  assert.deepEqual(verdictCloture({ crees: fichiersCrees(nameStatus) }), { ok: true, manques: [] });
});

test('entrée SESSION_LOG sans handoff : refusé — le journal ne clôt plus rien', () => {
  const nameStatus = `M\t${CODE}\nM\t${SESSION_LOG}`;
  const { ok, manques } = verdictCloture({ crees: fichiersCrees(nameStatus) });
  assert.equal(ok, false);
  assert.equal(manques.length, 1);
  assert.match(manques[0], /fragment de handoff/);
  assert.doesNotMatch(manques[0], /SESSION_LOG/);
});

test('ni l’un ni l’autre : un seul manque, le handoff', () => {
  assert.equal(verdictCloture({ crees: fichiersCrees(`M\t${CODE}`) }).manques.length, 1);
});

test('le README des handoffs, ou un fichier sans horodatage, n’est pas un handoff', () => {
  for (const faux of ['docs/claude/handoffs/README.md', 'docs/claude/handoffs/notes.md']) {
    const { ok } = verdictCloture({ crees: [CODE, faux] });
    assert.equal(ok, false, faux);
  }
});

test('un handoff supprimé ne clôt rien ; un renommage compte sous son nouveau nom', () => {
  const ancien = 'docs/claude/handoffs/2026-10-01-0900-ancien.md';
  const renomme = 'docs/claude/handoffs/2026-10-18-0400-renomme.md';
  assert.equal(verdictCloture({ crees: fichiersCrees(`M\t${CODE}\nD\t${HANDOFF}`) }).ok, false);
  const nameStatus = [`M\t${CODE}`, `D\t${ancien}`, `R100\tdocs/brouillon.md\t${renomme}`].join('\n');
  assert.deepEqual(fichiersCrees(nameStatus), [renomme]);
  assert.equal(verdictCloture({ crees: fichiersCrees(nameStatus) }).ok, true);
});

test('un handoff seulement modifié ne clôt pas la PR ; créé (A) ou renommé (R), oui', () => {
  const ancien = 'docs/claude/handoffs/2026-10-01-0900-ancien.md';
  const modifie = `M\t${CODE}\nM\t${ancien}`;
  assert.deepEqual(fichiersCrees(modifie), []);
  assert.equal(verdictCloture({ crees: fichiersCrees(modifie) }).ok, false);
  const cree = `M\t${CODE}\nA\t${HANDOFF}\nR090\tdocs/a.md\tdocs/b.md`;
  assert.deepEqual(fichiersCrees(cree), [HANDOFF, 'docs/b.md']);
  assert.equal(verdictCloture({ crees: fichiersCrees(cree) }).ok, true);
});

// Le script entier, sur un dépôt temporaire : c'est l'appel à git qui décide
// de la forme des chemins, et un nom accentué en sortait entre guillemets.
test('script réel : un handoff au nom accentué est reconnu', () => {
  const depot = mkdtempSync(join(tmpdir(), 'cloture-'));
  const g = (...a) =>
    execFileSync('git', ['-c', 'user.name=banc', '-c', 'user.email=banc@example.test', ...a], {
      cwd: depot,
      encoding: 'utf8',
    });
  try {
    g('init', '-q');
    mkdirSync(join(depot, 'docs/claude/handoffs'), { recursive: true });
    writeFileSync(join(depot, 'docs/claude/handoffs/README.md'), '# Handoffs\n');
    g('add', '.');
    g('commit', '-q', '-m', 'base');
    const base = g('rev-parse', 'HEAD').trim();
    mkdirSync(join(depot, 'web'), { recursive: true });
    writeFileSync(join(depot, 'web/code.ts'), 'export {};\n');
    writeFileSync(join(depot, 'docs/claude/handoffs/2026-10-18-0400-clôture-été.md'), '# h\n');
    g('add', '.');
    g('commit', '-q', '-m', 'lot');
    const sortie = execFileSync('node', [SCRIPT, base], { cwd: depot, encoding: 'utf8' });
    assert.match(sortie, /Clôture présente/);
  } finally {
    rmSync(depot, { recursive: true, force: true });
  }
});

// Le script entier, refus : sans fragment créé, la sortie est 1 et le manque
// est dit — un garde redevenu muet resterait vert.
test('script réel : une PR de code sans handoff créé est refusée', () => {
  const depot = mkdtempSync(join(tmpdir(), 'cloture-'));
  const g = (...a) =>
    execFileSync('git', ['-c', 'user.name=banc', '-c', 'user.email=banc@example.test', ...a], {
      cwd: depot,
      encoding: 'utf8',
    });
  try {
    g('init', '-q');
    mkdirSync(join(depot, 'docs/claude'), { recursive: true });
    writeFileSync(join(depot, SESSION_LOG), '# Journal\n');
    g('add', '.');
    g('commit', '-q', '-m', 'base');
    const base = g('rev-parse', 'HEAD').trim();
    mkdirSync(join(depot, 'web'), { recursive: true });
    writeFileSync(join(depot, 'web/code.ts'), 'export {};\n');
    writeFileSync(join(depot, SESSION_LOG), '# Journal\n\n## entrée\n');
    g('add', '.');
    g('commit', '-q', '-m', 'lot');
    const r = spawnSync('node', [SCRIPT, base], { cwd: depot, encoding: 'utf8' });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /fragment de handoff/);
  } finally {
    rmSync(depot, { recursive: true, force: true });
  }
});
