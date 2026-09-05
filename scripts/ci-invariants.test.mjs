// Invariants de `.github/workflows/ci.yml`.
//
// Sur le modèle de `release-db-invariants.test.mjs` : un workflow porte des
// règles qu'un commentaire ne suffit pas à tenir, parce qu'une expression YAML
// se modifie sans que rien ne rougisse. Quatre d'entre elles ont un coût réel
// et silencieux, d'où ce banc.
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
//
// 3. `visual-baselines.yml` DOIT TOURNER SUR LE MÊME NODE QUE `verify`. Ce
//    workflow existe pour produire les baselines « dans l'environnement de
//    référence (Ubuntu, celui du job verify) » — c'est écrit dans son en-tête,
//    et c'est sa seule justification d'être manuel et séparé. Il générait
//    pourtant sous Node 20 ce que `verify` relit sous Node 22, depuis le
//    2026-08-05 : la promesse était fausse et rien ne le disait. Une image
//    produite ailleurs que là où elle sera comparée est une baseline dont
//    personne ne peut dire ce qu'elle prouve.
//
// 4. `visual-baselines.yml` DOIT PASSER `--update-snapshots=all`. Le drapeau nu
//    prend le préréglage `changed` : Playwright ne réécrit alors que ce qu'il
//    juge différent, avec les options du matcher (`maxDiffPixelRatio: 0.02`).
//    Une baseline périmée dont l'écart passe sous ce seuil survit au workflow
//    et repart telle quelle dans l'artefact. Constaté le 2026-09-04 (run
//    33915188718) : les deux images `fiche-tiroir-besoins` de l'artefact
//    étaient octet pour octet celles déjà commises, alors que la capture de
//    revue du même run montrait le rail posé obtenu par #871. Un workflow dont
//    le métier est de produire la référence ne doit jamais avoir le droit de
//    la conserver.
//
// 5. L'ARTEFACT `playwright-report` DOIT ÊTRE ÉCRIT PAR QUELQU'UN. `ci.yml`
//    publiait `web/playwright-report/` depuis toujours, mais
//    `playwright.config.ts` déclarait `reporter: 'list'` : personne n'écrivait
//    ce dossier. Sans `if-no-files-found: error`, l'étape publiait le vide en
//    silence — et `web/.gitignore` ignorait déjà le chemin, ce qui achevait de
//    rendre l'artefact crédible. Résultat : un échec E2E en CI ne laissait ni
//    images de diff ni rapport, et il fallait extraire le log brut du job par
//    l'API. Une étape de diagnostic qui échoue en silence est pire que pas
//    d'étape : on la croit là le jour où on en a besoin.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHEMIN = path.join(RACINE, '.github/workflows/ci.yml');
const SOURCE = fs.readFileSync(CHEMIN, 'utf8');
const CHEMIN_BASELINES = path.join(RACINE, '.github/workflows/visual-baselines.yml');
const CHEMIN_PLAYWRIGHT = path.join(RACINE, 'web/playwright.config.ts');

