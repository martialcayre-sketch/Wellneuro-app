// Comportement RÉEL des scripts de release Scalingo — joués en bash, avec un
// `npx` factice sur le PATH : aucun réseau, aucune base. Ces scripts sont le
// chemin d'écriture du schéma de production ; leurs sentinelles sont un
// PROTOCOLE lu par le workflow (release-db-invariants.test.mjs verrouille le
// côté workflow, ce banc-ci verrouille le côté conteneur) : chaque point de
// sortie doit émettre la bonne sentinelle, liée au run, et la porte du
// postdeploy doit couper `migrate deploy` quand le drapeau est posé.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const WEB = join(RACINE, 'web');

// URLs FACTICES (hôtes en .invalid, RFC 2606) — jamais une vraie connexion.
const URL_ADDON = 'postgres://app:motdepassefactice@addon-scalingo.example.invalid:5432/base?sslmode=prefer';
const URL_MIGRATE = 'postgres://app:autrefactice@supabase.example.invalid:5432/base';

// L'empreinte attendue est calculée par LA MÊME expression shell que le
// script sous test (même binaire, même cwd) : le banc vérifie que le script
// compare bien, pas qu'une réplique JavaScript imite bien le shell.
const EMPREINTE = execSync(
  "find prisma/migrations -type f | LC_ALL=C sort | xargs sha256sum | sha256sum | cut -d' ' -f1",
  { cwd: WEB, encoding: 'utf8' },
).trim();

/**
 * Joue un script de `web/scripts/` avec un `npx` factice qui consigne ses
 * appels et sort selon le scénario. `env` part d'un environnement MINIMAL
 * (PATH + HOME), pas de process.env : un test ne doit pas dépendre des
 * variables de la machine qui le joue.
 */
function jouer(script, { env = {}, scenario = {} } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'wn-release-'));
  const { prefixEchec = '', deployEchec = false, statusEchec = false } = scenario;
  writeFileSync(
    join(dir, 'npx'),
    `#!/usr/bin/env bash
echo "npx $*" >> "${dir}/appels.log"
case "$*" in
  *"db execute"*"${prefixEchec || '__jamais__'}"*) exit 1 ;;
  *"migrate deploy"*) exit ${deployEchec ? 1 : 0} ;;
  *"migrate status"*) exit ${statusEchec ? 1 : 0} ;;
esac
exit 0
`,
  );
  chmodSync(join(dir, 'npx'), 0o755);
  const r = spawnSync('bash', [join(WEB, 'scripts', script)], {
    cwd: WEB,
    env: { PATH: `${dir}:${process.env.PATH}`, HOME: process.env.HOME, ...env },
    encoding: 'utf8',
  });
  const appels = existsSync(join(dir, 'appels.log'))
    ? readFileSync(join(dir, 'appels.log'), 'utf8').trim().split('\n')
    : [];
  return { code: r.status, sortie: `${r.stdout}\n${r.stderr}`, appels };
}

// ——— release-db-scalingo.sh : chaque point de sortie a sa sentinelle ———

test('sans URL d’add-on : échec avant tout appel, sentinelle liée au run', () => {
  const r = jouer('release-db-scalingo.sh', { env: { WN_RELEASE_ID: 'run-1' } });
  assert.equal(r.code, 1);
  assert.match(r.sortie, /WN_RELEASE_DB_ECHEC id=run-1 etape=url_addon_absente/);
  assert.equal(r.appels.length, 0, 'aucun appel prisma ne doit partir sans URL');
});

test('sans empreinte des migrations approuvées : échec avant tout appel', () => {
  const r = jouer('release-db-scalingo.sh', {
    env: { WN_RELEASE_ID: 'run-2', SCALINGO_POSTGRESQL_URL: URL_ADDON },
  });
  assert.equal(r.code, 1);
  assert.match(r.sortie, /WN_RELEASE_DB_ECHEC id=run-2 etape=empreinte_absente/);
  assert.equal(r.appels.length, 0);
});

test('empreinte différente de l’image : refus — des migrations non approuvées partiraient', () => {
  const r = jouer('release-db-scalingo.sh', {
    env: {
      WN_RELEASE_ID: 'run-3',
      SCALINGO_POSTGRESQL_URL: URL_ADDON,
      WN_MIGRATIONS_EMPREINTE: 'deadbeef',
    },
  });
  assert.equal(r.code, 1);
  assert.match(r.sortie, /WN_RELEASE_DB_ECHEC id=run-3 etape=empreinte_migrations/);
  assert.equal(r.appels.length, 0);
});

