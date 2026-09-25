// Banc de COMPORTEMENT du workflow `release-db` — les étapes sont EXÉCUTÉES.
//
// POURQUOI IL EXISTE, EN PLUS DES INVARIANTS. `release-db-invariants.test.mjs`
// lit du TEXTE : il vérifie que telle ligne est là, que tel refus existe. C'est
// nécessaire et insuffisant, et on l'a mesuré. Le report du SHA attendu vers
// l'étape suivante passe par `$GITHUB_ENV` ; un banc textuel constate la présence
// de l'écriture, mais pas qu'elle survienne APRÈS le repointage. Déplacée d'une
// ligne, elle écrit le commit approuvé et perd la tête — le défaut d'origine, à
// l'identique, et les invariants restaient verts (constaté le 2026-09-13). Jouer
// l'étape le voit immédiatement, parce que c'est le fichier réel qu'on relit.
//
// CE QUI EST FACTICE, ET CE QUI NE L'EST PAS. `scalingo` est un script jetable :
// on ne parle à aucune API, et rien de ce banc ne peut toucher la production.
// `git` est le VRAI, sur un dépôt jouet construit ici — c'est ce qui permet
// d'éprouver `rev-parse origin/main`, `merge-base --is-ancestor` et le diff des
// dossiers de migrations. `$GITHUB_ENV` est un vrai fichier : c'est le canal même
// dont dépend le correctif.
//
// AUCUN RÉSEAU, AUCUN SHA CODÉ EN DUR, AUCUN PARSEUR YAML. Le dépôt jouet est
// créé et cloné localement (le clone donne un `origin` à `git fetch`), et les
// étapes sont extraites du YAML par le texte — même raison que les invariants :
// aucun parseur n'est résolvable depuis la racine du dépôt.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, chmodSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = readFileSync(join(RACINE, '.github/workflows/release-db.yml'), 'utf8');

/**
 * Le script `run:` d'une étape, dédenté — extrait par le texte.
 *
 * L'étape est trouvée par le DÉBUT de son nom : les noms complets portent des
 * apostrophes typographiques et des tirets cadratins, et les recopier ici ferait
 * de ce banc un piège à ponctuation.
 */
function scriptDeLEtape(debutDuNom) {
  const lignes = SOURCE.split('\n');
  const iNom = lignes.findIndex((l) => /^\s+- name:/.test(l) && l.includes(debutDuNom));
  assert.notEqual(iNom, -1, `étape introuvable : « ${debutDuNom} »`);
  // BORNÉ À L'ÉTAPE, et ce n'est pas de la coquetterie : sans borne, une étape
  // dont le `run:` passerait sur une seule ligne (délégation à un script, refactor
  // parfaitement plausible) faisait attraper le `run: |` de l'étape SUIVANTE, en
  // silence. Le banc jouait alors la garde d'attente et ses `sleep 30` × 40 —
  // vingt minutes de mur par test, sans une ligne de sortie, dans `npm run check`.
  const iFin = lignes.findIndex((l, i) => i > iNom && /^\s+- name:/.test(l));
  const borne = iFin === -1 ? lignes.length : iFin;
  const iRun = lignes.findIndex(
    (l, i) => i > iNom && i < borne && /^\s+run:\s*\|\s*$/.test(l),
  );
  assert.notEqual(
    iRun,
    -1,
    `l'étape « ${debutDuNom} » n'a pas de bloc \`run: |\` — un \`run:\` d'une seule ligne demande d'adapter ce banc, pas de le laisser lire l'étape suivante`,
  );
  const indentRun = lignes[iRun].match(/^(\s*)/)[1].length;

  const corps = [];
  for (const ligne of lignes.slice(iRun + 1)) {
    if (ligne.trim() === '') {
      corps.push('');
      continue;
    }
    const indent = ligne.match(/^(\s*)/)[1].length;
    if (indent <= indentRun) break;
    corps.push(ligne);
  }
  // Dédentation sur la ligne la moins indentée du corps : le script doit être
  // valide seul, et un `bash` sur du texte sur-indenté marche, mais les
  // heredocs n'y survivent pas.
  const minIndent = Math.min(
    ...corps.filter((l) => l !== '').map((l) => l.match(/^(\s*)/)[1].length),
  );
  return `${corps.map((l) => (l === '' ? '' : l.slice(minIndent))).join('\n')}\n`;
}

