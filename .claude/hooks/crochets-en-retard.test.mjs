// Banc de crochets-en-retard.mjs — piège « crochets de la copie principale en
// retard » (autonomie-pieges-restes, partie 17).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { alerteCrochetsEnRetard, avertissementRetard, CHEMINS_CROCHETS } from './crochets-en-retard.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const HEAD = 'abcdef0123456789abcdef0123456789abcdef01';

test('avertissementRetard : null sans fichier ; nomme la copie, la tête, les fichiers et le remède', () => {
  assert.equal(avertissementRetard({ racine: '/copie', head: HEAD, fichiers: [] }), null);
  const un = avertissementRetard({ racine: '/copie', head: HEAD, fichiers: ['.claude/settings.json'] });
  assert.match(un, /^Crochets en retard : /);
  assert.match(un, /depuis `\/copie` \(HEAD abcdef012345\)/);
  assert.match(un, /changé 1 fichier de crochets que cette copie n'a pas : `\.claude\/settings\.json`\./);
  assert.match(un, /EnterWorktree/);
  assert.match(un, /git merge --ff-only origin\/main/);
  assert.match(un, /D-373 §2/);
  assert.match(un, /jamais depuis une session concurrente/);
  assert.ok(un.endsWith('\n'));
});

test('avertissementRetard : pluriel, et au-delà de cinq fichiers le reste est compté', () => {
  const f = (n) => Array.from({ length: n }, (_, i) => `.claude/hooks/g${i}.mjs`);
  assert.match(avertissementRetard({ racine: '/c', head: HEAD, fichiers: f(2) }), /changé 2 fichiers de crochets/);
  const six = avertissementRetard({ racine: '/c', head: HEAD, fichiers: f(6) });
  assert.match(six, /`\.claude\/hooks\/g4\.mjs` et 1 autre\./);
  assert.doesNotMatch(six, /g5\.mjs/);
  assert.match(avertissementRetard({ racine: '/c', head: HEAD, fichiers: f(8) }), /et 3 autres\./);
});

test('CHEMINS_CROCHETS : ce que les lanceurs lisent sous la racine de lancement', () => {
  assert.deepEqual(CHEMINS_CROCHETS, ['.claude/hooks', '.claude/settings.json', '.claude/agents']);
});

test('alerteCrochetsEnRetard : git injecté — même copie → silence sans diff ; erreur → null', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wn-crochets-injecte-'));
  try {
    const appels = [];
    const memeCopie = (args) => {
      appels.push(args[0]);
      return args[0] === 'rev-parse' ? dir : 'x';
    };
    assert.equal(alerteCrochetsEnRetard({ toplevel: dir, dossierCrochets: dir, git: memeCopie }), null);
    assert.deepEqual(appels, ['rev-parse'], 'la copie du répertoire courant : le constat de fraîcheur la juge');

    const autre = fs.mkdtempSync(path.join(os.tmpdir(), 'wn-crochets-autre-'));
    try {
      const sansBase = (args) => (args[0] === 'rev-parse' ? (args[1] === 'HEAD' ? HEAD : autre) : null);
      assert.equal(alerteCrochetsEnRetard({ toplevel: dir, dossierCrochets: autre, git: sansBase }), null);
      const leve = () => { throw new Error('git cassé'); };
      assert.equal(alerteCrochetsEnRetard({ toplevel: dir, dossierCrochets: autre, git: leve }), null);
      assert.equal(alerteCrochetsEnRetard({ toplevel: '/nexiste/pas', dossierCrochets: autre, git: sansBase }), null);
    } finally {
      fs.rmSync(autre, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// Bout en bout : un vrai dépôt et son remote nu ; la copie principale porte
// les crochets (git-freshness.mjs et ce module, copiés comme fichiers non
// suivis) ; un worktree lié à la tête du remote. `origin/main` local est
// ramené à la base A avant de lancer le crochet : il n'avance que par le
// fetch du crochet, ce qui prouve que le constat suit ce fetch.
//   copie : 'retard' (tête A), 'a-jour', 'avance' (contient main, touche ses
//           crochets), 'squash' (contenu de main, hors de son historique),
//           'divergente' (en retard sur un crochet, en avance sur un autre),
//           'locale' (tête A, arbre de travail déjà égal à main)
//   changement : ce que main a changé — 'crochet', 'reglages', 'agent', 'autre'
//   imbrique : worktree sous `<copie>/.claude/worktrees/`
//   origine : false → ni remote ni `origin/main`
const ENV = Object.fromEntries(Object.entries(process.env).filter(([cle]) => !/^GIT_/i.test(cle)));
const FICHIER = {
  crochet: '.claude/hooks/garde.mjs',
  reglages: '.claude/settings.json',
  agent: '.claude/agents/relecteur.md',
  autre: 'a.txt',
};

function construire({ copie = 'retard', changement = 'crochet', imbrique = false, origine = true, module = null } = {}) {
  const dir = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'wn-crochets-scene-')));
  const depot = path.join(dir, 'depot');
  const hooks = path.join(depot, '.claude', 'hooks');
  fs.mkdirSync(hooks, { recursive: true });
  fs.mkdirSync(path.join(depot, '.claude', 'agents'));
  const g = (...a) => {
    const r = spawnSync('git', ['-c', 'user.name=banc', '-c', 'user.email=banc@exemple.invalid', '-c', 'commit.gpgsign=false', ...a], { cwd: depot, encoding: 'utf8', env: ENV });
    assert.equal(r.status, 0, `git ${a.join(' ')} : ${r.stderr}`);
    return r.stdout.trim();
  };
  const ecrire = (rel, texte) => fs.writeFileSync(path.join(depot, rel), texte);
  g('init', '-q', '-b', 'main');
  for (const rel of Object.values(FICHIER)) ecrire(rel, 'v1\n');
  g('add', '-A');
  g('commit', '-qm', 'A');
  const a = g('rev-parse', 'HEAD');
  g('switch', '-q', '-c', 'amont');
  ecrire(FICHIER[changement], 'v2\n');
  g('commit', '-qam', 'B');
  const b = g('rev-parse', 'HEAD');
  const remote = path.join(dir, 'remote.git');
  g('init', '-q', '--bare', remote);
  g('remote', 'add', 'origin', remote);
  g('push', '-q', 'origin', 'amont:main');
  if (copie === 'retard') g('switch', '-q', '--detach', a);
  if (copie === 'a-jour') g('switch', '-q', '--detach', b);
  if (copie === 'avance') {
    g('switch', '-q', '-c', 'locale', b);
    ecrire(FICHIER.crochet, 'v3\n');
    g('commit', '-qam', 'C');
  }
  if (copie === 'squash' || copie === 'divergente') {
    g('switch', '-q', '-c', 'travail', a);
    ecrire(copie === 'squash' ? FICHIER[changement] : '.claude/hooks/autre.mjs', 'v2\n');
    g('add', '-A');
    g('commit', '-qm', copie);
  }
  if (copie === 'locale') {
    g('switch', '-q', '--detach', a);
    ecrire(FICHIER[changement], 'v2\n');
  }
  const lie = imbrique ? path.join(depot, '.claude', 'worktrees', 'lie') : path.join(dir, 'lie');
  g('worktree', 'add', '-q', '--detach', lie, b);
  if (origine) g('update-ref', 'refs/remotes/origin/main', a);
  else g('remote', 'remove', 'origin');
  for (const f of ['git-freshness.mjs', 'crochets-en-retard.mjs']) {
    fs.copyFileSync(path.join(ICI, f), path.join(hooks, f));
  }
  if (module !== null) fs.writeFileSync(path.join(hooks, 'crochets-en-retard.mjs'), module);
  return { dir, depot, hooks, lie, g };
}

let numero = 0;
function scene({ depuis = 'lie', ...options } = {}) {
  const s = construire(options);
  const cwd = depuis === 'lie' ? s.lie : s.depot;
  const sessionId = `banc-crochets-${process.pid}-${numero++}`;
  try {
    const r = spawnSync(process.execPath, [path.join(s.hooks, 'git-freshness.mjs')], {
      cwd,
      encoding: 'utf8',
      env: ENV,
      input: JSON.stringify({ hook_event_name: 'SessionStart', session_id: sessionId, cwd }),
    });
    return { ...r, racine: s.depot };
  } finally {
    // Le marqueur du garde de fraîcheur, que ce banc ne laisse pas derrière lui.
    const cle = crypto.createHash('sha256').update(`${cwd}\0${sessionId}`).digest('hex');
    fs.rmSync(path.join(os.tmpdir(), 'wellneuro-claude-git-freshness', `${cle}.json`), { force: true });
    fs.rmSync(s.dir, { recursive: true, force: true });
  }
}

const silence = (r) => {
  assert.equal(r.status, 0, r.stderr);
  assert.doesNotMatch(r.stdout, /Crochets en retard/);
  assert.match(r.stdout, /Freshness Git/);
};

test('bout en bout : worktree à jour, crochets d’une copie en retard → avertissement après le fetch, puis le constat', () => {
  const r = scene();
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^Crochets en retard : /);
  assert.ok(r.stdout.includes(`depuis \`${r.racine}\``), r.stdout);
  assert.match(r.stdout, /changé 1 fichier de crochets que cette copie n'a pas : `\.claude\/hooks\/garde\.mjs`\./);
  assert.match(r.stdout, /Freshness Git vérifiée/);
});

test('bout en bout : settings.json et agents changés par main → nommés', () => {
  assert.match(scene({ changement: 'reglages' }).stdout, /n'a pas : `\.claude\/settings\.json`\./);
  assert.match(scene({ changement: 'agent' }).stdout, /n'a pas : `\.claude\/agents\/relecteur\.md`\./);
});

test('bout en bout : copie divergente → seul le crochet en retard est nommé', () => {
  const r = scene({ copie: 'divergente' });
  assert.match(r.stdout, /changé 1 fichier de crochets que cette copie n'a pas : `\.claude\/hooks\/garde\.mjs`\./);
  assert.doesNotMatch(r.stdout, /autre\.mjs/);
});

test('bout en bout : worktree imbriqué sous la copie → avertissement', () => {
  assert.match(scene({ imbrique: true }).stdout, /^Crochets en retard : /);
});

test('bout en bout : copie à jour, en avance, ou main changé hors des crochets → silence', () => {
  silence(scene({ copie: 'a-jour' }));
  silence(scene({ copie: 'avance' }));
  silence(scene({ changement: 'autre' }));
});

test('bout en bout : contenu déjà égal à main (squash, modification locale) → silence', () => {
  silence(scene({ copie: 'squash' }));
  silence(scene({ copie: 'locale' }));
});

test('bout en bout : ni remote ni origin/main → silence, le constat de fraîcheur parle', () => {
  silence(scene({ origine: false }));
});

test('bout en bout : module illisible → le constat de fraîcheur, sans avertissement', () => {
  silence(scene({ module: 'throw new Error("module cassé");\n' }));
});

test('bout en bout : session dans la copie elle-même → silence ici, le constat de fraîcheur juge', () => {
  const r = scene({ depuis: 'copie' });
  silence(r);
  assert.match(r.stdout, /la branche ne contient pas/);
});

test('alerteCrochetsEnRetard : la même copie désignée par un lien symbolique → silence', () => {
  const s = construire();
  try {
    s.g('fetch', '-q', 'origin');
    const lien = path.join(s.dir, 'lien');
    fs.symlinkSync(s.depot, lien);
    assert.equal(alerteCrochetsEnRetard({ toplevel: lien, dossierCrochets: s.hooks }), null);
    assert.match(alerteCrochetsEnRetard({ toplevel: s.lie, dossierCrochets: s.hooks }), /^Crochets en retard/);
  } finally {
    fs.rmSync(s.dir, { recursive: true, force: true });
  }
});
