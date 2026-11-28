// Banc de `scripts/repo-hygiene.sh`, sur un dépôt git jetable.
//
// La passe de l'orchestrateur cloud le joue chaque jour en `audit-only`
// (`docs/claude/templates/ORCHESTRATEUR_PASSE.md` §5), alors que son mode
// `apply-safe` déplace des fichiers et réécrit des références (`sed -i`).
// Le banc tient trois promesses :
//   1. `audit-only` laisse l'arbre identique à l'octet, hors de son dossier
//      de sortie (ignoré par git, comme `.repo-hygiene*/` dans le dépôt), et
//      produit son rapport ;
//   2. une commande inconnue, ou une option inconnue d'`apply-safe`, échoue
//      (code 2) sans rien écrire ;
//   3. contre-épreuve : `apply-safe`, joué dans le seul dépôt jetable,
//      déplace bien (fichier suivi par `git mv`, non suivi par `mv`) et
//      réécrit les références — jamais hors de `--root`.
// Le banc joue le script depuis sa racine (`cwd` = `--root`), comme la passe
// cloud ; deux scènes le jouent aussi depuis un `cwd` hors de `--root` :
// `move_file_safe` résout ses chemins contre `--root` (lot
// `repo-hygiene-move-file-safe-racine`, P2-1 de `wn-reviewer` sur #2374).
// Le `--dry-run` crée ses dossiers d'archive et `moved-map.tsv` : il ne
// déplace ni ne modifie aucun fichier, ce que seul le banc promet.
// Le comportement du script n'est pas l'objet du banc : il le constate.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'repo-hygiene.sh');

const ANCIEN_CONTEXTE = 'docs/claude/CONTEXTE_ESSAI_2026-01-02.md';
const ANCIENNE_REPRISE = 'docs/claude/reprise/reprise-essai.md';
const REPRISE_NON_SUIVIE = 'docs/claude/reprise/reprise-locale.md';
const CONTEXTE_GARDE = 'docs/claude/CONTEXTE_SESSION_VERCEL_2026-07-01.md';

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function ecrire(racine, rel, contenu) {
  const abs = path.join(racine, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, contenu);
}

function preparer() {
  const racine = fs.mkdtempSync(path.join(os.tmpdir(), 'wn-repo-hygiene-'));
  const depot = path.join(racine, 'depot');
  fs.mkdirSync(depot);
  execFileSync('git', ['init', '-q', '-b', 'main', depot]);
  git(depot, 'config', 'user.email', 'banc@example.invalid');
  git(depot, 'config', 'user.name', 'banc');
  // Les crochets globaux du poste (`core.hooksPath`) ne jouent pas dans le banc.
  git(depot, 'config', 'core.hooksPath', path.join(racine, 'sans-crochets'));
  git(depot, 'config', 'commit.gpgsign', 'false');
  ecrire(depot, '.gitignore', '.repo-hygiene*/\n');
  // Deux occurrences sur une ligne : la réécriture doit être globale.
  ecrire(depot, 'README.md', `Voir ${ANCIEN_CONTEXTE} et ${ANCIENNE_REPRISE}, puis ${ANCIEN_CONTEXTE}.\n`);
  ecrire(depot, ANCIEN_CONTEXTE, '# Contexte daté\n');
  ecrire(depot, ANCIENNE_REPRISE, '# Reprise\n');
  ecrire(depot, CONTEXTE_GARDE, '# Contexte gardé\n');
  ecrire(depot, 'docs/a/jumeau.md', 'contenu identique\n');
  ecrire(depot, 'docs/b/jumeau.md', 'contenu identique\n');
  ecrire(depot, 'scripts/outil.sh', '#!/usr/bin/env bash\necho outil\n');
  git(depot, 'add', '-A');
  git(depot, 'commit', '-q', '-m', 'racine');
  ecrire(depot, REPRISE_NON_SUIVIE, '# Reprise locale\n');
  // Hors de `--root` : une référence à l'ancien chemin que le script ne doit
  // jamais réécrire.
  const temoin = path.join(racine, 'hors-banc.md');
  fs.writeFileSync(temoin, `Voir ${ANCIEN_CONTEXTE}.\n`);
  return { racine, depot, temoin };
}

function jouer(env, ...args) {
  return jouerDepuis(env, env.depot, ...args);
}

function jouerDepuis(env, cwd, ...args) {
  return spawnSync('bash', [SCRIPT, ...args, '--root', env.depot], { cwd, encoding: 'utf8' });
}

/**
 * Empreinte de chaque fichier de l'arbre, hors `.git` et dossier de sortie ;
 * avec `dossiers`, chaque dossier y figure aussi (un dossier créé se voit).
 */