/** Un `git` sans identité héritée ni hooks du dépôt réel. */
function git(cwd, ...args) {
  return execFileSync('git', args, {
    cwd,
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'Banc',
      GIT_AUTHOR_EMAIL: 'banc@example.invalid',
      GIT_COMMITTER_NAME: 'Banc',
      GIT_COMMITTER_EMAIL: 'banc@example.invalid',
      GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_CONFIG_SYSTEM: '/dev/null',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  }).toString().trim();
}

/**
 * Un dépôt jouet : deux commits sur `main`, et un clone qui en fait un `origin`.
 *
 * `migrations` dit si le SECOND commit touche `web/prisma/migrations/` — c'est la
 * distinction sur laquelle le workflow arbitre : une tête qui a dépassé le commit
 * approuvé SANS migration nouvelle se déploie, avec migration nouvelle se refuse.
 */
function depotJouet({ migrations }) {
  const base = mkdtempSync(join(tmpdir(), 'wn-release-db-'));
  const amont = join(base, 'amont');
  const local = join(base, 'local');
  mkdirSync(amont);
  git(amont, 'init', '--quiet', '--initial-branch=main');
  mkdirSync(join(amont, 'web/prisma/migrations/20260101000000_socle'), { recursive: true });
  writeFileSync(join(amont, 'web/prisma/migrations/20260101000000_socle/migration.sql'), '-- socle\n');
  git(amont, 'add', '-A');
  git(amont, 'commit', '--quiet', '-m', 'socle');
  const approuve = git(amont, 'rev-parse', 'HEAD');

  if (migrations) {
    mkdirSync(join(amont, 'web/prisma/migrations/20260202000000_neuve'), { recursive: true });
    writeFileSync(join(amont, 'web/prisma/migrations/20260202000000_neuve/migration.sql'), '-- neuve\n');
  } else {
    writeFileSync(join(amont, 'LISEZMOI.md'), 'un push documentaire\n');
  }
  git(amont, 'add', '-A');
  git(amont, 'commit', '--quiet', '-m', migrations ? 'migration neuve' : 'doc seule');
  const tete = git(amont, 'rev-parse', 'HEAD');

  git(base, 'clone', '--quiet', amont, local);
  return { base, local, approuve, tete };
}

/** Un `scalingo` jetable. `deployments` rend le texte donné ; le reste réussit. */
function poserScalingo(base, sortieDeployments) {
  const bin = join(base, 'bin');
  mkdirSync(bin, { recursive: true });
  writeFileSync(join(bin, 'scalingo'), `#!/bin/sh
for arg in "$@"; do
  case "$arg" in
    deployments) printf '%s\\n' '${sortieDeployments.replace(/'/g, "'\\''")}' ; exit 0 ;;
    integration-link-manual-deploy) echo "(jouet) build déclenché" ; exit 0 ;;
  esac
done
exit 0
`);
  chmodSync(join(bin, 'scalingo'), 0o755);
  return bin;
}

