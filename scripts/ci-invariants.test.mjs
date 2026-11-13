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
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { preparerMiroirsApt } from './wn-playwright-apt.mjs';

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

// 5. `verify` EST UN AGRÉGATEUR, ET IL ÉCHOUE FERMÉ (2026-09-30, #1263). C'est
//    le seul check exigé par la protection de `main`. Un agrégateur à `needs:`
//    finit SKIPPED quand un job amont échoue — et un check requis sauté compte
//    comme réussi : un CI rouge passerait pour vert, pour `wn-attendre-ci`
//    comme pour Scalingo. Trois conditions tiennent ce contrat ; retirer l'une
//    d'elles laisserait les autres bancs verts.
test('verify agrège TOUS les jobs, tourne toujours et teste chaque résultat', () => {
  const debutJobs = SOURCE.indexOf('\njobs:\n');
  assert.ok(debutJobs >= 0, 'ci.yml : section `jobs:` introuvable.');
  const jobs = [...SOURCE.slice(debutJobs).matchAll(/^  ([a-z0-9_-]+):\s*$/gm)].map((m) => m[1]);
  assert.ok(jobs.includes('verify'), 'ci.yml : plus de job `verify` — la protection de `main` l’exige.');

  const debutVerify = SOURCE.indexOf('\n  verify:\n');
  const suite = SOURCE.slice(debutVerify + 1);
  const finVerify = suite.slice(1).search(/^  [a-z0-9_-]+:\s*$/m);
  const bloc = finVerify < 0 ? suite : suite.slice(0, finVerify + 1);

  const needs = /^\s{4}needs:\s*\[([^\]]*)\]/m.exec(bloc);
  assert.ok(needs, '`verify` doit déclarer `needs: [...]`.');
  const amont = needs[1].split(',').map((s) => s.trim()).filter(Boolean);
  const autres = jobs.filter((j) => j !== 'verify');
  assert.deepEqual([...amont].sort(), [...autres].sort(),
    `\`verify\` doit dépendre de TOUS les autres jobs (${autres.join(', ')}) ; trouvé : ${amont.join(', ')}. `
      + 'Un job hors de `needs` peut rougir sans que le check exigé le voie.');

  assert.match(bloc, /^\s{4}if:\s*always\(\)\s*$/m,
    '`verify` doit porter `if: always()` : sans lui, un amont rouge le rend SKIPPED, donc « réussi ».');
  for (const job of amont) {
    assert.match(bloc, new RegExp(`needs\\.${job}\\.result\\s*\\}\\}"?\\s*=\\s*"?success`),
      `\`verify\` doit tester explicitement \`needs.${job}.result\` = success.`);
  }
});

// 6. LE CACHE DE COMPILATION NEXT NE QUITTE PAS LE CI (2026-11-06, H91 temps 2).
//    `build.sh` efface `.next/cache/webpack` : sans cette ligne, l'image
//    Scalingo dépasse 2048 Mo et plus aucun déploiement ne passe (#1001). Le
//    job `e2e` la contourne par `WN_GARDER_CACHE_WEBPACK=1`, posée sur sa seule
//    étape Build, pour que `actions/cache` ait quelque chose à sauvegarder.
//    Deux dérives coûteraient en silence : la variable posée ailleurs (une
//    image qui ne se déploie plus), et une clé qui perd un de ses fichiers
//    (`hashFiles` d'un fichier absent rend une chaîne vide, sans erreur).

/** Bloc du job `e2e`, de son en-tête au job suivant. */
function blocE2e() {
  const debut = SOURCE.indexOf('\n  e2e:\n');
  assert.ok(debut >= 0, 'ci.yml : job `e2e` introuvable.');
  const suite = SOURCE.slice(debut + 1);
  const fin = suite.slice(1).search(/^  [a-z0-9_-]+:\s*$/m);
  return fin < 0 ? suite : suite.slice(0, fin + 1);
}

