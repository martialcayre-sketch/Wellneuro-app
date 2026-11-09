// Banc du lecteur de la revue Copilot (D-468) — sans réseau : le noyau et la
// collecte reçoivent des lectures simulées, aux gabarits constatés sur #1795 à
// #1941 (revues et refus de `copilot-pull-request-reviewer[bot]`).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AUTEUR_COPILOT,
  SORTIE_ILLISIBLE,
  SORTIE_NON,
  SORTIE_OUI,
  SORTIE_USAGE,
  analyserArguments,
  debutDuMois,
  estRefus,
  estRefusQuota,
  jugerQuota,
  jugerTete,
  lire,
} from './wn-revue-copilot.mjs';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const lireFichier = (chemin) => readFileSync(join(RACINE, chemin), 'utf8');
const TETE = 'a'.repeat(40);
const ANCIENNE = 'c'.repeat(40);
const DEPOT = 'proprietaire/depot';
const REFUS_QUOTA =
  'Copilot was unable to review this pull request because the user who requested the review has insufficient remaining quota. Try requesting a review at a lower effort level.';
const REFUS_AUTRE = 'Copilot was unable to review this pull request because of an internal error.';
const REVUE = '<!-- ccr-overview-v2 -->\n\n### 🟡 Changes recommended\n\nUne remarque.';

const revue = (corps, commit, quand = '2026-11-03T09:14:00Z', auteur = AUTEUR_COPILOT) => ({
  user: { login: auteur },
  body: corps,
  commit_id: commit,
  submitted_at: quand,
});

test('un refus se reconnaît à son début, le quota à son motif', () => {
  assert.equal(estRefus(revue(REFUS_QUOTA, TETE)), true);
  assert.equal(estRefusQuota(revue(REFUS_QUOTA, TETE)), true);
  assert.equal(estRefus(revue(REFUS_AUTRE, TETE)), true);
  assert.equal(estRefusQuota(revue(REFUS_AUTRE, TETE)), false);
  assert.equal(estRefus(revue(REVUE, TETE)), false);
  assert.equal(estRefus({ user: { login: AUTEUR_COPILOT }, body: null }), false);
});

test('le mois commence le 1er à minuit UTC', () => {
  assert.equal(debutDuMois('2026-11-09T03:00:00Z').toISOString(), '2026-11-01T00:00:00.000Z');
  assert.equal(debutDuMois('2026-12-01T00:00:00Z').toISOString(), '2026-12-01T00:00:00.000Z');
  assert.throws(() => debutDuMois('pas une date'));
});

test('jugerTete : seule une vraie revue sur la tête vaut preuve', () => {
  assert.equal(jugerTete([revue(REVUE, TETE)], TETE).code, SORTIE_OUI);
  // Un refus et une vraie revue sur la même tête : la revue compte.
  assert.equal(jugerTete([revue(REFUS_QUOTA, TETE), revue(REVUE, TETE)], TETE).code, SORTIE_OUI);
  const quota = jugerTete([revue(REFUS_QUOTA, TETE)], TETE);
  assert.equal(quota.code, SORTIE_NON);
  assert.match(quota.motif, /quota/);
  assert.equal(jugerTete([revue(REFUS_AUTRE, TETE)], TETE).code, SORTIE_NON);
  const ancienne = jugerTete([revue(REVUE, ANCIENNE)], TETE);
  assert.equal(ancienne.code, SORTIE_NON);
  assert.match(ancienne.motif, /précédente/);
  assert.equal(jugerTete([], TETE).code, SORTIE_NON);
  // Une revue d'un autre auteur, même sur la tête, n'est pas celle de Copilot.
  assert.equal(jugerTete([revue(REVUE, TETE, undefined, 'coderabbitai[bot]')], TETE).code, SORTIE_NON);
});

test('jugerQuota : un refus pour quota du mois rend le quota épuisé, un refus plus ancien non', () => {
  const depuis = debutDuMois('2026-11-09T00:00:00Z');
  assert.equal(jugerQuota([{ pr: 1, revues: [revue(REFUS_QUOTA, TETE, '2026-10-31T23:59:59Z')] }], depuis), null);
  assert.equal(jugerQuota([{ pr: 2, revues: [revue(REFUS_AUTRE, TETE, '2026-11-02T10:00:00Z')] }], depuis), null);
  const r = jugerQuota(
    [
      { pr: 3, revues: [revue(REFUS_QUOTA, TETE, '2026-11-03T10:00:00Z')] },
      { pr: 4, revues: [revue(REFUS_QUOTA, TETE, '2026-11-08T22:42:00Z')] },
    ],
    depuis,
  );
  assert.equal(r.pr, 4);
  assert.equal(r.quand, '2026-11-08T22:42:00Z');
});

const simuler = (table) => (chemin) => {
  if (chemin === 'repos/{owner}/{repo}') return { full_name: DEPOT };
  if (!(chemin in table)) throw new Error(`chemin inattendu : ${chemin}`);
  const v = table[chemin];
  if (v instanceof Error) throw v;
  return v;
};
const LISTE = (page) => `repos/${DEPOT}/pulls?state=all&sort=updated&direction=desc&per_page=100&page=${page}`;
const REVUES = (n) => `repos/${DEPOT}/pulls/${n}/reviews?per_page=100`;

