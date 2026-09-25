// Banc de `scripts/wn-deploiement-observation.mjs` (D-248, lot 1).
//
// Les deux incidents du 2026-09-23 sont rejoués sur leurs VRAIES lignes de
// `scalingo deployments` : ce sont elles qui ont montré que la première ligne
// du tableau n'est pas forcément la version en service. L'ascendance y est
// injectée (historique linéaire) ; un dernier test joue le CLI de bout en bout
// avec le vrai `git` sur un dépôt jouet et un `scalingo` factice.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, chmodSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  analyserTableau,
  diagnostiquer,
  dureeEnSecondes,
  SORTIE_CONFORME,
  SORTIE_RECUL,
  SORTIE_ILLISIBLE,
} from './wn-deploiement-observation.mjs';

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, '..');
const SCRIPT = join(ICI, 'wn-deploiement-observation.mjs');

const ligne = (id, date, duree, ref, statut = 'success') =>
  `│ ${id} │ ${date} │ ${duree} │ scalingo-platform-scm │ ${ref} │ ${statut} │ 1.2 GiB │`;
const tableau = (...lignes) =>
  ['┌──┐', '│ ID │ DATE │ DURATION │ USER │ GIT REF │ STATUS │ IMAGE SIZE │', '├──┤', ...lignes, '└──┘'].join('\n');

// Historique linéaire de `main`, du plus ancien au plus récent.
const S_9BC3 = '9bc3f87c1cac02304c603a3d4b57f89b96c58dc1';
const S_B43A = 'b43a94a611f898ecbda5612c4c5e3a81cc2a8b5e';
const S_D963 = 'd963be29124b4b0395e8fcaf2af750c2e749377e';
const S_F091 = 'f091277a223e0b1d8e5dfa1f21959b86cc2c8cb2';
const HISTOIRE = [S_9BC3, S_B43A, S_D963, S_F091];
const estAncetre = (a, b) => {
  const ia = HISTOIRE.indexOf(a);
  const ib = HISTOIRE.indexOf(b);
  return ia !== -1 && ib !== -1 && ia <= ib;
};
const faits = (texte, { tete = S_D963, ageTeteMin = 10, seuilRetardMin = 45 } = {}) => ({
  deploiements: analyserTableau(texte),
  tete,
  ageTeteMin,
  seuilRetardMin,
  estAncetre,
});

// Incident 2, tel que la liste le montrait après 18:07 le 2026-09-23 : b43a94a6
// (plus ancien dans main) a démarré APRÈS d963be29 et fini après lui.
const INCIDENT_2 = tableau(
  ligne('dbbb2de7', '2026/09/23 17:58:39', '8m58s', S_B43A),
  ligne('7f5053fe', '2026/09/23 17:56:56', '9m0s', S_D963),
  ligne('693ac155', '2026/09/23 16:16:51', '5m54s', S_9BC3),
);

test('durées Scalingo', () => {
  assert.equal(dureeEnSecondes('5m5s'), 305);
  assert.equal(dureeEnSecondes('1h2m3s'), 3723);
  assert.equal(dureeEnSecondes('45s'), 45);
  assert.equal(dureeEnSecondes('9m0s'), 540);
  assert.equal(dureeEnSecondes(''), null);
  assert.equal(dureeEnSecondes('bientôt'), null);
});

test('seules les lignes success comptent', () => {
  const t = tableau(
    ligne('a', '2026/09/24 13:07:09', '5m5s', S_F091, 'build-error'),
    ligne('b', '2026/09/24 13:00:18', '6m12s', S_D963),
  );
  assert.deepEqual(analyserTableau(t).map((d) => d.sha), [S_D963]);
});

test('une ligne success mal datée rend le tableau illisible, au lieu d’être ignorée', () => {
  assert.throws(() => analyserTableau(tableau(ligne('a', 'hier', '5m5s', S_D963))), /illisible/);
});

test('incident 2 : l’ancien commit fini en dernier est un RECUL', () => {
  const v = diagnostiquer(faits(INCIDENT_2));
  assert.equal(v.code, SORTIE_RECUL);
  assert.equal(v.enService.sha, S_B43A);
  assert.equal(v.depasse.sha, S_D963);
});

// Le cas qui justifie le tri par FIN : la première ligne (début le plus
// récent) a fini AVANT l'autre. Lire la première ligne conclurait à tort.
test('la version en service est celle qui FINIT en dernier, pas la première ligne', () => {
  const t = tableau(
    ligne('court', '2026/09/23 18:01:00', '4m0s', S_B43A), // fin 18:05:00
    ligne('long', '2026/09/23 18:00:00', '9m0s', S_D963), // fin 18:09:00
  );
  const v = diagnostiquer(faits(t));
  assert.equal(v.code, SORTIE_CONFORME);
  assert.equal(v.etat, 'a-jour');
  assert.equal(v.enService.sha, S_D963);
});

