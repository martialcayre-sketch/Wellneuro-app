// Banc de scripts/wn-session-log-ajout.mjs — piège « SESSION_LOG réordonné »
// (autonomie-pieges-restes, partie 15).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CHEMIN_JOURNAL, premiereLigneDivergente, verdictAjoutEnFin } from './wn-session-log-ajout.mjs';

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'wn-session-log-ajout.mjs');
const BASE = '# Journal\n\n## [2026-11-01] — un\n\ntexte\n';

test('ajout en fin : conforme', () => {
  assert.deepEqual(verdictAjoutEnFin(BASE, `${BASE}\n## [2026-11-25] — lot\n\nbloc\n`), { ok: true, motif: null, ligne: null });
});

test('journal intouché, ou absent de la base : conforme', () => {
  assert.equal(verdictAjoutEnFin(BASE, BASE).ok, true);
  assert.equal(verdictAjoutEnFin(null, BASE).ok, true);
});

test('entrée rangée au milieu : refus, ligne de divergence dite', () => {
  const tete = '# Journal\n\n## [2026-11-25] — lot\n\nbloc\n\n## [2026-11-01] — un\n\ntexte\n';
  const v = verdictAjoutEnFin(BASE, tete);
  assert.equal(v.ok, false);
  assert.equal(v.ligne, 3);
});

test('ligne retouchée, entrée retirée (compaction), journal supprimé : refus', () => {
  assert.equal(verdictAjoutEnFin(BASE, BASE.replace('texte', 'texte modifié')).ok, false);
  assert.equal(verdictAjoutEnFin(BASE, '# Journal\n').ok, false);
  assert.deepEqual(verdictAjoutEnFin(BASE, null), { ok: false, motif: 'journal supprimé', ligne: null });
});

test('premiereLigneDivergente : base entière préfixe de lignes mais pas d’octets', () => {
  assert.equal(premiereLigneDivergente('a\nb', 'a\nbc'), 2);
});