test('lire --quota : présumé disponible sans refus du mois, arrêt au premier PR plus ancien', () => {
  const lu = [];
  const table = {
    [LISTE(1)]: [
      { number: 12, updated_at: '2026-11-08T22:00:00Z' },
      { number: 11, updated_at: '2026-10-30T10:00:00Z' },
      { number: 10, updated_at: '2026-10-29T10:00:00Z' },
    ],
    [REVUES(12)]: [[revue(REVUE, TETE, '2026-11-08T22:10:00Z')]],
  };
  const lireJson = (chemin, p) => { lu.push(chemin); return simuler(table)(chemin, p); };
  const { code, lignes } = lire({ mode: 'quota', lireJson, maintenant: '2026-11-09T03:00:00Z' });
  assert.equal(code, SORTIE_OUI);
  assert.match(lignes.at(-1), /^COPILOT quota code=0 depuis=2026-11-01$/);
  assert.equal(lu.includes(REVUES(11)), false, 'la PR mise à jour avant le 1er n’est pas lue');
});

test('lire --quota : un refus pour quota du mois rend 1, et la lecture s’arrête au premier', () => {
  const lu = [];
  const table = {
    [LISTE(1)]: [
      { number: 13, updated_at: '2026-11-08T23:00:00Z' },
      { number: 12, updated_at: '2026-11-08T22:00:00Z' },
      { number: 11, updated_at: '2026-11-05T10:00:00Z' },
    ],
    [REVUES(13)]: [[revue(REVUE, TETE, '2026-11-08T23:05:00Z')]],
    [REVUES(12)]: [[revue(REFUS_QUOTA, TETE, '2026-11-08T22:42:00Z')]],
  };
  const lireJson = (chemin, p) => { lu.push(chemin); return simuler(table)(chemin, p); };
  const { code, lignes } = lire({ mode: 'quota', lireJson, maintenant: '2026-11-09T03:00:00Z' });
  assert.equal(code, SORTIE_NON);
  assert.match(lignes.at(-1), /refus=#12/);
  assert.equal(lu.includes(REVUES(11)), false, 'aucune PR n’est lue après le premier refus');
});

test('lire <N> : la tête est lue sur la PR, la preuve sur ses revues', () => {
  const table = {
    [`repos/${DEPOT}/pulls/7`]: { head: { sha: TETE } },
    [REVUES(7)]: [[revue(REFUS_QUOTA, ANCIENNE), revue(REVUE, TETE)]],
  };
  const { code, lignes } = lire({ mode: 'tete', pr: 7, lireJson: simuler(table) });
  assert.equal(code, SORTIE_OUI);
  assert.equal(lignes.at(-1), `REVUE copilot code=0 pr=7 tete=${TETE}`);
});

test('lecture impossible : jamais un 0', () => {
  const panne = { [`repos/${DEPOT}/pulls/7`]: new Error('HTTP 502') };
  assert.equal(lire({ mode: 'tete', pr: 7, lireJson: simuler(panne) }).code, SORTIE_ILLISIBLE);
  const teteIllisible = { [`repos/${DEPOT}/pulls/7`]: { head: {} } };
  assert.equal(lire({ mode: 'tete', pr: 7, lireJson: simuler(teteIllisible) }).code, SORTIE_ILLISIBLE);
  const listeIllisible = { [LISTE(1)]: { message: 'Not Found' } };
  assert.equal(lire({ mode: 'quota', lireJson: simuler(listeIllisible), maintenant: '2026-11-09T03:00:00Z' }).code, SORTIE_ILLISIBLE);
  const dateIllisible = { [LISTE(1)]: [{ number: 1, updated_at: 'hier' }] };
  assert.equal(lire({ mode: 'quota', lireJson: simuler(dateIllisible), maintenant: '2026-11-09T03:00:00Z' }).code, SORTIE_ILLISIBLE);
});

test('arguments : --quota ou un numéro, rien d’autre', () => {
  assert.deepEqual(analyserArguments(['--quota']), { mode: 'quota' });
  assert.deepEqual(analyserArguments(['42']), { mode: 'tete', pr: 42 });
  for (const a of [[], ['0'], ['-1'], ['42', '--quota'], ['x']]) assert.ok(analyserArguments(a).erreur, JSON.stringify(a));
  const r = spawnSync(process.execPath, [join(RACINE, 'scripts/wn-revue-copilot.mjs')], { encoding: 'utf8' });
  assert.equal(r.status, SORTIE_USAGE);
});

test('câblage : wn-merge, la règle 1.6 et D-468 nomment le lecteur', () => {
  assert.match(lireFichier('.claude/skills/wn-merge/SKILL.md'), /wn-revue-copilot\.mjs/);
  assert.match(lireFichier('.claude/rules/pr-revue-et-release-db.md'), /wn-revue-copilot\.mjs/);
  assert.match(lireFichier('docs/decisions/D-468.md'), /wn-revue-copilot\.mjs/);
});
