// Banc de sessions-concurrentes.mjs — piège « sessions concurrentes sur la
// copie principale » (autonomie-pieges-restes, partie 16).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { alerteSessionsConcurrentes, autresSessions, avertissement, lireLsofCwd } from './sessions-concurrentes.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const COPIE = '/dépôt/Wellneuro-app';

// Forme réelle de `lsof -a -c claude -d cwd -Fpn` (relevée le 2026-11-25).
const LSOF = [
  'p4377', 'fcwd', `n${COPIE}`,
  'p7829', 'fcwd', `n${COPIE}`,
  'p7955', 'fcwd', `n${COPIE}/.claude/worktrees/refonte`,
  'p9822', 'fcwd', `n${COPIE}/.claude/worktrees/orch-ci`,
  'p10144', 'fcwd', 'n/ailleurs',
  '',
].join('\n');

test('lireLsofCwd : un couple pid/répertoire par processus, lignes inconnues ignorées', () => {
  assert.deepEqual(lireLsofCwd(LSOF).slice(0, 2), [{ pid: 4377, cwd: COPIE }, { pid: 7829, cwd: COPIE }]);
  assert.equal(lireLsofCwd(LSOF).length, 5);
  assert.deepEqual(lireLsofCwd('pabc\nn/x\n'), [], 'pid illisible : le chemin qui suit ne compte pas');
  assert.deepEqual(lireLsofCwd(''), []);
});

test('autresSessions : même copie seulement, worktrees et ancêtres exclus', () => {
  const processus = lireLsofCwd(LSOF);
  assert.deepEqual(autresSessions({ copie: COPIE, processus, ancetres: new Set() }), [4377, 7829]);
  // La session elle-même (un de ses ancêtres) n'est pas une autre session.
  assert.deepEqual(autresSessions({ copie: COPIE, processus, ancetres: new Set([7829]) }), [4377]);
  // Une session en worktree ne voit personne : le worktree n'est pas la copie.
  assert.deepEqual(autresSessions({ copie: `${COPIE}/.claude/worktrees/orch-ci`, processus, ancetres: new Set([9822]) }), []);
});

test('autresSessions : chemins comparés réels (lien symbolique)', () => {
  const reel = (p) => (p === '/lien' ? COPIE : p);
  const processus = [{ pid: 12, cwd: '/lien' }];
  assert.deepEqual(autresSessions({ copie: COPIE, processus, ancetres: new Set(), reel }), [12]);
});

test('avertissement : null sans autre session ; nomme les pid, la règle et les gestes', () => {
  assert.equal(avertissement([]), null);
  const un = avertissement([4377]);
  assert.match(un, /une autre session Claude \(pid 4377\) a pour répertoire/);
  const deux = avertissement([4377, 7829]);
  assert.match(deux, /2 autres sessions Claude \(pid 4377, 7829\) ont pour répertoire/);
  for (const attendu of [/D-373 §2, D-454/, /EnterWorktree/, /git branch --show-current/, /jamais `git add -A`/, /Indice, pas preuve/]) {
    assert.match(deux, attendu);
  }
});

test('alerteSessionsConcurrentes : copie principale occupée → avertissement ; worktree lié ou sans toplevel → rien', () => {
  const lister = () => lireLsofCwd(LSOF);
  const ancetres = () => new Set([9822]);
  assert.match(alerteSessionsConcurrentes({ toplevel: COPIE, copiePrincipale: true, lister, ancetres }), /pid 4377, 7829/);
  // Même liste, mais la session démarre dans un worktree lié : pas son affaire.
  assert.equal(alerteSessionsConcurrentes({ toplevel: COPIE, copiePrincipale: false, lister, ancetres }), null);
  assert.equal(alerteSessionsConcurrentes({ toplevel: '', copiePrincipale: true, lister, ancetres }), null);
  // Une lecture qui lève : silence, jamais d'exception.
  assert.equal(alerteSessionsConcurrentes({ toplevel: COPIE, copiePrincipale: true, lister: () => { throw new Error('x'); }, ancetres }), null);
});

test('alerteSessionsConcurrentes : sur un dossier neuf, aucune session — silence, sans exception', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wn-sessions-'));
  try {
    assert.equal(alerteSessionsConcurrentes({ toplevel: dir, copiePrincipale: true }), null);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// Câblage, de bout en bout (revue wn-reviewer) : git-freshness, copié à côté
// d'un module factice, est lancé au démarrage dans un dépôt simple (copie
// principale) puis dans un worktree lié. Le factice renvoie un texte quand
// `copiePrincipale` est vrai : sa présence prouve l'appel, la sortie et le
// calcul de la copie principale ; un module cassé ne coûte pas la fraîcheur.
const MODULE_FACTICE = 'export const alerteSessionsConcurrentes = ({ copiePrincipale }) => (copiePrincipale ? "Sessions concurrentes : factice\\n" : null);\n';

function demarrer(module, { worktree = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wn-sessions-cablage-'));
  try {
    const hooks = path.join(dir, 'hooks');
    fs.mkdirSync(hooks);
    fs.copyFileSync(path.join(ICI, 'git-freshness.mjs'), path.join(hooks, 'git-freshness.mjs'));
    fs.writeFileSync(path.join(hooks, 'sessions-concurrentes.mjs'), module);
    const depot = path.join(dir, 'depot');
    fs.mkdirSync(depot);
    const g = (cwd, ...a) => spawnSync('git', ['-c', 'user.name=banc', '-c', 'user.email=banc@exemple.invalid', '-c', 'commit.gpgsign=false', ...a], { cwd, encoding: 'utf8' });
    g(depot, 'init', '-q', '-b', 'main');
    fs.writeFileSync(path.join(depot, 'a.txt'), 'a\n');
    g(depot, 'add', '-A');
    g(depot, 'commit', '-qm', 'a');
    // origin/main : le constat de fraîcheur en a besoin pour rendre « vérifiée ».
    g(depot, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
    let cwd = depot;
    if (worktree) {
      cwd = path.join(dir, 'lie');
      const r = g(depot, 'worktree', 'add', '-q', '-b', 'lie', cwd);
      assert.equal(r.status, 0, r.stderr);
    }
    return spawnSync(process.execPath, [path.join(hooks, 'git-freshness.mjs')], {
      cwd,
      encoding: 'utf8',
      input: JSON.stringify({ hook_event_name: 'SessionStart', session_id: `banc-${process.pid}-${worktree}`, cwd }),
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('git-freshness : copie principale → l’avertissement du module, puis le constat de fraîcheur', () => {
  const r = demarrer(MODULE_FACTICE);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^Sessions concurrentes : factice\n/);
  assert.match(r.stdout, /Freshness Git/);
});

test('git-freshness : worktree lié → aucun avertissement (copiePrincipale faux)', () => {
  const r = demarrer(MODULE_FACTICE, { worktree: true });
  assert.equal(r.status, 0, r.stderr);
  assert.doesNotMatch(r.stdout, /Sessions concurrentes/);
  assert.match(r.stdout, /Freshness Git/);
});

test('git-freshness : module illisible → le constat de fraîcheur, sans avertissement', () => {
  const r = demarrer('throw new Error("module cassé");\n');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Freshness Git/);
  assert.doesNotMatch(r.stdout, /Sessions concurrentes/);
});
