// Invariants de `.github/workflows/ci.yml`.
//
// Sur le modèle de `release-db-invariants.test.mjs` : un workflow porte des
// règles qu'un commentaire ne suffit pas à tenir, parce qu'une expression YAML
// se modifie sans que rien ne rougisse. Deux d'entre elles ont un coût réel et
// silencieux, d'où ce banc.
//
// 1. LE GROUPE DE CONCURRENCE NE DOIT JAMAIS ÊTRE PARTAGÉ PAR DEUX RUNS DE
//    `main`. `cancel-in-progress: false` ne le garantit PAS : à groupe partagé,
//    GitHub sérialise les runs et annule le run *pending* intermédiaire dès
//    qu'un troisième arrive. Trois merges dans une fenêtre de ~15 min sont
//    ordinaires ici et un run dure ~11 min. Comme `strict` est délibérément
//    désactivé sur la protection de `main`, le run `push` est la SEULE
//    vérification du résultat fusionné — et personne ne la regarde
//    (`wn-attendre-ci.mjs` travaille sur des PR). La perte serait invisible.
//    L'invariant : la clé de groupe contient `github.run_id` pour `main`.
//
// 2. LE DÉCLENCHEUR `push` DOIT COUVRIR `main`. C'est la contrepartie du
//    retrait de `campaign/**/integration` du même déclencheur (2026-08-07) :
//    retirer `main` aussi laisserait les commits fusionnés sans aucune
//    vérification, et le diff ne montrerait qu'une ligne de moins.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHEMIN = path.join(RACINE, '.github/workflows/ci.yml');
const SOURCE = fs.readFileSync(CHEMIN, 'utf8');

/** Bloc `concurrency:` de premier niveau, hors commentaires. */
function blocConcurrence() {
  const bloc = /^concurrency:\n((?:[ \t]+.*\n|\n)*)/m.exec(SOURCE);
  assert.ok(bloc, 'ci.yml : aucun bloc `concurrency:` de premier niveau.');
  return bloc[1]
    .split('\n')
    .filter((l) => !/^\s*#/.test(l))
    .join('\n');
}

/** Contenu du déclencheur `push:` (liste de branches). */
function branchesDuPush() {
  const on = /^on:\n((?:[ \t]+.*\n|\n)*)/m.exec(SOURCE);
  assert.ok(on, 'ci.yml : bloc `on:` illisible.');
  const push = /^ {2}push:\n((?: {4}.*\n)*)/m.exec(on[1]);
  assert.ok(push, 'ci.yml : le déclencheur `push:` a disparu.');
  return [...push[1].matchAll(/^ +- +"?([^"\n]+)"?$/gm)].map((m) => m[1].trim());
}

test('le groupe de concurrence est unique par run sur `main`', () => {
  const bloc = blocConcurrence();
  const groupe = /group:\s*(.+)/.exec(bloc);
  assert.ok(groupe, 'ci.yml : `concurrency.group` illisible.');
  assert.match(
    groupe[1],
    /github\.run_id/,
    'le groupe de concurrence ne contient pas `github.run_id` : deux runs de `main` pourraient le partager, ' +
      'et GitHub annulerait le run pending intermédiaire — un commit fusionné perdrait sa seule vérification.',
  );
  assert.match(
    groupe[1],
    /refs\/heads\/main/,
    'le groupe doit distinguer `main` des autres refs : sinon `run_id` y rendrait aussi chaque run de PR unique, ' +
      'et plus aucun run supplanté ne serait annulé — le doublon que ce bloc existe pour supprimer.',
  );
});

test('les runs de PR restent annulables, ceux de `main` jamais', () => {
  const annulation = /cancel-in-progress:\s*(.+)/.exec(blocConcurrence());
  assert.ok(annulation, 'ci.yml : `concurrency.cancel-in-progress` illisible.');
  assert.match(
    annulation[1],
    /github\.ref\s*!=\s*'refs\/heads\/main'/,
    'cancel-in-progress ne conditionne plus sur `main` : soit les runs de PR ne sont plus dédoublonnés, ' +
      'soit un run de `main` peut être annulé.',
  );
});

test('`push` couvre `main` — la seule vérification du résultat fusionné', () => {
  assert.ok(
    branchesDuPush().includes('main'),
    '`push` ne couvre plus `main` : `strict` étant désactivé sur la protection de branche, ' +
      'plus rien ne vérifierait le commit réellement fusionné.',
  );
});

test('`push` ne couvre PAS les branches de campagne — le doublon retiré le 2026-08-07', () => {
  const doublons = branchesDuPush().filter((b) => b.includes('campaign/'));
  assert.deepEqual(
    doublons,
    [],
    'une branche de campagne est revenue dans `push` : chaque poussée avec PR ouverte repaierait DEUX runs `verify`, ' +
      'alors que la protection de branche n’exige que celui du run `pull_request`.',
  );
});

test('`pull_request` couvre `main` et les branches de campagne', () => {
  const on = /^on:\n((?:[ \t]+.*\n|\n)*)/m.exec(SOURCE)[1];
  const pr = /^ {2}pull_request:\n((?: {4}.*\n)*)/m.exec(on);
  assert.ok(pr, 'ci.yml : le déclencheur `pull_request:` a disparu.');
  const branches = [...pr[1].matchAll(/^ +- +"?([^"\n]+)"?$/gm)].map((m) => m[1].trim());
  assert.ok(branches.includes('main'), '`pull_request` ne couvre plus `main`.');
  assert.ok(
    branches.some((b) => b.includes('campaign/')),
    '`pull_request` ne couvre plus les branches de campagne — qui n’ont plus de run `push` pour compenser.',
  );
});