// LE test de l'incident du 2026-08-22 : MIGRATE_DATABASE_URL posée dans le
// conteneur ne doit plus JAMAIS redevenir la cible — c'est l'add-on qui fait
// foi, et l'hôte migré est nommé dans les logs, sans identifiants.
test('MIGRATE_DATABASE_URL posée : ignorée, l’add-on fait foi et l’hôte est nommé', () => {
  const r = jouer('release-db-scalingo.sh', {
    env: {
      WN_RELEASE_ID: 'run-4',
      SCALINGO_POSTGRESQL_URL: URL_ADDON,
      MIGRATE_DATABASE_URL: URL_MIGRATE,
      WN_MIGRATIONS_EMPREINTE: EMPREINTE,
    },
  });
  assert.equal(r.code, 0);
  assert.match(r.sortie, /WN_RELEASE_DB_OK id=run-4/);
  assert.match(r.sortie, /addon-scalingo\.example\.invalid:5432/, "l'hôte cible doit être nommé");
  assert.doesNotMatch(r.sortie, /supabase\.example\.invalid/, "l'hôte de MIGRATE_DATABASE_URL ne doit jamais être la cible");
  assert.doesNotMatch(r.sortie, /motdepassefactice/, 'aucun identifiant ne doit fuiter dans les logs');
  assert.equal(r.appels.filter((a) => a.includes('db execute')).length, 4, 'les quatre préflights doivent tourner');
  assert.equal(r.appels.at(-1), 'npx prisma migrate deploy', 'migrate deploy vient en dernier');
});

test('préflight en échec : sentinelle nommant l’étape, migrate deploy jamais appelé', () => {
  const r = jouer('release-db-scalingo.sh', {
    env: { WN_RELEASE_ID: 'run-5', SCALINGO_POSTGRESQL_URL: URL_ADDON, WN_MIGRATIONS_EMPREINTE: EMPREINTE },
    scenario: { prefixEchec: 'c5_ciqual' },
  });
  assert.equal(r.code, 1);
  assert.match(r.sortie, /WN_RELEASE_DB_ECHEC id=run-5 etape=preflight_c5/);
  assert.ok(!r.appels.some((a) => a.includes('migrate deploy')), 'un préflight rouge doit couper la release');
});

test('migrate deploy en échec : sentinelle d’échec, jamais de OK', () => {
  const r = jouer('release-db-scalingo.sh', {
    env: { WN_RELEASE_ID: 'run-6', SCALINGO_POSTGRESQL_URL: URL_ADDON, WN_MIGRATIONS_EMPREINTE: EMPREINTE },
    scenario: { deployEchec: true },
  });
  assert.equal(r.code, 1);
  assert.match(r.sortie, /WN_RELEASE_DB_ECHEC id=run-6 etape=migrate_deploy/);
  assert.doesNotMatch(r.sortie, /WN_RELEASE_DB_OK/);
});

// ——— release-db-statut.sh : la contre-épreuve fait foi par code de sortie ———

test('statut : base à jour → WN_STATUT_DB_OK lié au run', () => {
  const r = jouer('release-db-statut.sh', { env: { WN_RELEASE_ID: 'run-7' } });
  assert.equal(r.code, 0);
  assert.match(r.sortie, /WN_STATUT_DB_OK id=run-7/);
});

test('statut : migrations en attente → WN_STATUT_DB_ECHEC et sortie non nulle', () => {
  const r = jouer('release-db-statut.sh', {
    env: { WN_RELEASE_ID: 'run-8' },
    scenario: { statusEchec: true },
  });
  assert.equal(r.code, 1);
  assert.match(r.sortie, /WN_STATUT_DB_ECHEC id=run-8/);
  assert.doesNotMatch(r.sortie, /WN_STATUT_DB_OK/);
});

// ——— db-deploy.sh : la porte de gouvernance (D-087) ———

test('drapeau posé : le postdeploy sort sans toucher à la base', () => {
  const r = jouer('db-deploy.sh', { env: { WN_MIGRATIONS_PAR_RELEASE_DB: '1' } });
  assert.equal(r.code, 0);
  assert.equal(r.appels.length, 0, 'aucun appel prisma sous le drapeau');
  assert.match(r.sortie, /release-db/, 'la sortie doit dire OÙ passent désormais les migrations');
});

// « true », « 0 », vide : tout sauf « 1 » laisse l'auto-migration — le drapeau
// est un interrupteur exact, pas une vague vérité.
test('drapeau absent ou différent de 1 : le postdeploy migre comme avant', () => {
  for (const valeur of [undefined, 'true', '0']) {
    const env = { SCALINGO_POSTGRESQL_URL: URL_ADDON };
    if (valeur !== undefined) env.WN_MIGRATIONS_PAR_RELEASE_DB = valeur;
    const r = jouer('db-deploy.sh', { env });
    assert.equal(r.code, 0, `valeur ${valeur} : le postdeploy doit migrer`);
    assert.ok(
      r.appels.some((a) => a.includes('migrate deploy')),
      `valeur ${valeur} : migrate deploy doit être appelé`,
    );
  }
});

// L'asymétrie relevée en revue : le postdeploy (staging) préférait encore la
// variable de l'incident. Depuis D-087, plus aucun script ne la lit.
test('MIGRATE_DATABASE_URL seule : le postdeploy refuse plutôt que de la suivre', () => {
  const r = jouer('db-deploy.sh', { env: { MIGRATE_DATABASE_URL: URL_MIGRATE } });
  assert.equal(r.code, 1);
  assert.ok(!r.appels.some((a) => a.includes('migrate deploy')), 'aucune migration vers cette cible');
});
