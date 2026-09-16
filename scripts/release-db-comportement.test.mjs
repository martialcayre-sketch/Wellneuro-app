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