// Incident 1 : de290fd7 auto-déployé une minute après la tête — même forme,
// deux déploiements séquentiels, l'ancien en dernier.
test('incident 1 : un vieux commit redéployé après la tête est un RECUL', () => {
  const t = tableau(
    ligne('vieux', '2026/09/23 05:04:00', '5m0s', S_B43A),
    ligne('tete', '2026/09/23 05:03:00', '5m0s', S_D963),
  );
  assert.equal(diagnostiquer(faits(t)).code, SORTIE_RECUL);
});

test('après réparation (tête redéployée), le recul passé ne rougit plus', () => {
  const t = tableau(
    ligne('repare', '2026/09/23 21:11:38', '6m12s', S_D963),
    ligne('dbbb2de7', '2026/09/23 17:58:39', '8m58s', S_B43A),
    ligne('7f5053fe', '2026/09/23 17:56:56', '9m0s', S_D963),
  );
  assert.equal(diagnostiquer(faits(t)).etat, 'a-jour');
});

test('juste après un merge, la tête non déployée est un déploiement EN COURS, pas un recul', () => {
  const t = tableau(ligne('a', '2026/09/23 17:56:56', '9m0s', S_D963));
  const v = diagnostiquer(faits(t, { tete: S_F091, ageTeteMin: 10 }));
  assert.equal(v.code, SORTIE_CONFORME);
  assert.equal(v.etat, 'en-cours');
});

test('au-delà du seuil, la tête non déployée est un RETARD — averti, jamais rouge', () => {
  const t = tableau(ligne('a', '2026/09/23 17:56:56', '9m0s', S_D963));
  const v = diagnostiquer(faits(t, { tete: S_F091, ageTeteMin: 120 }));
  assert.equal(v.code, SORTIE_CONFORME);
  assert.equal(v.etat, 'retard');
});

// Revue #1219 : filtrer la ligne main AVANT d'élire la version en service
// faisait juger `main` pendant qu'une autre branche tournait — vert à tort.
test('un déploiement hors de la ligne main EN SERVICE rend la production illisible', () => {
  const t = tableau(
    ligne('branche', '2026/09/23 19:00:00', '5m0s', 'a'.repeat(40)),
    ligne('main', '2026/09/23 18:00:00', '5m0s', S_D963),
  );
  assert.equal(diagnostiquer(faits(t)).code, SORTIE_ILLISIBLE);
});

test('un déploiement hors de la ligne main PASSÉ ne gêne pas le verdict', () => {
  const t = tableau(
    ligne('main', '2026/09/23 19:00:00', '5m0s', S_D963),
    ligne('branche', '2026/09/23 18:00:00', '5m0s', 'a'.repeat(40)),
  );
  assert.equal(diagnostiquer(faits(t)).etat, 'a-jour');
});

// Revue #1220 : une branche DIVERGENTE bâtie sur la tête la contient. Qu'elle
// ait été en service puis remplacée par `main` retire des commits HORS de
// `main` — ce n'est pas un recul de `main`.
test('une branche divergente passée, remplacée par main, n’est pas un recul', () => {
  const DIVERGENT = 'e'.repeat(40);
  const t = tableau(
    ligne('main', '2026/09/23 19:00:00', '5m0s', S_D963),
    ligne('branche', '2026/09/23 18:00:00', '5m0s', DIVERGENT),
  );
  const v = diagnostiquer({
    ...faits(t),
    estAncetre: (a, b) => (b === DIVERGENT ? a === DIVERGENT || estAncetre(a, S_D963) : estAncetre(a, b)),
  });
  assert.equal(v.etat, 'a-jour');
});

test('une ligne success à la ref tronquée est illisible, pas ignorée', () => {
  assert.throws(() => analyserTableau(tableau(ligne('a', '2026/09/23 19:00:00', '5m0s', 'd963be29'))), /illisible/);
});

test('une date hors plage est refusée, pas normalisée par Date.UTC', () => {
  assert.throws(() => analyserTableau(tableau(ligne('a', '2026/02/31 25:00:00', '5m0s', S_D963))), /illisible/);
});

