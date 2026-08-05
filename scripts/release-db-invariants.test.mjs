// Invariants de sûreté du workflow `release-db` — le SEUL chemin d'écriture de la
// base de production.
//
// POURQUOI CE BANC. Depuis que le workflow est PROPOSÉ AUTOMATIQUEMENT (déclencheur
// `push` sur une migration mergée), il ne reste plus qu'UNE barrière entre un merge
// et une écriture en production : l'environnement protégé `release-db`. Avant, il en
// fallait deux — qu'un humain clique « Run workflow », ET que l'environnement gate.
// Un `environment:` retiré par mégarde était alors inoffensif tant que personne ne
// déclenchait ; il ne l'est plus.
//
// Ce banc ne remplace pas la configuration côté GitHub (required reviewers, politique
// de branches), qu'un test ne peut pas voir. Il verrouille ce qui vit dans le dépôt,
// c'est-à-dire ce qu'une PR peut casser en silence.
//
// Il travaille sur le TEXTE et non sur un objet YAML : aucun parseur n'est résolvable
// depuis la racine du dépôt, et ce sont de toute façon des propriétés de forme —
// « ce job ne porte pas telle clé » — qu'un objet reconstruit rendrait plus flou.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHEMIN = join(RACINE, '.github/workflows/release-db.yml');
const SOURCE = readFileSync(CHEMIN, 'utf8');

/**
 * Découpe la section `jobs:` en blocs, un par job. Un job commence à une ligne
 * `  <nom>:` en indentation 2 et court jusqu'au job suivant.
 */
function blocsDeJobs(source) {
  const lignes = source.split('\n');
  const debutJobs = lignes.findIndex((l) => l === 'jobs:');
  assert.notEqual(debutJobs, -1, 'section `jobs:` introuvable');

  const blocs = new Map();
  let courant = null;
  for (const ligne of lignes.slice(debutJobs + 1)) {
    const entete = /^ {2}([A-Za-z][\w-]*):\s*$/.exec(ligne);
    if (entete) {
      courant = entete[1];
      blocs.set(courant, []);
      continue;
    }
    if (courant) blocs.get(courant).push(ligne);
  }
  return new Map([...blocs].map(([nom, l]) => [nom, l.join('\n')]));
}

const JOBS = blocsDeJobs(SOURCE);

test('les trois jobs attendus existent', () => {
  assert.deepEqual([...JOBS.keys()].sort(), ['ref-refusee', 'release', 'resume']);
});

test('`release` est le seul job à porter `environment: release-db`', () => {
  const porteurs = [...JOBS].filter(([, bloc]) => /^\s+environment:\s*release-db\s*$/m.test(bloc));
  assert.deepEqual(
    porteurs.map(([nom]) => nom),
    ['release'],
    "l'environnement protégé doit être porté par `release`, et par lui seul",
  );
});

test('`release` reste borné à main', () => {
  assert.match(
    JOBS.get('release'),
    /^\s+if:\s*github\.ref == 'refs\/heads\/main'\s*$/m,
    'le garde de ref de `release` a disparu — un dispatch depuis une branche écrirait en production',
  );
});

test('`ref-refusee` porte toujours la condition inverse et échoue', () => {
  const bloc = JOBS.get('ref-refusee');
  assert.match(bloc, /^\s+if:\s*github\.ref != 'refs\/heads\/main'\s*$/m);
  assert.match(bloc, /exit 1/, 'une ref refusée doit échouer bruyamment, pas être *skipped*');
});

test('`resume` ne porte aucun environnement et ne voit aucun secret', () => {
  const bloc = JOBS.get('resume');
  assert.doesNotMatch(
    bloc,
    /^\s+environment:/m,
    "`resume` doit rester HORS du gate : c'est ce qui lui permet de s'exécuter AVANT l'approbation",
  );
  assert.doesNotMatch(
    bloc,
    /secrets\./,
    "`resume` s'exécute sans approbation humaine — aucun secret ne doit y être en portée",
  );
});

test('`release` dépend de `resume`, pour que le résumé précède la demande', () => {
  assert.match(JOBS.get('release'), /^\s+needs:\s*resume\s*$/m);
});

test("aucune étape d'import ne peut partir d'un déclenchement automatique", () => {
  const lignesImport = SOURCE.split('\n').filter(
    (l) => /^\s+if:/.test(l) && l.includes('import-cb'),
  );
  assert.ok(lignesImport.length >= 3, `attendu au moins 3 étapes gardées, trouvé ${lignesImport.length}`);
  for (const ligne of lignesImport) {
    assert.match(
      ligne,
      /github\.event_name == 'workflow_dispatch'/,
      `l'import NABM ne doit JAMAIS partir sur un push : ${ligne.trim()}`,
    );
  }
});

test('le déclencheur automatique est borné à main et aux seules migrations', () => {
  const bloc = /^on:\n([\s\S]*?)^concurrency:/m.exec(SOURCE);
  assert.ok(bloc, 'section `on:` introuvable');
  const declencheurs = bloc[1];
  assert.match(declencheurs, /^ {2}push:\s*$/m, 'le déclencheur `push` a disparu');
  assert.match(declencheurs, /^ {4}branches:\s*\[main\]\s*$/m, '`push` doit être borné à `main`');
  assert.match(
    declencheurs,
    /^ {6}- 'web\/prisma\/migrations\/\*\*'\s*$/m,
    "le filtre `paths` doit ne viser que les migrations : l'élargir ferait demander une approbation à chaque push",
  );
  const chemins = declencheurs.match(/^ {6}- '.*'$/gm) ?? [];
  assert.equal(chemins.length, 1, `un seul chemin attendu dans \`paths\`, trouvé ${chemins.length}`);
});