/** Étape d'un bloc de job désignée par son nom, jusqu'à l'étape suivante. */
function etape(bloc, nom) {
  const debut = bloc.indexOf(`- name: ${nom}\n`);
  assert.ok(debut >= 0, `ci.yml : étape « ${nom} » introuvable dans \`e2e\`.`);
  const suite = bloc.slice(debut);
  // Toute nouvelle entrée de liste ferme l'étape (`- name:`, `- uses:`,
  // `- id:`, `- *alias`) : sinon l'étape suivante serait lue comme la sienne.
  const fin = suite.slice(1).search(/^\s*- \S/m);
  return { debut, texte: fin < 0 ? suite : suite.slice(0, fin + 1) };
}

test('Playwright évite le miroir Azure dans les sources APT sans altérer leur signature', (t) => {
  const apt = fs.mkdtempSync(path.join(os.tmpdir(), 'wn-playwright-apt-'));
  t.after(() => fs.rmSync(apt, { recursive: true, force: true }));
  fs.mkdirSync(path.join(apt, 'sources.list.d'));
  fs.mkdirSync(path.join(apt, 'apt.conf.d'));
  const azure = 'http://azure.archive.ubuntu.com/ubuntu/';
  const officiel = 'https://archive.ubuntu.com/ubuntu/';
  const contenus = {
    'sources.list': `deb ${azure} noble main\n`,
    'apt-mirrors.txt': `${azure}\n`,
    'apt-mirrors-security.txt': 'https://azure.archive.ubuntu.com/ubuntu/\n',
    'sources.list.d/ubuntu.sources': `Types: deb\nURIs: ${azure}\nSuites: noble noble-security\nComponents: main universe\nSigned-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg\n`,
    'sources.list.d/microsoft.list': 'deb https://packages.microsoft.com/ubuntu/24.04/prod noble main\n',
  };
  for (const [nom, contenu] of Object.entries(contenus)) fs.writeFileSync(path.join(apt, nom), contenu);
  assert.equal(preparerMiroirsApt(apt), 4);
  for (const [nom, contenu] of Object.entries(contenus)) {
    assert.equal(fs.readFileSync(path.join(apt, nom), 'utf8'),
      contenu.replaceAll(azure, officiel).replaceAll('https://azure.archive.ubuntu.com/ubuntu/', officiel));
  }
  assert.equal(preparerMiroirsApt(apt), 0, 'un second passage ne réécrit pas les sources');
  const config = fs.readFileSync(path.join(apt, 'apt.conf.d/99-playwright-network'), 'utf8');
  assert.match(config, /Acquire::https::Timeout "15"/);
  assert.match(config, /APT::Update::Error-Mode "any"/, 'un index inaccessible doit échouer');
  assert.doesNotMatch(config, /AllowInsecure|AllowUnauthenticated|Verify-Peer/);
});

test('les deux workflows préparent APT avant une installation Playwright bornée', () => {
  for (const [workflow, nom] of [[blocE2e(), 'Install Playwright browsers'],
    [fs.readFileSync(CHEMIN_BASELINES, 'utf8'), 'Navigateurs Playwright']]) {
    const miroirs = etape(workflow, 'Préparer les miroirs Ubuntu pour Playwright');
    const installation = etape(workflow, nom);
    assert.ok(miroirs.debut < installation.debut);
    assert.match(miroirs.texte, /sudo env GITHUB_ACTIONS=true .*wn-playwright-apt\.mjs/);
    assert.match(installation.texte, /timeout-minutes: 10/);
    assert.match(installation.texte, /playwright install --with-deps chromium webkit/);
  }
});

test('le rapport est exigé après les tests, pas après une panne de provisioning', () => {
  const tests = etape(blocE2e(), 'E2E tests (Playwright, production build)');
  assert.match(tests.texte, /id: playwright/);
  const rapport = etape(blocE2e(), 'Upload Playwright report');
  assert.match(rapport.texte, /if: always\(\) && steps\.playwright\.outcome != '' && steps\.playwright\.outcome != 'skipped'/);
  assert.match(rapport.texte, /if-no-files-found: error/);
});