test('aucun déploiement de la ligne main : illisible, jamais conforme', () => {
  const v = diagnostiquer(faits(tableau(ligne('x', '2026/09/23 19:00:00', '5m0s', 'b'.repeat(40)))));
  assert.equal(v.code, SORTIE_ILLISIBLE);
});

// ── De bout en bout : vrai `git`, `scalingo` factice ─────────────────────────

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

function jouer({ scalingoSort, scalingoCode = 0 }) {
  const base = mkdtempSync(join(tmpdir(), 'wn-deploiement-'));
  try {
    const amont = join(base, 'amont');
    mkdirSync(amont);
    git(amont, 'init', '--quiet', '--initial-branch=main');
    const shas = ['un', 'deux'].map((nom) => {
      writeFileSync(join(amont, nom), `${nom}\n`);
      git(amont, 'add', '-A');
      git(amont, 'commit', '--quiet', '-m', nom);
      return git(amont, 'rev-parse', 'HEAD');
    });
    git(base, 'clone', '--quiet', amont, 'local');
    const bin = join(base, 'bin');
    mkdirSync(bin);
    writeFileSync(join(base, 'sortie.txt'), scalingoSort(shas));
    writeFileSync(join(bin, 'scalingo'), `#!/bin/sh\ncat "${join(base, 'sortie.txt')}"\nexit ${scalingoCode}\n`);
    chmodSync(join(bin, 'scalingo'), 0o755);
    const resume = join(base, 'resume.md');
    const r = spawnSync('node', [SCRIPT], {
      cwd: join(base, 'local'),
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, GITHUB_STEP_SUMMARY: resume, GIT_CONFIG_GLOBAL: '/dev/null' },
      encoding: 'utf8',
    });
    let md = '';
    try {
      md = readFileSync(resume, 'utf8');
    } catch {}
    return { code: r.status, sortie: r.stdout + r.stderr, md };
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
}

test('CLI : recul réel détecté sur le vrai git, résumé écrit', () => {
  const r = jouer({
    scalingoSort: ([un, deux]) =>
      tableau(ligne('a', '2026/09/23 18:00:00', '9m0s', un), ligne('b', '2026/09/23 18:01:00', '4m0s', deux)),
  });
  assert.equal(r.code, SORTIE_RECUL, r.sortie);
  assert.match(r.sortie, /::error title=Recul de production::/);
  assert.match(r.md, /Recul de production/);
});

test('CLI : tête en service → 0', () => {
  const r = jouer({ scalingoSort: ([, deux]) => tableau(ligne('b', '2026/09/23 18:01:00', '4m0s', deux)) });
  assert.equal(r.code, SORTIE_CONFORME, r.sortie);
});

test('CLI : scalingo en échec → illisible (2), pas recul (1)', () => {
  const r = jouer({ scalingoSort: () => 'unauthorized', scalingoCode: 1 });
  assert.equal(r.code, SORTIE_ILLISIBLE, r.sortie);
  assert.match(r.md, /illisible/);
});

// ── Invariants du workflow ───────────────────────────────────────────────────

// Commentaires retirés : ils NOMMENT ce qui est interdit (`pull_request`,
// `manual-deploy`) — c'est le code qu'on juge.
const WORKFLOW = readFileSync(join(RACINE, '.github/workflows/deploiement-production.yml'), 'utf8')
  .split('\n')
  .filter((l) => !/^\s*#/.test(l))
  .join('\n');

// Depuis le lot 2, le pouvoir de déployer existe — mais dans le SEUL script
// du déployeur, sur la seule branche `main` (invariants complets :
// wn-deploiement-deployer.test.mjs). Le workflow, lui, reste sans commande
// Scalingo d'écriture en ligne.
test('workflow : aucune commande d’écriture Scalingo en ligne', () => {
  assert.doesNotMatch(
    WORKFLOW,
    /manual-deploy|scalingo deploy|\brun\s+--detached|one-off|rollback|env-set|env-unset|integration-link-update|restart|scale\b/,
  );
});

test('workflow : jeton confiné à main et à l’environnement dédié', () => {
  assert.match(WORKFLOW, /^\s+if: github\.ref == 'refs\/heads\/main' &&/m);
  assert.match(WORKFLOW, /^\s+environment: deploy-production\s*$/m);
  assert.doesNotMatch(WORKFLOW, /pull_request/, 'aucun déclencheur ouvert au code d’une branche');
  assert.doesNotMatch(WORKFLOW, /:\s*write\b|write-all/, 'aucune permission d’écriture GitHub');
});

test('workflow : il joue bien ce script', () => {
  assert.match(WORKFLOW, /node scripts\/wn-deploiement-observation\.mjs/);
});