/** Versions de Node déclarées par un workflow, dans l'ordre, quotes retirées. */
function versionsDeNode(source, quoi) {
  const trouvees = [...source.matchAll(/^\s*node-version:\s*['"]?([^'"\s#]+)/gm)].map((m) => m[1]);
  assert.ok(trouvees.length > 0, `${quoi} : aucune clé node-version déclarée.`);
  return trouvees;
}

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

/**
 * Valeur EFFECTIVE de `concurrency.group`, commentaire de fin de ligne retiré.
 *
 * Sans cette coupe, l'assertion porte sur la ligne brute : une clé de groupe
 * réduite à `${{ github.ref }}` suivie de ` # ${{ … github.run_id … }}` en
 * commentaire la satisfaisait, alors que le groupe redevenait PARTAGÉ sur
 * `main`. Le `#` d'une expression `${{ }}` n'existe pas ici — on coupe au
 * premier ` #` hors accolades.
 */
function valeurDuGroupe() {
  const brut = /group:\s*(.+)/.exec(blocConcurrence());
  assert.ok(brut, 'ci.yml : `concurrency.group` illisible.');
  let profondeur = 0;
  const ligne = brut[1];
  for (let i = 0; i < ligne.length; i += 1) {
    if (ligne.startsWith('${{', i)) profondeur += 1;
    else if (ligne.startsWith('}}', i) && profondeur > 0) profondeur -= 1;
    else if (ligne[i] === '#' && profondeur === 0) return ligne.slice(0, i).trim();
  }
  return ligne.trim();
}

test('le groupe de concurrence est unique par run sur `main`', () => {
  const groupe = valeurDuGroupe();
  // Assertion sur l'ORDRE des opérandes, pas sur leur présence. Une assertion
  // de présence est satisfaite par l'inversion exacte du défaut qu'elle
  // commémore — `… && '' || github.run_id` contient les deux motifs et donne
  // groupe PARTAGÉ sur `main` (le run pending intermédiaire est annulé) et
  // unique par run sur les PR (plus aucun dédoublonnage). Falsifié : cette
  // mutation passait 5/5 avant cette forme-ci.
  assert.match(
    groupe,
    /github\.ref\s*==\s*'refs\/heads\/main'\s*&&\s*github\.run_id/,
    "le groupe de concurrence ne rend pas `github.run_id` POUR `main` : deux runs de `main` peuvent alors partager " +
      'le groupe, GitHub annule le run pending intermédiaire, et un commit fusionné perd sa seule vérification. ' +
      "Attendu de la forme `${{ github.ref == 'refs/heads/main' && github.run_id || '' }}`.",
  );
});

// Le pendant de l'invariant précédent, et le seul qui garde le GAIN du lot :
// `github.run_id` ne doit rendre unique que les runs de `main`. Ajouté sans
// condition, il rendrait chaque run de PR seul dans son groupe —
// `cancel-in-progress` ne mordrait plus jamais et le dédoublonnage qui motive
// tout ce lot disparaîtrait en silence, sans qu'aucun autre test le dise.
test('sur une PR, le groupe reste PARTAGÉ — sinon plus rien n’est dédoublonné', () => {
  const sansConditionnelles = valeurDuGroupe().replace(/\$\{\{[^}]*==[\s\S]*?\}\}/g, '');
  assert.doesNotMatch(
    sansConditionnelles,
    /github\.run_id/,
    '`github.run_id` entre dans le groupe hors de la conditionnelle sur `main` : chaque run de PR serait seul dans ' +
      'son groupe, aucun run supplanté ne serait plus annulé.',
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

test('les baselines visuelles sont produites sur le Node qui les comparera', () => {
  const baselines = fs.readFileSync(CHEMIN_BASELINES, 'utf8');
  const duVerify = versionsDeNode(SOURCE, 'ci.yml');
  const desBaselines = versionsDeNode(baselines, 'visual-baselines.yml');

  // Une seule version de part et d'autre : deux `node-version:` divergents dans
  // le même fichier rendraient la comparaison ci-dessous ambiguë, et c'est un
  // état qu'il vaut mieux voir rouge que deviner.
  assert.deepEqual(
    [...new Set(duVerify)],
    [...new Set(desBaselines)],
    'visual-baselines.yml doit déclarer la MÊME version de Node que ci.yml : '
      + `ci.yml=${[...new Set(duVerify)].join(',')}, `
      + `visual-baselines.yml=${[...new Set(desBaselines)].join(',')}. `
      + 'Une baseline produite ailleurs que là où elle est comparée ne prouve rien.',
  );
});

/** Bloc de l'étape qui publie l'artefact `playwright-report`, dans ci.yml. */
function etapeRapportPlaywright() {
  const bloc = /name:\s*playwright-report\n((?:\s+[^\n]*\n)*)/.exec(SOURCE);
  assert.ok(bloc, 'ci.yml : plus aucune étape ne publie l’artefact playwright-report.');
  return bloc[1];
}

test('l’artefact playwright-report est écrit par un rapporteur, pas publié à vide', () => {
  const config = fs.readFileSync(CHEMIN_PLAYWRIGHT, 'utf8');
  const rapporteur = /\[\s*['"]html['"]\s*,\s*\{[^}]*outputFolder:\s*['"]([^'"]+)['"]/.exec(config);
  assert.ok(
    rapporteur,
    'playwright.config.ts ne déclare plus de rapporteur html avec outputFolder : le dossier publié par '
      + 'ci.yml ne serait écrit par personne, et l’étape publierait le vide. C’était l’état jusqu’au '
      + '2026-09-05 — un échec E2E en CI ne laissait alors ni image de diff ni rapport.',
  );

  const attendu = 'web/' + rapporteur[1] + '/';
  const chemin = /path:\s*(\S+)/.exec(etapeRapportPlaywright());
  assert.ok(chemin, 'ci.yml : l’étape playwright-report n’a plus de `path:`.');
  assert.equal(
    chemin[1],
    attendu,
    'le chemin publié par ci.yml ne correspond plus au outputFolder du rapporteur html : '
      + 'ci.yml=' + chemin[1] + ', playwright.config.ts=' + attendu + '. '
      + 'Deux fichiers qui se désignent sans se vérifier, c’est exactement le trou que cet invariant ferme.',
  );
});

test('l’absence du rapport fait ROUGIR, au lieu de passer inaperçue', () => {
  assert.match(
    etapeRapportPlaywright(),
    /if-no-files-found:\s*error/,
    'l’étape playwright-report n’exige plus `if-no-files-found: error` : le défaut est `warn`, qui publie '
      + 'le vide sans rien dire. Une étape de diagnostic qui échoue en silence est pire que pas d’étape — '
      + 'on la croit là le jour où on en a besoin.',
  );
});

test('le workflow des baselines réécrit TOUT — le drapeau nu conserverait le périmé', () => {
  const baselines = fs.readFileSync(CHEMIN_BASELINES, 'utf8');
  const appels = [...baselines.matchAll(/^\s*run:.*--update-snapshots(=[a-z]+)?/gm)];
  assert.ok(appels.length > 0, 'visual-baselines.yml : plus aucun appel --update-snapshots.');

  // Assertion sur la VALEUR, pas sur la présence du drapeau. `--update-snapshots`
  // nu est accepté par Playwright et vaut `changed` : c'est exactement la forme
  // qui a conservé une baseline périmée le 2026-09-04. `missing` serait pire
  // encore (il ne réécrirait jamais rien d'existant).
  for (const appel of appels) {
    assert.equal(
      appel[1],
      '=all',
      "visual-baselines.yml doit passer --update-snapshots=all, valeur trouvée : "
        + (appel[1] ? appel[1].slice(1) : 'aucune (drapeau nu, donc « changed »)')
        + '. Sans =all, Playwright ne réécrit que ce qu’il juge différent au seuil du matcher : '
        + 'une baseline périmée sous ce seuil survit au workflow et repart dans l’artefact, '
        + 'où rien ne la distingue d’une image fraîche.',
    );
  }
});
