// Banc de `scripts/nettoyage-branches.sh`, en constat seul (jamais
// `--appliquer`), sur un dépôt jetable et un faux `gh`.
//
// Il tient trois promesses du passage en REST (`D-540`, constat du
// 2026-11-20 : GraphQL refusé en cloud) :
//   1. les branches des PR ouvertes restent protégées, et la preuve d'une PR
//      mergée se lit en REST ;
//   2. une liste des PR ouvertes illisible arrête le script (code 3), au lieu
//      de continuer sans rien protéger — ce que faisait `gh pr list` en
//      silence ;
//   3. une preuve illisible se dit « lecture GitHub en échec », jamais
//      « aucune preuve ».
// Et un nom de branche accentué se dit « non interrogeable », sans partir
// vers GitHub : l'alphabet de `branche_sure` s'écrit sans plage, qui suit la
// collation de la locale sous bash 3.2 (macOS), où « é » tombe dans `a-z`.
// Le faux `gh` refuse aussi tout `gh pr …` : un retour à GraphQL rougit.

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'nettoyage-branches.sh');

const FAUX_GH = `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
const d = JSON.parse(fs.readFileSync(process.env.FAUX_GH_DONNEES, 'utf8'));
fs.appendFileSync(process.env.FAUX_GH_JOURNAL, JSON.stringify(args) + '\\n');
if (args[0] !== 'api') { process.stderr.write('GraphQL refusé (faux gh)\\n'); process.exit(1); }
const chemin = args.find((a) => a.startsWith('repos/'));
const jq = args[args.indexOf('--jq') + 1] || '';
if (chemin.includes('state=open')) {
  if (d.echecOuvertes) process.exit(1);
  process.stdout.write(d.ouvertes.map((b) => b + '\\n').join(''));
  process.exit(0);
}
const tete = decodeURIComponent((chemin.match(/head=\\{owner\\}:([^&]+)/) || [])[1] || '');
if (d.echecPreuves) process.exit(1);
if (jq.includes('merged_at != null')) {
  const m = d.mergees[tete];
  if (m) process.stdout.write(m[0] + ' ' + m[1] + '\\n');
  process.exit(0);
}
if (jq.includes('merged_at == null')) { process.stdout.write('aucune PR\\n'); process.exit(0); }
process.exit(1);
`;

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function preparer() {
  const racine = fs.mkdtempSync(path.join(os.tmpdir(), 'wn-nettoyage-'));
  const origine = path.join(racine, 'origine.git');
  const depot = path.join(racine, 'depot');
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', origine]);
  execFileSync('git', ['init', '-q', '-b', 'main', depot]);
  git(depot, 'config', 'user.email', 'banc@example.invalid');
  git(depot, 'config', 'user.name', 'banc');
  // Les crochets globaux du poste (`core.hooksPath`) ne jouent pas dans le banc.
  git(depot, 'config', 'core.hooksPath', path.join(racine, 'sans-crochets'));
  git(depot, 'commit', '-q', '--allow-empty', '-m', 'racine');
  git(depot, 'remote', 'add', 'origin', origine);
  for (const b of ['ouverte', 'mergee', 'inconnue', 'fix+z', 'fix-é']) {
    git(depot, 'switch', '-q', '-c', b, 'main');
    git(depot, 'commit', '-q', '--allow-empty', '-m', b);
  }
  git(depot, 'switch', '-q', 'main');
  git(depot, 'push', '-q', 'origin', 'main', 'ouverte', 'mergee', 'inconnue', 'fix+z', 'fix-é');
  const bin = path.join(racine, 'bin');
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, 'gh'), FAUX_GH);
  fs.chmodSync(path.join(bin, 'gh'), 0o755);
  return { racine, depot, bin, shaMergee: git(depot, 'rev-parse', 'mergee') };
}

