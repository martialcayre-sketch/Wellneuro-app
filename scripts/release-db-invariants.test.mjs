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

// D-044 a élargi ce filtre, DÉLIBÉRÉMENT et à un seul chemin de plus. La borne
// n'a pas disparu, elle a changé de valeur : ce banc la tient à sa nouvelle
// valeur exacte. Élargir encore reste une décision, pas un geste de passage —
// chaque chemin ajouté fait proposer une release, donc demande une approbation
// humaine, à chaque push qui le touche.
test('le déclencheur automatique est borné à main et aux deux chemins décidés', () => {
  const bloc = /^on:\n([\s\S]*?)^concurrency:/m.exec(SOURCE);
  assert.ok(bloc, 'section `on:` introuvable');
  const declencheurs = bloc[1];
  assert.match(declencheurs, /^ {2}push:\s*$/m, 'le déclencheur `push` a disparu');
  assert.match(declencheurs, /^ {4}branches:\s*\[main\]\s*$/m, '`push` doit être borné à `main`');
  assert.match(
    declencheurs,
    /^ {6}- 'web\/prisma\/migrations\/\*\*'\s*$/m,
    'le filtre `paths` doit viser les migrations, seul chemin légitime de leur registre canonique',
  );
  // Sans ce chemin, le contrat de fraîcheur des claims — qui n'a de sens que
  // contre la production — ne démarrerait jamais seul : le LOT-01 ne porte
  // aucune migration. C'est le précédent D-015 (rejeu promis, jamais câblé).
  assert.match(
    declencheurs,
    /^ {6}- 'web\/src\/lib\/clinical\/\*\*'\s*$/m,
    "le filtre `paths` doit viser les tables de règles cliniques (D-044), sans quoi le contrat de fraîcheur des claims ne se rejoue jamais",
  );
  const chemins = declencheurs.match(/^ {6}- '.*'$/gm) ?? [];
  assert.equal(chemins.length, 2, `deux chemins attendus dans \`paths\`, trouvé ${chemins.length}`);
});

// Le commentaire de la section `on:` explique au relecteur ce que le filtre laisse
// passer. S'il nomme un autre chemin que celui réellement appliqué, il enseigne le
// faux à la seule personne qui relira ce fichier avant d'approuver une écriture en
// production. C'est arrivé dès la première rédaction : le commentaire disait
// `prisma/migrations/**` quand le filtre visait `web/prisma/migrations/**`.
test('le commentaire du déclencheur nomme le chemin réellement filtré', () => {
  const bloc = /^on:\n([\s\S]*?)^concurrency:/m.exec(SOURCE);
  const declencheurs = bloc[1];
  const chemins = [...declencheurs.matchAll(/^ {6}- '(.+)'$/gm)].map((m) => m[1]);
  assert.ok(chemins.length > 0, 'aucun chemin lisible dans `paths`');

  // Les spans sont relevés LIGNE PAR LIGNE : sur le texte entier, une regex
  // apparie la backtick fermante d'une citation avec l'ouvrante de la suivante et
  // capture la prose qui les sépare. Première rédaction de ce banc, et il rougissait
  // sur un fichier sain.
  // Depuis D-044 le filtre porte DEUX chemins : une citation doit être l'un
  // d'eux, pas « le » chemin. Un commentaire qui citerait un glob voisin mais
  // faux — `migrations/**` pour `web/prisma/migrations/**` — enseignerait le
  // faux à la seule personne qui relira ce fichier avant d'approuver une
  // écriture en production.
  const cites = declencheurs
    .split('\n')
    .filter((l) => /^\s*#/.test(l))
    .flatMap((l) => l.match(/`[^`]+`/g) ?? [])
    .filter((c) => c.includes('/**`'));

  assert.ok(cites.length > 0, 'le commentaire doit citer les chemins filtrés, pour que le relecteur sache');
  for (const cite of cites) {
    assert.ok(
      chemins.includes(cite.slice(1, -1)),
      `le commentaire cite ${cite}, qui n'est pas un des chemins filtrés (${chemins.join(', ')})`,
    );
  }

  // Chaque chemin réellement filtré est expliqué quelque part dans le
  // commentaire : en ajouter un en silence est précisément ce qu'un relecteur
  // ne doit pas avoir à découvrir en lisant le YAML.
  for (const chemin of chemins) {
    assert.ok(
      cites.includes(`\`${chemin}\``),
      `le chemin filtré \`${chemin}\` n'est expliqué par aucun commentaire`,
    );
  }
});
