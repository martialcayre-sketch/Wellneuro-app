// Banc de `scripts/run-certify-bancs.sh`, sur une arborescence jetable.
//
// Le script est un garde bloquant de `npm run check` (`certify-check`,
// web/package.json) et du CI (étape « Bancs du banc de certification ») ; il
// était un garde d'outillage joué par `check` sans banc. Sa promesse, écrite en
// tête : un dossier de `tools/corpus/*/lib` sans aucun `*.test.mjs` fait
// échouer en 1, avec un message, au lieu du `# tests 0` vert qu'un motif nu
// rendrait sous bash et sh. Le banc tient trois promesses :
//   1. les quatre dossiers garnis d'un banc trivial vert : code 0, la liste
//      des bancs imprimée, et chaque banc réellement joué (fichier témoin) ;
//   2. mutation : un dossier vidé (fichier d'outil seul, suffixe de test
//      changé) ou absent fait échouer en 1, avec le message qui le nomme, et
//      aucun banc n'est joué — scène répétée pour chacun des quatre dossiers ;
//   3. contre-épreuve : un banc rouge rend le script rouge (le `exec node
//      --test` propage le code).
// Le script dérive sa racine de `BASH_SOURCE` : il est copié dans
// `<racine jetable>/scripts/`, et joué depuis un `cwd` hors de cette racine.
// Le comportement du script n'est pas l'objet du banc : il le constate. Les
// bancs de corpus réels sous `tools/` ne sont pas joués ici.

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'run-certify-bancs.sh');

// Les quatre dossiers que le script balaie, dans son ordre.
const DOSSIERS = [
  'tools/corpus/certify/lib',
  'tools/corpus/claims/lib',
  'tools/corpus/fiches/lib',
  'tools/corpus/fiches-usage/lib',
];

// Un banc trivial : il pose un fichier témoin à côté de lui, preuve qu'il a
// été joué, puis passe (ou échoue si `rouge`).
function banc(rouge = false) {
  return [
    "import test from 'node:test';",
    "import fs from 'node:fs';",
    "import { fileURLToPath } from 'node:url';",
    "fs.writeFileSync(fileURLToPath(import.meta.url) + '.joue', 'ok');",
    rouge
      ? "test('rouge', () => { throw new Error('rouge voulu'); });"
      : "test('vert', () => {});",
    '',
  ].join('\n');
}

function preparer() {
  const racine = fs.mkdtempSync(path.join(os.tmpdir(), 'wn-run-certify-bancs-'));
  fs.mkdirSync(path.join(racine, 'scripts'));
  fs.copyFileSync(SCRIPT, path.join(racine, 'scripts', 'run-certify-bancs.sh'));
  for (const dossier of DOSSIERS) {
    fs.mkdirSync(path.join(racine, dossier), { recursive: true });
    fs.writeFileSync(path.join(racine, dossier, 'a.test.mjs'), banc());
  }
  return racine;
}

function jouer(racine) {
  // Le banc est lui-même joué par `node --test` : son contexte de runner
  // (`NODE_TEST_CONTEXT`) ne doit pas passer au `node --test` du script.
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  return spawnSync('bash', [path.join(racine, 'scripts', 'run-certify-bancs.sh')], {
    cwd: os.tmpdir(),
    env,
    encoding: 'utf8',
  });
}

function temoins(racine) {
  return DOSSIERS.filter((d) => fs.existsSync(path.join(racine, d, 'a.test.mjs.joue')));
}

test('quatre dossiers garnis : code 0, liste imprimée, chaque banc joué', (t) => {
  const racine = preparer();
  t.after(() => fs.rmSync(racine, { recursive: true, force: true }));
  const r = jouer(racine);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^bancs de certification exécutés \(4\) :$/m);
  for (const dossier of DOSSIERS) {
    assert.ok(r.stdout.includes(`  - ${dossier}/a.test.mjs\n`), `liste sans ${dossier} :\n${r.stdout}`);
  }
  assert.deepEqual(temoins(racine), DOSSIERS);
});

for (const dossier of DOSSIERS) {
  test(`mutation : ${dossier} sans *.test.mjs → code 1, message, aucun banc joué`, (t) => {
    const racine = preparer();
    t.after(() => fs.rmSync(racine, { recursive: true, force: true }));
    // Suffixe de test changé, et un fichier d'outil qui reste : le dossier
    // n'est pas vide, il n'a plus de banc.
    fs.renameSync(path.join(racine, dossier, 'a.test.mjs'), path.join(racine, dossier, 'a.spec.mjs'));
    fs.writeFileSync(path.join(racine, dossier, 'outil.mjs'), 'export const x = 1;\n');
    const r = jouer(racine);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.ok(
      r.stderr.includes(`ÉCHEC : aucun banc *.test.mjs dans ${path.join(racine, dossier)}\n`),
      r.stderr,
    );
    assert.doesNotMatch(r.stdout, /bancs de certification exécutés/);
    assert.deepEqual(temoins(racine), []);
  });
}

test('mutation : dossier absent → code 1, message, aucun banc joué', (t) => {
  const racine = preparer();
  t.after(() => fs.rmSync(racine, { recursive: true, force: true }));
  const dossier = 'tools/corpus/fiches/lib';
  fs.rmSync(path.join(racine, dossier), { recursive: true });
  const r = jouer(racine);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.ok(r.stderr.includes(`ÉCHEC : aucun banc *.test.mjs dans ${path.join(racine, dossier)}\n`), r.stderr);
  assert.deepEqual(temoins(racine), []);
});

test('contre-épreuve : un banc rouge rend le script rouge', (t) => {
  const racine = preparer();
  t.after(() => fs.rmSync(racine, { recursive: true, force: true }));
  fs.writeFileSync(path.join(racine, 'tools/corpus/claims/lib', 'a.test.mjs'), banc(true));
  const r = jouer(racine);
  assert.notEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^bancs de certification exécutés \(4\) :$/m);
  assert.deepEqual(temoins(racine), DOSSIERS);
});