function empreinte(depot, { dossiers = false } = {}) {
  const vues = {};
  const parcourir = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, e.name);
      const rel = path.relative(depot, abs);
      if (rel === '.git' || rel.startsWith('.repo-hygiene')) continue;
      if (e.isDirectory()) {
        if (dossiers) vues[`${rel}/`] = 'dossier';
        parcourir(abs);
      } else vues[rel] = createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
    }
  };
  parcourir(depot);
  return vues;
}

/** Tête et références : une écriture dans `.git` que l'arbre ne montre pas. */
function references(depot) {
  return `${git(depot, 'rev-parse', 'HEAD')}\n${git(depot, 'for-each-ref')}`;
}

test('audit-only : arbre identique à l’octet, rapport produit', (t) => {
  const env = preparer();
  t.after(() => fs.rmSync(env.racine, { recursive: true, force: true }));
  const avant = empreinte(env.depot, { dossiers: true });
  const statutAvant = git(env.depot, 'status', '--porcelain');
  const refsAvant = references(env.depot);
  const r = jouer(env, 'audit-only');
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(empreinte(env.depot, { dossiers: true }), avant, 'audit-only a modifié l’arbre');
  assert.equal(git(env.depot, 'status', '--porcelain'), statutAvant, 'audit-only a changé l’état git');
  assert.equal(references(env.depot), refsAvant, 'audit-only a changé HEAD ou une référence');
  const sortie = path.join(env.depot, '.repo-hygiene');
  for (const f of ['inventory.txt', 'all-hashes.txt', 'duplicates-strict.txt', 'by-basename.txt', 'duplicates-quasi.txt']) {
    assert.ok(fs.existsSync(path.join(sortie, f)), `rapport absent : ${f}`);
  }
  const stricts = fs.readFileSync(path.join(sortie, 'duplicates-strict.txt'), 'utf8');
  assert.match(stricts, /docs\/a\/jumeau\.md/);
  assert.match(stricts, /docs\/b\/jumeau\.md/);
  const quasi = fs.readFileSync(path.join(sortie, 'duplicates-quasi.txt'), 'utf8');
  assert.match(quasi, /### jumeau\.md\n(.*\n)*.*docs\/a\/jumeau\.md\n(.*\n)*.*docs\/b\/jumeau\.md/);
  const inventaire = fs.readFileSync(path.join(sortie, 'inventory.txt'), 'utf8');
  assert.match(inventaire, /## SCRIPTS POTENTIELLEMENT DORMANTS[^#]*scripts\/outil\.sh/);
  assert.match(r.stdout, /\[repo-hygiene\] Carte des zones a risque generee\./);
  assert.equal(fs.readFileSync(env.temoin, 'utf8'), `Voir ${ANCIEN_CONTEXTE}.\n`);
  assert.deepEqual(fs.readdirSync(env.racine).sort(), ['depot', 'hors-banc.md'], 'écriture hors de --root');
});

test('commande inconnue : code 2, rien n’est écrit', (t) => {
  const env = preparer();
  t.after(() => fs.rmSync(env.racine, { recursive: true, force: true }));
  const avant = empreinte(env.depot);
  const r = jouer(env, 'audit-tout');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Unknown command: audit-tout/);
  assert.deepEqual(empreinte(env.depot), avant);
  assert.ok(!fs.existsSync(path.join(env.depot, '.repo-hygiene')), 'dossier de sortie créé');
});

test('option inconnue d’apply-safe : code 2, rien n’est déplacé', (t) => {
  const env = preparer();
  t.after(() => fs.rmSync(env.racine, { recursive: true, force: true }));
  const avant = empreinte(env.depot);
  const r = jouer(env, 'apply-safe', '--appliquer-tout');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Unknown option for apply-safe: --appliquer-tout/);
  assert.deepEqual(empreinte(env.depot), avant);
  assert.ok(!fs.existsSync(path.join(env.depot, '.repo-hygiene')), 'dossier de sortie créé');
});

test('apply-safe --dry-run : annonce les déplacements, ne déplace ni ne modifie aucun fichier', (t) => {
  const env = preparer();
  t.after(() => fs.rmSync(env.racine, { recursive: true, force: true }));
  const avant = empreinte(env.depot);
  const statutAvant = git(env.depot, 'status', '--porcelain');
  const r = jouer(env, 'apply-safe', '--dry-run');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, new RegExp(`MOVE ${ANCIEN_CONTEXTE} -> docs/archive/contextes/CONTEXTE_ESSAI_2026-01-02\\.md`));
  assert.match(r.stdout, new RegExp(`MOVE ${ANCIENNE_REPRISE} -> docs/archive/reprise/reprise-essai\\.md`));
  assert.match(r.stdout, new RegExp(`REPLACE ${ANCIEN_CONTEXTE} in README\\.md`));
  assert.deepEqual(empreinte(env.depot), avant, 'le dry-run a modifié un fichier');
  assert.equal(git(env.depot, 'status', '--porcelain'), statutAvant);
});