test('le cache Next précède le build d’`e2e`, saute en documentaire et a une clé complète', () => {
  const e2e = blocE2e();
  const cache = etape(e2e, 'Cache de compilation Next');
  const build = etape(e2e, 'Build');
  assert.ok(cache.debut < build.debut, 'le cache Next doit être restauré AVANT le build, qui le lit.');
  assert.match(cache.texte, /if:\s*steps\.scope\.outputs\.e2e == 'true'/,
    'le cache Next doit sauter quand le périmètre ne demande pas l’E2E, comme le cache Playwright.');
  assert.match(cache.texte, /uses:\s*actions\/cache@v4/);
  assert.match(cache.texte, /path:\s*web\/\.next\/cache\s*$/m);

  const cle = /^\s*key:\s*(.+)$/m.exec(cache.texte);
  assert.ok(cle, 'le cache Next n’a plus de `key:`.');
  assert.match(cle[1], /hashFiles\('web\/package-lock\.json', 'web\/next\.config\.[a-z]+'\)/,
    'la clé doit porter le lock et la configuration Next.');
  // Toute la ligne, pas `\S+` : la clé contient des espaces (`${{ runner.os }}`),
  // et un préfixe coupé au premier d'entre eux préfixerait n'importe quelle clé.
  const repli = /restore-keys:\s*\|\s*\n\s*(.+?)\s*$/m.exec(cache.texte);
  assert.ok(repli, 'la restauration partielle (`restore-keys`) a disparu.');
  assert.ok(cle[1].startsWith(repli[1]), `\`restore-keys\` (${repli[1]}) doit préfixer la clé (${cle[1]}).`);
  // Sans les sources dans la clé, la première entrée serait trouvée pour
  // toujours, jamais resauvegardée, et vieillirait à chaque commit.
  assert.match(cle[1].slice(repli[1].length), /hashFiles\('web\/src\/\*\*'/,
    'la clé du cache Next doit porter, après le préfixe, le hash des sources.');

  // Chaque fichier nommé dans la clé existe : `hashFiles` d'un fichier absent
  // rend une chaîne vide, et la clé perdrait sa dépendance sans rien dire.
  for (const m of cle[1].matchAll(/'(web\/[^'*]+)'/g)) {
    assert.ok(fs.existsSync(path.join(RACINE, m[1])), `clé du cache Next : ${m[1]} n’existe plus.`);
  }
});