function git(cwd, ...args) {
  // `merge.ff=true` : un `merge.ff=only` global du poste rougirait le banc.
  return execFileSync('git', ['-c', 'user.name=banc', '-c', 'user.email=banc@exemple.invalid', '-c', 'commit.gpgsign=false', '-c', 'merge.ff=true', ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function ecrire(cwd, texte) {
  fs.writeFileSync(path.join(cwd, CHEMIN_JOURNAL), texte);
}

// Le piège lui-même, rejoué : une branche ajoute son entrée en fin, main en
// ajoute une autre, la branche fusionne main — `merge=union` range l'entrée de
// la branche devant celle de main. Le script, lancé comme en CI, refuse ; la
// reconstruction qu'il prescrit passe.
test('rejeu réel sous merge=union : la fusion de main réordonne, le script refuse, le remède passe', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wn-session-log-'));
  try {
    git(dir, 'init', '-q', '-b', 'main');
    fs.mkdirSync(path.join(dir, 'docs/claude'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.gitattributes'), `${CHEMIN_JOURNAL} merge=union\n`);
    ecrire(dir, BASE);
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '-m', 'base');

    git(dir, 'switch', '-q', '-c', 'lot');
    ecrire(dir, `${BASE}\n## [2026-11-25 10:00] — lot\n\nbloc du lot\n`);
    git(dir, 'commit', '-qam', 'entrée du lot');

    git(dir, 'switch', '-q', 'main');
    ecrire(dir, `${BASE}\n## [2026-11-25 09:00] — main\n\nentrée de main\n`);
    git(dir, 'commit', '-qam', 'entrée de main');

    git(dir, 'switch', '-q', 'lot');
    git(dir, 'merge', '-q', '--no-edit', 'main');
    const fusionne = fs.readFileSync(path.join(dir, CHEMIN_JOURNAL), 'utf8');
    assert.ok(fusionne.indexOf('— lot') < fusionne.indexOf('— main'), 'union range l’entrée du lot devant celle de main (le piège)');

    const refus = spawnSync(process.execPath, [SCRIPT, 'main', 'HEAD'], { cwd: dir, encoding: 'utf8' });
    assert.equal(refus.status, 1, refus.stderr);
    assert.match(refus.stderr, /première ligne divergente/);
    assert.match(refus.stderr, /Remède/);

    ecrire(dir, `${git(dir, 'show', `main:${CHEMIN_JOURNAL}`)}\n## [2026-11-25 10:00] — lot\n\nbloc du lot\n`);
    git(dir, 'commit', '-qam', 'journal reconstruit');
    const accord = spawnSync(process.execPath, [SCRIPT, 'main', 'HEAD'], { cwd: dir, encoding: 'utf8' });
    assert.equal(accord.status, 0, accord.stderr);
    assert.match(accord.stdout, /ajout en fin seulement/);

    const usage = spawnSync(process.execPath, [SCRIPT], { cwd: dir, encoding: 'utf8' });
    assert.equal(usage.status, 2);
    const inconnue = spawnSync(process.execPath, [SCRIPT, 'ref-absente'], { cwd: dir, encoding: 'utf8' });
    assert.equal(inconnue.status, 2);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function lancer(cwd, ...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8' });
}

// La forme exacte du CI (revue wn-reviewer) : le commit de fusion de la PR a
// `main` pour premier parent, et l'étape appelle `HEAD^1 HEAD`. Trois PR sur
// un même `main` qui a reçu une entrée après leur départ.
test('forme du CI (main en premier parent, HEAD^1 HEAD) : correcte 0, réordonnée 1, journal intouché 0', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wn-session-log-ci-'));
  try {
    git(dir, 'init', '-q', '-b', 'main');
    fs.mkdirSync(path.join(dir, 'docs/claude'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.gitattributes'), `${CHEMIN_JOURNAL} merge=union\n`);
    ecrire(dir, BASE);
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '-m', 'base');

    // PR correcte : ajout en fin, sans fusion de main.
    git(dir, 'switch', '-q', '-c', 'correcte');
    ecrire(dir, `${BASE}\n## [2026-11-25 10:00] — correcte\n\nbloc\n`);
    git(dir, 'commit', '-qam', 'entrée correcte');
    // PR de code seul : le journal n'est pas touché.
    git(dir, 'switch', '-q', '-c', 'code', 'main');
    fs.writeFileSync(path.join(dir, 'code.txt'), 'code\n');
    git(dir, 'add', '-A');
    git(dir, 'commit', '-qm', 'code seul');
    // PR réordonnée : ajout en fin, puis fusion de main.
    git(dir, 'switch', '-q', '-c', 'reordonnee', 'main');
    ecrire(dir, `${BASE}\n## [2026-11-25 10:00] — réordonnée\n\nbloc\n`);
    git(dir, 'commit', '-qam', 'entrée réordonnée');

    git(dir, 'switch', '-q', 'main');
    ecrire(dir, `${BASE}\n## [2026-11-25 09:00] — main\n\nentrée de main\n`);
    git(dir, 'commit', '-qam', 'entrée de main');
    git(dir, 'switch', '-q', 'reordonnee');
    git(dir, 'merge', '-q', '--no-edit', 'main');
    // main avance encore après la fusion fautive.
    git(dir, 'switch', '-q', 'main');
    const apres = fs.readFileSync(path.join(dir, CHEMIN_JOURNAL), 'utf8');
    ecrire(dir, `${apres}\n## [2026-11-25 11:00] — main encore\n\nautre\n`);
    git(dir, 'commit', '-qam', 'main avance encore');

    const fusionCi = (branche) => {
      git(dir, 'switch', '-q', '--detach', 'main');
      git(dir, 'merge', '-q', '--no-ff', '--no-edit', branche);
      return lancer(dir, 'HEAD^1', 'HEAD');
    };

    const correcte = fusionCi('correcte');
    assert.equal(correcte.status, 0, correcte.stderr);
    assert.match(correcte.stdout, /ajout en fin seulement/);

    const code = fusionCi('code');
    assert.equal(code.status, 0, code.stderr);
    assert.match(code.stdout, /intouché/);

    const reordonnee = fusionCi('reordonnee');
    assert.equal(reordonnee.status, 1, reordonnee.stdout);
    // Le remède nomme le SHA résolu de la base, jamais la ref `HEAD^1`.
    const shaMain = git(dir, 'rev-parse', 'main').trim();
    assert.match(reordonnee.stderr, new RegExp(`git show ${shaMain}:`));
    assert.doesNotMatch(reordonnee.stderr, /git show HEAD\^1:/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('journal absent, lu à travers git : absent de la base 0, supprimé par la tête 1', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wn-session-log-absent-'));
  try {
    git(dir, 'init', '-q', '-b', 'main');
    fs.writeFileSync(path.join(dir, 'a.txt'), 'a\n');
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '-m', 'sans journal');
    fs.mkdirSync(path.join(dir, 'docs/claude'), { recursive: true });
    ecrire(dir, BASE);
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '-m', 'journal créé');
    const cree = lancer(dir, 'HEAD^1', 'HEAD');
    assert.equal(cree.status, 0, cree.stderr);

    git(dir, 'rm', '-q', CHEMIN_JOURNAL);
    git(dir, 'commit', '-q', '-m', 'journal supprimé');
    const supprime = lancer(dir, 'HEAD^1', 'HEAD');
    assert.equal(supprime.status, 1, supprime.stdout);
    assert.match(supprime.stderr, /journal supprimé/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