/** Joue un script d'étape sous `bash -e` — le shell réel d'une étape GitHub. */
function jouer(script, { cwd, bin, env }) {
  const fichier = join(cwd, '..', 'etape.sh');
  writeFileSync(fichier, script);
  const fichierEnv = join(cwd, '..', 'github-env.txt');
  writeFileSync(fichierEnv, '');
  const envSansGitHub = Object.fromEntries(
    Object.entries(process.env).filter(([cle]) => !cle.startsWith('GITHUB_')),
  );
  let code = 0;
  let sortie = '';
  try {
    sortie = execFileSync('bash', ['-e', fichier], {
      cwd,
      // BORNE DURE, en plus de la borne d'extraction ci-dessus. Les étapes de ce
      // workflow portent des boucles d'attente de vingt minutes : si l'une est
      // jouée par accident, elle doit mourir ici et non geler `npm run check` puis
      // le CI — qui ne porte aucun `timeout-minutes`, donc six heures par défaut.
      // `--test-timeout` de node ne suffit pas : le corps est SYNCHRONE.
      timeout: 60_000,
      env: {
        ...envSansGitHub,
        PATH: `${bin}:${process.env.PATH}`,
        GITHUB_ENV: fichierEnv,
        SCALINGO_APP: 'app-jouet',
        SCALINGO_REGION: 'region-jouet',
        ...env,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    }).toString();
  } catch (erreur) {
    // Une étape TUÉE par la borne dure n'a pas de code : sans ce refus, un
    // `notEqual(r.code, 0)` lirait un délai comme un refus (revue D-248).
    if (erreur.status === null || erreur.signal) {
      throw new Error(`étape tuée (${erreur.signal ?? 'délai'}) — ce n'est pas un refus :\n${erreur.stdout}${erreur.stderr}`);
    }
    code = erreur.status;
    sortie = String(erreur.stdout) + String(erreur.stderr);
  }
  return { code, sortie, ecrit: readFileSync(fichierEnv, 'utf8').trim() };
}

// ── LE DÉFAUT DU 2026-09-13, ET SON CORRECTIF ───────────────────────────────

test('la tête acceptée est REPORTÉE, et le report porte la tête — pas le commit approuvé', () => {
  const { base, local, approuve, tete } = depotJouet({ migrations: false });
  try {
    const bin = poserScalingo(base, 'aucun déploiement connu');
    const r = jouer(scriptDeLEtape('Déclenchement du déploiement'), {
      cwd: local,
      bin,
      env: { GITHUB_SHA: approuve },
    });
    assert.equal(r.code, 0, `l'étape a échoué :\n${r.sortie}`);
    // LE CŒUR DU BANC. Un report posé avant le repointage écrirait `approuve` —
    // syntaxiquement irréprochable, et c'est le défaut d'origine.
    assert.equal(
      r.ecrit,
      `WN_SHA_ATTENDU=${tete}`,
      'le SHA reporté doit être la TÊTE déployée, pas le commit approuvé qu’elle a dépassé',
    );
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('une tête apportant des migrations NON approuvées arrête le déclenchement', () => {
  const { base, local, approuve } = depotJouet({ migrations: true });
  try {
    const bin = poserScalingo(base, 'aucun déploiement connu');
    const r = jouer(scriptDeLEtape('Déclenchement du déploiement'), {
      cwd: local,
      bin,
      env: { GITHUB_SHA: approuve },
    });
    assert.notEqual(r.code, 0, 'du SQL non approuvé ne doit jamais partir');
    assert.match(r.sortie, /migrations nouvelles/);
    // Et RIEN n'est reporté : l'étape a échoué avant.
    assert.equal(r.ecrit, '', 'une étape qui refuse ne doit rien reporter');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('un déploiement déjà existant reporte le commit approuvé, et sort sans déclencher', () => {
  const { base, local, approuve } = depotJouet({ migrations: false });
  try {
    // La liste des déploiements CONTIENT le commit approuvé : rien à déclencher.
    const bin = poserScalingo(base, `${approuve} success`);
    const r = jouer(scriptDeLEtape('Déclenchement du déploiement'), {
      cwd: local,
      bin,
      env: { GITHUB_SHA: approuve },
    });
    assert.equal(r.code, 0, `l'étape a échoué :\n${r.sortie}`);
    // Sur ce chemin on n'a RIEN déployé : l'image reste celle du dernier build
    // réussi, et attendre la tête attendrait un déploiement que personne n'a
    // déclenché. Le SHA attendu est donc bien le commit approuvé.
    assert.equal(r.ecrit, `WN_SHA_ATTENDU=${approuve}`);
    assert.doesNotMatch(r.sortie, /build déclenché/, 'un build déjà présent ne doit pas être doublé');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('un commit ANCIEN déployé par-dessus la tête : le dispatch sur main redéclenche — le recul du 2026-09-23', () => {
  // L'état exact du 2026-09-23 : la tête a été déployée, puis un commit plus
  // ancien l'a été APRÈS elle (liste du plus récent au plus ancien). Le dispatch
  // porte la tête. L'ancienne étape trouvait la tête « quelque part » dans la
  // liste, ne déclenchait rien, et la garde suivante refusait sur le recul :
  // boucle (run 35854104186). Seul le déploiement le PLUS RÉCENT dispense de
  // déclencher.
  const { base, local, approuve, tete } = depotJouet({ migrations: false });
  try {
    const bin = poserScalingo(base, `${approuve} success\n${tete} success`);
    const r = jouer(scriptDeLEtape('Déclenchement du déploiement'), {
      cwd: local,
      bin,
      env: { GITHUB_SHA: tete },
    });
    assert.equal(r.code, 0, `l'étape a échoué :\n${r.sortie}`);
    assert.match(r.sortie, /build déclenché/, 'une tête qui n’est plus le dernier déploiement doit être redéployée');
    assert.equal(r.ecrit, `WN_SHA_ATTENDU=${tete}`);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

// ── LA GARDE ANTI-RECUL : UN RUN DÉPASSÉ NE CONCLUT JAMAIS AU VERT ──────────

test('garde anti-recul : un run dont la tête a dépassé le commit échoue, après avoir dit que la release est faite', () => {
  // Le vert de CE run lèverait le dernier check du vieux commit, et Scalingo
  // l'auto-déploierait par-dessus la tête — le recul du 2026-09-23.
  const { base, local, approuve, tete } = depotJouet({ migrations: false });
  try {
    const bin = poserScalingo(base, `${tete} success`);
    const r = jouer(scriptDeLEtape('Garde anti-recul'), {
      cwd: local,
      bin,
      env: { GITHUB_SHA: approuve, WN_SHA_ATTENDU: tete },
    });
    assert.notEqual(r.code, 0, 'un run dépassé conclu au vert ferait reculer la production');
    assert.match(r.sortie, /Échec VOLONTAIRE/);
    // Le lecteur doit apprendre que la base est À JOUR — sans quoi il relance.
    assert.match(r.sortie, /NE PAS RELANCER/);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('garde anti-recul : un run qui porte la tête de main conclut au vert', () => {
  const { base, local, tete } = depotJouet({ migrations: false });
  try {
    const bin = poserScalingo(base, `${tete} success`);
    for (const env of [{ GITHUB_SHA: tete, WN_SHA_ATTENDU: tete }, { GITHUB_SHA: tete }]) {
      const r = jouer(scriptDeLEtape('Garde anti-recul'), { cwd: local, bin, env });
      assert.equal(r.code, 0, `la garde devait passer :\n${r.sortie}`);
    }
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('garde anti-recul : la tête a bougé PENDANT le run — rouge même si ce run a déployé son propre commit', () => {
  // Le run a déployé et migré SON commit (report = commit du run), mais la tête
  // est arrivée entre-temps : déployée par son propre CI avant la fin de ce run,
  // elle serait écrasée par le vieux commit dès que ce run conclurait au vert.
  const { base, local, approuve } = depotJouet({ migrations: false });
  try {
    const bin = poserScalingo(base, `${approuve} success`);
    const r = jouer(scriptDeLEtape('Garde anti-recul'), {
      cwd: local,
      bin,
      env: { GITHUB_SHA: approuve, WN_SHA_ATTENDU: approuve },
    });
    assert.notEqual(r.code, 0, 'le critère est la tête de main à la fin du run, pas le SHA déployé');
    assert.match(r.sortie, /Échec VOLONTAIRE/);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('garde anti-recul : tête de main illisible — rouge par prudence, et la release est dite faite', () => {
  const { base, local, tete } = depotJouet({ migrations: false });
  try {
    // Plus d'`origin` : `git fetch origin main` échoue, comme une panne réseau.
    git(local, 'remote', 'remove', 'origin');
    const bin = poserScalingo(base, `${tete} success`);
    const r = jouer(scriptDeLEtape('Garde anti-recul'), {
      cwd: local,
      bin,
      env: { GITHUB_SHA: tete, WN_SHA_ATTENDU: tete },
    });
    assert.notEqual(r.code, 0, 'sans tête lisible, un recul ne peut pas être exclu');
    assert.match(r.sortie, /illisible/);
    assert.match(r.sortie, /NE PAS RELANCER/);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

// ── LA GARDE QUI LIT LE REPORT ──────────────────────────────────────────────

test('la garde juge le SHA ATTENDU quand il est reporté', () => {
  const { base, local, approuve, tete } = depotJouet({ migrations: false });
  try {
    const bin = poserScalingo(base, `${tete} success`);
    const r = jouer(scriptDeLEtape('Garde — le commit attendu'), {
      cwd: local,
      bin,
      env: { GITHUB_SHA: approuve, WN_SHA_ATTENDU: tete },
    });
    assert.equal(r.code, 0, `la garde devait passer :\n${r.sortie}`);
    assert.match(r.sortie, new RegExp(tete));
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('la garde refuse quand un déploiement PLUS RÉCENT existe — liste multi-lignes', () => {
  // CE CAS EXISTE PARCE QUE LE `scalingo` JOUET NE RENDAIT JAMAIS PLUS D'UNE LIGNE,
  // et deux mutations en profitaient (revue du 2026-09-13) : remplacer `head -1` par
  // `tail -1` — la garde élit alors le PLUS ANCIEN succès et annonce « est le dernier
  // déploiement réussi » alors que l'image tourne sur du code non approuvé —, et
  // relâcher la comparaison d'égalité en simple appartenance. Les deux laissaient
  // 8/8 verts, et les invariants textuels ne les voient pas non plus. C'est la
  // propriété centrale de D-087 : l'image doit être CELLE qui a été approuvée.
  //
  // La sortie réelle du CLI va du PLUS RÉCENT au plus ancien (constaté le
  // 2026-08-22) : la tête d'abord, le commit approuvé ensuite.
  const { base, local, approuve, tete } = depotJouet({ migrations: false });
  try {
    const bin = poserScalingo(base, `${tete} success\n${approuve} success`);
    const r = jouer(scriptDeLEtape('Garde — le commit attendu'), {
      cwd: local,
      bin,
      // On attend le commit APPROUVÉ, et il est bien déployé — mais dépassé.
      env: { GITHUB_SHA: approuve, WN_SHA_ATTENDU: approuve },
    });
    assert.notEqual(r.code, 0, 'une image plus récente que l’approbation ne doit pas être migrée');
    assert.match(r.sortie, /déploiement PLUS RÉCENT existe/);
    assert.match(r.sortie, new RegExp(tete), 'le refus doit NOMMER le déploiement qui dépasse');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('SANS report, la garde retombe sur le commit approuvé — et refuse : le défaut d’origine', () => {
  const { base, local, approuve, tete } = depotJouet({ migrations: false });
  try {
    const bin = poserScalingo(base, `${tete} success`);
    const r = jouer(scriptDeLEtape('Garde — le commit attendu'), {
      cwd: local,
      bin,
      // Pas de `WN_SHA_ATTENDU` : c'est l'état d'avant le correctif.
      env: { GITHUB_SHA: approuve },
    });
    assert.notEqual(r.code, 0);
    // « SAUTÉ » : le dernier déploiement réussi CONTIENT le commit approuvé, qui
    // ne sera donc jamais déployé pour lui-même. Vingt minutes d'attente évitées,
    // mais surtout : un refus après un déclenchement.
    assert.match(r.sortie, /SAUTÉ/);
    // LE REPLI EST STRICT, et ce cas le prouve : sans report, la garde exige le
    // commit que l'humain a vu — jamais plus permissive.
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

// ── LA GARDE DU DRAPEAU : TROIS ISSUES, DONT UNE QUI NE TRANCHE PAS ─────────

/** Un `scalingo` dont `env-get` rend une valeur, ou échoue. */
function poserScalingoDrapeau(base, { valeur, echoue }) {
  const bin = join(base, 'bin');
  mkdirSync(bin, { recursive: true });
  writeFileSync(join(bin, 'scalingo'), echoue
    ? `#!/bin/sh\necho "An error occurred: indiscernable" >&2\nexit 1\n`
    : `#!/bin/sh\nprintf '%s\\n' '${valeur}'\nexit 0\n`);
  chmodSync(join(bin, 'scalingo'), 0o755);
  return bin;
}

test('drapeau lu et égal à 1 : la garde passe', () => {
  const { base, local } = depotJouet({ migrations: false });
  try {
    const r = jouer(scriptDeLEtape('Garde — le postdeploy'), {
      cwd: local,
      bin: poserScalingoDrapeau(base, { valeur: '1' }),
      env: {},
    });
    assert.equal(r.code, 0, r.sortie);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('drapeau lu et DIFFÉRENT de 1 : le refus peut affirmer « ≠ 1 », et il le fait', () => {
  const { base, local } = depotJouet({ migrations: false });
  try {
    const r = jouer(scriptDeLEtape('Garde — le postdeploy'), {
      cwd: local,
      bin: poserScalingoDrapeau(base, { valeur: '0' }),
      env: {},
    });
    assert.notEqual(r.code, 0);
    assert.match(r.sortie, /≠ 1 sur l'app/);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('drapeau NON LU : le refus ne tranche pas entre retrait et panne — [[D-112]]', () => {
  const { base, local } = depotJouet({ migrations: false });
  try {
    const r = jouer(scriptDeLEtape('Garde — le postdeploy'), {
      cwd: local,
      bin: poserScalingoDrapeau(base, { echoue: true }),
      env: {},
    });
    assert.notEqual(r.code, 0);
    // D-112 : `env-get` rend la même erreur pour une variable ABSENTE et pour un
    // incident d'API. Une garde doit distinguer les deux OU dire qu'elle ne le
    // peut pas. Ce refus nomme les deux hypothèses...
    assert.match(r.sortie, /RETIRÉ de l'app/);
    assert.match(r.sortie, /API Scalingo n'a pas répondu/);
    // ...et n'affirme SURTOUT PAS « ≠ 1 », ce qu'il n'est pas en état de savoir.
    assert.doesNotMatch(r.sortie, /≠ 1 sur l'app/);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

// ── CALME AVANT DÉCLENCHEMENT (D-248, prérequis du lot 3) ───────────────────
//
// Le job `deploiement` de deploiement-production.yml déclenche lui aussi
// `integration-link-manual-deploy main`. Deux déclenchements rapprochés font
// deux builds en parallèle, et le dernier à FINIR passe en service (incident 2
// du 2026-09-23). L'étape attend donc qu'aucun build ne soit en vol.
//
// Ces bancs jouent le VRAI tableau de `scalingo deployments` (colonnes
// séparées par `│`), avec un `scalingo` à sorties SUCCESSIVES et un `sleep`
// factice posé dans le PATH : la boucle d'attente tourne pour de bon, sans
// ajouter de couture de test au chemin d'écriture.

const ligneDeploiement = (id, sha, statut) =>
  `│ ${id} │ 2026/09/25 12:00:00 │ 5m0s │ wellneuro │ ${sha} │ ${statut} │ 1.2 GiB │`;
const tableauDeploiements = (...lignes) =>
  ['┌──┐', '│ ID │ DATE │ DURATION │ USER │ GIT REF │ STATUS │ IMAGE SIZE │', '├──┤', ...lignes, '└──┘'].join('\n');

/**
 * `scalingo` à sorties successives pour `deployments` (la dernière se répète ;
 * `null` = le CLI échoue), qui journalise chaque déclenchement ; et un `sleep`
 * qui rend la main aussitôt en comptant ses appels.
 */
function poserScalingoSequence(base, sorties) {
  const bin = join(base, 'bin');
  mkdirSync(bin, { recursive: true });
  sorties.forEach((s, i) => writeFileSync(join(base, `sortie-${i}.txt`), s ?? ''));
  const n = sorties.length;
  const echecs = sorties
    .map((s, i) => (s === null ? i : -1))
    .filter((i) => i >= 0)
    .join(' ');
  writeFileSync(
    join(bin, 'scalingo'),
    `#!/bin/bash
for arg in "$@"; do
  case "$arg" in
    deployments)
      c=$(cat "${base}/compteur" 2>/dev/null || echo 0)
      echo $((c + 1)) > "${base}/compteur"
      i=$c; [ "$i" -ge ${n} ] && i=${n - 1}
      for e in ${echecs}; do [ "$i" = "$e" ] && { echo "An error occurred: 401 Unauthorized (jouet)" >&2; exit 1; }; done
      cat "${base}/sortie-$i.txt"; exit 0 ;;
    integration-link-manual-deploy) cat "${base}/compteur" 2>/dev/null >> "${base}/declenchements" || echo 0 >> "${base}/declenchements"; echo "(jouet) build déclenché"; exit 0 ;;
  esac
done
exit 0
`,
  );
  writeFileSync(join(bin, 'sleep'), `#!/bin/sh\necho "$1" >> "${base}/sommes"\nexit 0\n`);
  chmodSync(join(bin, 'scalingo'), 0o755);
  chmodSync(join(bin, 'sleep'), 0o755);
  return bin;
}
const compter = (base, fichier) => {
  try {
    return readFileSync(join(base, fichier), 'utf8').trim().split('\n').filter(Boolean).length;
  } catch {
    return 0;
  }
};

test('D-248 — un build en vol : l’étape ATTEND qu’il finisse, puis déclenche', () => {
  const { base, local, approuve } = depotJouet({ migrations: false });
  try {
    const autre = 'f'.repeat(40);
    const bin = poserScalingoSequence(base, [
      tableauDeploiements(ligneDeploiement('dep-x', autre, 'building'), ligneDeploiement('dep-a', autre, 'success')),
      tableauDeploiements(ligneDeploiement('dep-x', autre, 'pushing'), ligneDeploiement('dep-a', autre, 'success')),
      tableauDeploiements(ligneDeploiement('dep-x', autre, 'success'), ligneDeploiement('dep-a', autre, 'success')),
    ]);
    const r = jouer(scriptDeLEtape('Déclenchement du déploiement'), { cwd: local, bin, env: { GITHUB_SHA: approuve } });
    assert.equal(r.code, 0, r.sortie);
    assert.equal(compter(base, 'sommes'), 2, 'deux attentes : building puis pushing');
    assert.equal(compter(base, 'declenchements'), 1, 'un seul déclenchement');
    // Le journal des déclenchements note combien de lectures avaient eu lieu :
    // la troisième est la première lecture CALME.
    assert.equal(readFileSync(join(base, 'declenchements'), 'utf8').trim(), '3', 'le déclenchement suit la lecture calme');
    assert.match(r.sortie, /build en vol \(1\/40\) : dep-x building/);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('D-248 — un build qui reste en vol : refus après la borne, AUCUN déclenchement, rien reporté', () => {
  const { base, local, approuve } = depotJouet({ migrations: false });
  try {
    const bin = poserScalingoSequence(base, [tableauDeploiements(ligneDeploiement('dep-x', 'f'.repeat(40), 'starting'))]);
    const r = jouer(scriptDeLEtape('Déclenchement du déploiement'), { cwd: local, bin, env: { GITHUB_SHA: approuve } });
    assert.notEqual(r.code, 0);
    assert.match(r.sortie, /Aucune écriture/);
    assert.equal(compter(base, 'declenchements'), 0);
    assert.equal(compter(base, 'sommes'), 40, 'la borne est de 40 attentes');
    // La borne est de 20 MINUTES : 40 attentes de 30 s, pas 40 de n'importe quoi.
    const durees = readFileSync(join(base, 'sommes'), 'utf8').trim().split('\n');
    assert.ok(durees.every((d) => d === '30'), `attentes de 30 s attendues, lu : ${[...new Set(durees)].join(', ')}`);
    assert.equal(r.ecrit, '');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('D-248 — une liste ILLISIBLE n’est pas une liste calme', () => {
  const { base, local, approuve } = depotJouet({ migrations: false });
  try {
    const bin = poserScalingoSequence(base, [null]);
    const r = jouer(scriptDeLEtape('Déclenchement du déploiement'), { cwd: local, bin, env: { GITHUB_SHA: approuve } });
    // Un REFUS franc (code 1), pas une étape tuée par le délai — `jouer` lève
    // désormais sur ce dernier cas.
    assert.equal(r.code, 1, 'un CLI en échec ne doit pas faire déclencher à l’aveugle');
    assert.match(r.sortie, /reste illisible/);
    assert.equal(compter(base, 'sommes'), 40);
    assert.equal(compter(base, 'declenchements'), 0);
    assert.equal(r.ecrit, '');
    // La CAUSE est dite : l'erreur du CLI n'est plus jetée (revue D-248).
    assert.match(r.sortie, /401 Unauthorized \(jouet\)/);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('D-248 — une panne de lecture passagère se réessaie, puis la release suit son cours', () => {
  const { base, local, approuve } = depotJouet({ migrations: false });
  try {
    const bin = poserScalingoSequence(base, [null, tableauDeploiements(ligneDeploiement('dep-a', 'f'.repeat(40), 'success'))]);
    const r = jouer(scriptDeLEtape('Déclenchement du déploiement'), { cwd: local, bin, env: { GITHUB_SHA: approuve } });
    assert.equal(r.code, 0, r.sortie);
    assert.equal(compter(base, 'declenchements'), 1);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('D-248 — statuts terminaux (success, *-error, aborted) : calme ; statut inconnu : en vol', () => {
  const { base, local, approuve } = depotJouet({ migrations: false });
  try {
    const f = 'f'.repeat(40);
    const calme = tableauDeploiements(
      ligneDeploiement('d1', f, 'success'),
      ligneDeploiement('d2', f, 'build-error'),
      ligneDeploiement('d3', f, 'crashed-error'),
      ligneDeploiement('d4', f, 'aborted'),
    );
    const bin = poserScalingoSequence(base, [
      tableauDeploiements(ligneDeploiement('d0', f, 'queued')),
      tableauDeploiements(ligneDeploiement('d0', f, 'bizarre')),
      calme,
    ]);
    const r = jouer(scriptDeLEtape('Déclenchement du déploiement'), { cwd: local, bin, env: { GITHUB_SHA: approuve } });
    assert.equal(r.code, 0, r.sortie);
    assert.equal(compter(base, 'sommes'), 2, '`queued` et le statut inconnu ont été attendus, les terminaux non');
    assert.equal(compter(base, 'declenchements'), 1);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

// Revue D-248 : un build de CE commit terminé en ÉCHEC ne dispense pas de
// déclencher. S'abstenir faisait attendre à la garde suivante, 20 minutes, un
// succès que personne ne relançait.
test('D-248 — un build du commit approuvé en ÉCHEC se redéclenche ; un build RÉUSSI dispense', () => {
  for (const [statut, attendu] of [
    ['build-error', 1],
    ['crashed-error', 1],
    ['aborted', 1],
    ['success', 0],
  ]) {
    const { base, local, approuve } = depotJouet({ migrations: false });
    try {
      const bin = poserScalingoSequence(base, [
        tableauDeploiements(ligneDeploiement('dep-m', approuve, statut), ligneDeploiement('dep-p', 'f'.repeat(40), 'success')),
      ]);
      const r = jouer(scriptDeLEtape('Déclenchement du déploiement'), { cwd: local, bin, env: { GITHUB_SHA: approuve } });
      assert.equal(r.code, 0, `${statut} :\n${r.sortie}`);
      assert.equal(compter(base, 'declenchements'), attendu, `${statut} : déclenchements`);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  }
});

// Revue D-248 : les deux workflows qui déclenchent un déploiement doivent
// appliquer la MÊME règle « en vol ». Un statut compté en vol d'un côté et
// calme de l'autre rouvrirait la fenêtre des deux builds parallèles. L'awk de
// l'étape est extrait du YAML et joué sur le format réel, puis comparé à
// `enVol` du déployeur.
test('D-248 — parité de la règle « en vol » entre release-db et le déployeur', async () => {
  const { enVol } = await import('./wn-deploiement-deployer.mjs');
  const programme = SOURCE.match(/awk -F'│' '([^']*print id " " s[^']*)'/)?.[1];
  assert.ok(programme, 'le programme awk de l’attente du calme est introuvable');
  const f = 'f'.repeat(40);
  const statuts = ['queued', 'building', 'pushing', 'starting', 'success', 'build-error', 'crashed-error', 'timeout-error', 'hook-error', 'aborted', 'bizarre'];
  const texte = tableauDeploiements(
    ...statuts.map((st, i) => ligneDeploiement(`d${i}`, f, st)),
    // Un build en cours au format réel : durée et taille VIDES.
    `│ d-vide │ 2026/09/25 12:00:00 │          │ wellneuro │ ${f} │ building │            │`,
  );
  const cotéReleaseDb = execFileSync('awk', ['-F', '│', programme], { input: `${texte}\n` })
    .toString()
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => l.split(' ')[0])
    .sort();
  const cotéDeployeur = enVol(texte).map((l) => l.id).sort();
  assert.deepEqual(cotéReleaseDb, cotéDeployeur);
  assert.deepEqual(cotéDeployeur, ['d-vide', 'd0', 'd1', 'd10', 'd2', 'd3']);
});