test('contre-épreuve : apply-safe déplace et réécrit dans le dépôt jetable, jamais hors de --root', (t) => {
  const env = preparer();
  t.after(() => fs.rmSync(env.racine, { recursive: true, force: true }));
  const r = jouer(env, 'apply-safe');
  assert.equal(r.status, 0, r.stderr);
  const nouveauContexte = 'docs/archive/contextes/CONTEXTE_ESSAI_2026-01-02.md';
  const nouvelleReprise = 'docs/archive/reprise/reprise-essai.md';
  assert.ok(!fs.existsSync(path.join(env.depot, ANCIEN_CONTEXTE)));
  assert.ok(!fs.existsSync(path.join(env.depot, ANCIENNE_REPRISE)));
  assert.ok(!fs.existsSync(path.join(env.depot, REPRISE_NON_SUIVIE)));
  // Un fichier non suivi part par `mv`.
  assert.equal(fs.readFileSync(path.join(env.depot, 'docs/archive/reprise/reprise-locale.md'), 'utf8'), '# Reprise locale\n');
  assert.equal(fs.readFileSync(path.join(env.depot, nouveauContexte), 'utf8'), '# Contexte daté\n');
  assert.equal(fs.readFileSync(path.join(env.depot, nouvelleReprise), 'utf8'), '# Reprise\n');
  // Le contexte nommément gardé reste en place.
  assert.ok(fs.existsSync(path.join(env.depot, CONTEXTE_GARDE)));
  // Un fichier suivi part par `git mv` : le déplacement est indexé.
  const indexe = git(env.depot, 'diff', '--cached', '--name-status', '-M');
  assert.match(indexe, new RegExp(`R100\\t${ANCIEN_CONTEXTE}\\t${nouveauContexte}`));
  assert.match(indexe, new RegExp(`R100\\t${ANCIENNE_REPRISE}\\t${nouvelleReprise}`));
  assert.equal(
    fs.readFileSync(path.join(env.depot, 'README.md'), 'utf8'),
    `Voir ${nouveauContexte} et ${nouvelleReprise}, puis ${nouveauContexte}.\n`,
  );
  assert.equal(
    fs.readFileSync(path.join(env.depot, '.repo-hygiene', 'moved-map.tsv'), 'utf8'),
    `${ANCIENNE_REPRISE}\t${nouvelleReprise}\n${REPRISE_NON_SUIVIE}\tdocs/archive/reprise/reprise-locale.md\n${ANCIEN_CONTEXTE}\t${nouveauContexte}\n`,
  );
  assert.equal(fs.readFileSync(env.temoin, 'utf8'), `Voir ${ANCIEN_CONTEXTE}.\n`, 'réécriture hors de --root');
  assert.deepEqual(fs.readdirSync(env.racine).sort(), ['depot', 'hors-banc.md'], 'écriture hors de --root');
});

test('apply-safe depuis un cwd hors de --root : déplace dans la racine, n’écrit rien dans le cwd', (t) => {
  const env = preparer();
  t.after(() => fs.rmSync(env.racine, { recursive: true, force: true }));
  const ailleurs = path.join(env.racine, 'ailleurs');
  fs.mkdirSync(ailleurs);
  const r = jouerDepuis(env, ailleurs, 'apply-safe');
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(fs.readdirSync(ailleurs), [], 'écriture dans le cwd');
  assert.ok(!fs.existsSync(path.join(env.depot, REPRISE_NON_SUIVIE)));
  // Le fichier non suivi, déplacé par `mv`, arrive dans la racine.
  assert.equal(fs.readFileSync(path.join(env.depot, 'docs/archive/reprise/reprise-locale.md'), 'utf8'), '# Reprise locale\n');
  assert.equal(
    fs.readFileSync(path.join(env.depot, 'docs/archive/contextes/CONTEXTE_ESSAI_2026-01-02.md'), 'utf8'),
    '# Contexte daté\n',
  );
  assert.equal(fs.readFileSync(path.join(env.depot, 'docs/archive/reprise/reprise-essai.md'), 'utf8'), '# Reprise\n');
  assert.deepEqual(fs.readdirSync(env.racine).sort(), ['ailleurs', 'depot', 'hors-banc.md'], 'écriture hors de --root');
});

test('apply-safe --dry-run depuis un cwd hors de --root : ne crée rien dans le cwd', (t) => {
  const env = preparer();
  t.after(() => fs.rmSync(env.racine, { recursive: true, force: true }));
  const ailleurs = path.join(env.racine, 'ailleurs');
  fs.mkdirSync(ailleurs);
  const avant = empreinte(env.depot);
  const r = jouerDepuis(env, ailleurs, 'apply-safe', '--dry-run');
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(fs.readdirSync(ailleurs), [], 'écriture dans le cwd');
  assert.deepEqual(empreinte(env.depot), avant, 'le dry-run a modifié un fichier');
});