function jouer(env, donnees) {
  const fichier = path.join(env.racine, 'donnees.json');
  const journal = path.join(env.racine, 'journal.ndjson');
  fs.writeFileSync(fichier, JSON.stringify(donnees));
  fs.writeFileSync(journal, '');
  const r = spawnSync('bash', [SCRIPT], {
    cwd: env.depot,
    encoding: 'utf8',
    env: { ...process.env, PATH: `${env.bin}${path.delimiter}${process.env.PATH}`, FAUX_GH_DONNEES: fichier, FAUX_GH_JOURNAL: journal },
  });
  const appels = fs.readFileSync(journal, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  return { ...r, appels };
}

test('constat nominal en REST : PR ouverte protégée, PR mergée prouvée, aucun `gh pr`', (t) => {
  const env = preparer();
  t.after(() => fs.rmSync(env.racine, { recursive: true, force: true }));
  const r = jouer(env, { ouvertes: ['ouverte'], mergees: { mergee: [7, env.shaMergee] } });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /GARDÉE \(protégée ou extraite\) : ouverte/);
  assert.match(r.stdout, /SUPPRIMABLE \(PR #7 mergée\) : mergee/);
  assert.match(r.stdout, /À EXAMINER \(aucune PR\) : inconnue/);
  assert.match(r.stdout, /GARDÉE \(protégée\) : origin\/ouverte/);
  assert.match(r.stdout, /SUPPRIMABLE \(PR #7 mergée\) : origin\/mergee/);
  // Un nom hors alphabet n'est pas interrogé, et ne se dit pas « aucune PR » (revue PR-Agent #2287).
  assert.match(r.stdout, /À EXAMINER \(nom de branche non interrogeable\) : fix\+z/);
  assert.match(r.stdout, /À EXAMINER \(nom de branche non interrogeable\) : origin\/fix\+z/);
  assert.ok(r.appels.every((a) => !a.some((x) => x.includes('fix+z'))), 'le nom hors alphabet a été envoyé à GitHub');
  // Un nom accentué non plus (P3 laissé de #2287, bash 3.2).
  assert.match(r.stdout, /À EXAMINER \(nom de branche non interrogeable\) : fix-é/);
  assert.match(r.stdout, /À EXAMINER \(nom de branche non interrogeable\) : origin\/fix-é/);
  assert.ok(r.appels.every((a) => !a.some((x) => x.includes('fix-é'))), 'le nom accentué a été envoyé à GitHub');
  assert.match(r.stdout, /Constat seul — rien n'a été supprimé/);
  assert.ok(r.appels.length > 0, 'le faux gh n’a pas été appelé');
  assert.ok(r.appels.every((a) => a[0] === 'api'), 'un appel `gh pr` (GraphQL) subsiste');
});

test('liste des PR ouvertes illisible : arrêt en code 3, rien n’est examiné', (t) => {
  const env = preparer();
  t.after(() => fs.rmSync(env.racine, { recursive: true, force: true }));
  const r = jouer(env, { echecOuvertes: true, ouvertes: [], mergees: {} });
  assert.equal(r.status, 3);
  assert.match(r.stderr, /Lecture des PR ouvertes impossible/);
  assert.doesNotMatch(r.stdout, /SUPPRIMABLE|À EXAMINER/);
});

test('preuve illisible : « lecture GitHub en échec », jamais « aucune preuve »', (t) => {
  const env = preparer();
  t.after(() => fs.rmSync(env.racine, { recursive: true, force: true }));
  const r = jouer(env, { echecPreuves: true, ouvertes: ['ouverte'], mergees: { mergee: [7, env.shaMergee] } });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /À EXAMINER \(lecture GitHub en échec\) : mergee/);
  assert.match(r.stdout, /À EXAMINER \(lecture GitHub en échec\) : origin\/mergee/);
  assert.doesNotMatch(r.stdout, /SUPPRIMABLE/);
});

test('alphabet de `branche_sure` sans plage : la collation de bash 3.2 n’y entre pas', () => {
  const source = fs.readFileSync(SCRIPT, 'utf8');
  // Le corps de `branche_sure` seul (revue PR-Agent #2321) : d'autres motifs du
  // script peuvent porter une plage légitime.
  const corps = (source.match(/^branche_sure\(\) \{\n([\s\S]*?)^\}/m) || [])[1];
  assert.ok(corps, 'corps de `branche_sure` introuvable');
  const crochets = [...corps.matchAll(/\[!?([^\]]+)\]/g)].map((m) => m[1]);
  assert.ok(crochets.length > 0, 'alphabet de `branche_sure` introuvable');
  for (const c of crochets) {
    // Seul un tiret final est admis (littéral) ; tout autre tiret forme une plage.
    assert.doesNotMatch(c.slice(0, -1), /-/, `plage dans l’alphabet : [${c}]`);
  }
});