/** Lignes d'un texte hors commentaires `#` de ligne entière. */
const horsCommentaires = (texte) => texte.split('\n').filter((l) => !/^\s*#/.test(l));

test('`WN_GARDER_CACHE_WEBPACK` n’est posée que par l’étape Build d’`e2e`', () => {
  // Par liste fermée sur tout le dépôt suivi, et non par fichiers connus : la
  // variable peut atteindre le build Scalingo par `web/package.json`, par le
  // corps de `build.sh`, ou par un fichier qui n'existe pas encore.
  const admis = new Set(['.github/workflows/ci.yml', 'web/scripts/build.sh', 'scripts/ci-invariants.test.mjs']);
  const fichiers = execFileSync('git', ['grep', '-l', 'WN_GARDER_CACHE_WEBPACK'], { cwd: RACINE, encoding: 'utf8' })
    .split('\n').filter(Boolean)
    .filter((f) => !f.startsWith('docs/') && !f.startsWith('changelog.d/'));
  assert.deepEqual(fichiers.filter((f) => !admis.has(f)), [],
    'WN_GARDER_CACHE_WEBPACK apparaît hors de ci.yml et de build.sh : posée sur le build Scalingo, '
      + 'elle ferait dépasser 2048 Mo à l’image (#1001).');

  const ci = horsCommentaires(SOURCE).filter((l) => l.includes('WN_GARDER_CACHE_WEBPACK'));
  assert.equal(ci.length, 1, `ci.yml cite la variable ${ci.length} fois hors commentaires : ${ci.join(' | ')}`);
  assert.match(etape(blocE2e(), 'Build').texte, /^\s*WN_GARDER_CACHE_WEBPACK:\s*'1'\s*$/m,
    'l’étape Build d’`e2e` ne pose plus WN_GARDER_CACHE_WEBPACK : le cache Next serait presque vide.');
});

test('`build.sh` efface le cache webpack par défaut', () => {
  const lignes = horsCommentaires(fs.readFileSync(path.join(RACINE, 'web/scripts/build.sh'), 'utf8'));
  const citations = lignes.filter((l) => l.includes('WN_GARDER_CACHE_WEBPACK'));
  assert.deepEqual(citations, ['if [ "${WN_GARDER_CACHE_WEBPACK:-}" = "1" ]; then'],
    'build.sh ne doit lire la variable que dans le test qui garde l’effacement : un `export` ailleurs '
      + 'la poserait sur le build Scalingo.');
  const build = lignes.join('\n');
  assert.match(build,
    /if \[ "\$\{WN_GARDER_CACHE_WEBPACK:-\}" = "1" \]; then\n[^\n]*\nelse\n\s*rm -rf \.next\/cache\/webpack\nfi/,
    'build.sh doit effacer `.next/cache/webpack` sauf si WN_GARDER_CACHE_WEBPACK vaut exactement 1 : '
      + 'sans cet effacement, l’image Scalingo dépasse 2048 Mo (#1001).');
  assert.equal((build.match(/rm -rf \.next\/cache\/webpack/g) || []).length, 1);
});

// 6. LE PÉRIMÈTRE DU DIFF SE JOUE, IL NE SE LIT PAS SEULEMENT. Le calcul est un
//    bloc bash en ligne : une expression régulière qui glisse range une PR du
//    mauvais côté sans que rien ne rougisse. Le 2026-11-13, 57 PR sur les 300
//    dernières avaient ainsi modifié une documentation que le code LIT
//    (décisions, propositions de textes patients, corpus) en jouant zéro test.
//    Le bloc est extrait de ci.yml et exécuté tel quel, dans un dépôt jetable,
//    sur des diffs fabriqués.

/** Le corps du bloc `run: |` de l'étape partagée `&perimetre`, sans sa marge. */
function scriptPerimetre() {
  const lignes = SOURCE.split('\n');
  const ancre = lignes.findIndex((l) => /^\s*- &perimetre\s*$/.test(l));
  assert.ok(ancre >= 0, 'ci.yml : ancre `&perimetre` introuvable.');
  const run = lignes.findIndex((l, k) => k > ancre && /^\s*run:\s*\|\s*$/.test(l));
  const indentation = /^\s*/.exec(lignes[run])[0].length;
  const corps = [];
  for (const l of lignes.slice(run + 1)) {
    if (l.trim() !== '' && /^\s*/.exec(l)[0].length <= indentation) break;
    corps.push(l);
  }
  const marge = Math.min(...corps.filter((l) => l.trim()).map((l) => /^\s*/.exec(l)[0].length));
  return corps.map((l) => l.slice(marge)).join('\n');
}

/** Sorties du périmètre pour un diff dont `fichiers` sont créés après la base. */
function perimetrePour(t, fichiers, { baseConnue = true } = {}) {
  const depot = fs.mkdtempSync(path.join(os.tmpdir(), 'wn-perimetre-'));
  t.after(() => fs.rmSync(depot, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', ['-c', 'user.email=ci@exemple.test', '-c', 'user.name=ci', ...args],
    { cwd: depot, encoding: 'utf8' }).trim();
  git('init', '-q');
  fs.writeFileSync(path.join(depot, 'LISEZMOI.txt'), 'base\n');
  git('add', '-A');
  git('commit', '-qm', 'base');
  const base = baseConnue ? git('rev-parse', 'HEAD') : '0'.repeat(40);
  for (const f of fichiers) {
    fs.mkdirSync(path.join(depot, path.dirname(f)), { recursive: true });
    fs.writeFileSync(path.join(depot, f), 'x\n');
  }
  git('add', '-A');
  git('commit', '-qm', 'diff');
  const script = scriptPerimetre()
    .replaceAll('${{ github.event_name }}', 'pull_request')
    .replaceAll('${{ github.event.pull_request.base.sha }}', base)
    .replaceAll('${{ github.event.before }}', base);
  assert.doesNotMatch(script, /\$\{\{/, 'le bloc du périmètre porte une expression que ce banc ne remplace pas.');
  const sortie = path.join(depot, 'sortie.txt');
  fs.writeFileSync(sortie, '');
  execFileSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', script],
    { cwd: depot, env: { ...process.env, GITHUB_OUTPUT: sortie }, encoding: 'utf8' });
  return Object.fromEntries(fs.readFileSync(sortie, 'utf8').split('\n').filter(Boolean).map((l) => l.split('=')));
}

test('le périmètre classe chaque diff du bon côté, et la documentation lue par le code joue les tests', (t) => {
  const cas = [
    [['web/src/lib/x.ts'], { docs_only: 'false', unitaires: 'true', e2e: 'true' }],
    [['web/package.json'], { docs_only: 'false', unitaires: 'true', e2e: 'true' }],
    [['.github/workflows/autre.yml'], { docs_only: 'false', unitaires: 'true', e2e: 'true' }],
    [['docs/claude/handoffs/x.md', 'changelog.d/x.md'], { docs_only: 'true', unitaires: 'false', e2e: 'false' }],
    [['docs/decisions/D-999.md'], { docs_only: 'true', unitaires: 'true', e2e: 'false' }],
    [['docs/claude/propositions/2026-01-01-x/README.md'], { docs_only: 'true', unitaires: 'true', e2e: 'false' }],
    [['docs/claude/corpus/source_registry.json'], { docs_only: 'true', unitaires: 'true', e2e: 'false' }],
    [['docs/claude/campagnes/c1/supports/carte.html'], { docs_only: 'true', unitaires: 'true', e2e: 'false' }],
    [['docs/claude/corpus/instrument_registry.json'], { docs_only: 'false', unitaires: 'true', e2e: 'true' }],
    [['tools/corpus/fiches/consignes/a.md'], { docs_only: 'false', unitaires: 'true', e2e: 'true' }],
    [['scripts/wn-outil.mjs', '.claude/hooks/garde.mjs', 'changelog.d/x.md'], { docs_only: 'false', unitaires: 'false', e2e: 'false' }],
    [['scripts/wn-outil.mjs', 'docs/decisions/D-999.md'], { docs_only: 'false', unitaires: 'true', e2e: 'false' }],
    [['scripts/wn-playwright-apt.mjs'], { docs_only: 'false', unitaires: 'true', e2e: 'true' }],
    [['scripts/wn-outil.mjs', 'web/src/a.ts'], { docs_only: 'false', unitaires: 'true', e2e: 'true' }],
  ];
  for (const [fichiers, attendu] of cas) {
    assert.deepEqual(perimetrePour(t, fichiers), attendu, fichiers.join(', '));
  }
  assert.deepEqual(perimetrePour(t, ['docs/x.md'], { baseConnue: false }),
    { docs_only: 'false', unitaires: 'true', e2e: 'true' }, 'base introuvable : tout est du code');
});

test('`typage-tests` suit la sortie `unitaires`, `e2e` la sortie `e2e`, et `controles` reste sur `docs_only`', () => {
  const bloc = (nom) => {
    const debut = SOURCE.indexOf(`\n  ${nom}:\n`);
    assert.ok(debut >= 0, `ci.yml : job \`${nom}\` introuvable.`);
    const suite = SOURCE.slice(debut + 1);
    const fin = suite.slice(1).search(/^  [a-z0-9_-]+:\s*$/m);
    return fin < 0 ? suite : suite.slice(0, fin + 1);
  };
  const conditions = (texte) => [...texte.matchAll(/steps\.scope\.outputs\.([a-z0-9_]+)/g)].map((m) => m[1]);
  const typage = conditions(bloc('typage-tests'));
  const e2e = conditions(bloc('e2e'));
  assert.ok(typage.length >= 8 && typage.every((c) => c === 'unitaires'), `typage-tests : ${typage.join(', ')}`);
  assert.ok(e2e.length >= 11 && e2e.every((c) => c === 'e2e'), `e2e : ${e2e.join(', ')}`);
  assert.ok(conditions(bloc('controles')).every((c) => c === 'docs_only'));
  // Un plafond par job : un run bloqué ne brûle plus six heures de runner.
  for (const nom of ['controles', 'typage-tests', 'e2e', 'verify']) {
    assert.match(bloc(nom), /^ {4}timeout-minutes: \d+$/m, `job \`${nom}\` sans timeout-minutes`);
  }
});
