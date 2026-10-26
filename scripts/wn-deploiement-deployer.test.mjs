// Banc de `scripts/wn-deploiement-deployer.mjs` (D-248, lot 2).
//
// Le noyau `deployer()` est joué avec des dépendances factices : une tête de
// `main` scriptée, une suite de tableaux `scalingo deployments`, un
// déclenchement qui s'enregistre, une ascendance linéaire. Aucun réseau,
// aucun `sleep` réel. Puis la garde finale, et les invariants du workflow et
// des deux scripts : ce sont eux qui bornent un jeton plein détenu SANS
// approbation.
//
// Les cas marqués « revue » viennent de la revue adverse du lot 2 : chacun
// rougit si le défaut qu'elle a confirmé revient. Les cas « D-374 §1 »
// rejouent la retenue de la tête tant qu'une migration de sa ligne n'est pas
// attestée appliquée — le trou que D-248 décrivait et gardait.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  deployer,
  gardeFinale,
  classerCi,
  classerRunReleaseDb,
  CHEMINS_RELEASE_DB,
  ETAPES_ATTESTATION,
  ETAPE_DECLENCHEMENT,
  AUTO_DEPLOIEMENT_ACTIF,
  ESSAIS_DEFAUT,
  INTERVALLE_MS_DEFAUT,
  SORTIE_OK,
  SORTIE_ECHEC,
} from './wn-deploiement-deployer.mjs';

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, '..');

// Historique linéaire de `main` : A < A2 < B < C.
const A = 'a'.repeat(40);
const A2 = 'd'.repeat(40);
const B = 'b'.repeat(40);
const C = 'c'.repeat(40);
const HISTOIRE = [A, A2, B, C];
const estAncetre = (x, y) => {
  const ix = HISTOIRE.indexOf(x);
  const iy = HISTOIRE.indexOf(y);
  return ix !== -1 && iy !== -1 && ix <= iy;
};

const ligne = (id, date, duree, ref, statut = 'success') =>
  `│ ${id} │ ${date} │ ${duree} │ scalingo-platform-scm │ ${ref} │ ${statut} │ 1.2 GiB │`;
const tableau = (...lignes) =>
  ['│ ID │ DATE │ DURATION │ USER │ GIT REF │ STATUS │ IMAGE SIZE │', ...lignes].join('\n');

const EN_SERVICE_A = ligne('dep-a', '2026/09/25 10:00:00', '5m0s', A);

/**
 * Un monde factice. `tetes` : valeurs successives de la tête (la dernière se
 * répète). `lectures` : tableaux successifs (idem). Une entrée `Error` fait
 * échouer cette lecture-là. `trace` garde l'ordre des lectures et de
 * l'écriture.
 */
function monde({ tetes, lectures, declencherLeve = null }) {
  const appels = { declencher: 0, dormir: 0, trace: [] };
  let iT = 0;
  let iL = 0;
  return {
    appels,
    deps: {
      lireTete: () => {
        const t = tetes[Math.min(iT++, tetes.length - 1)];
        if (t instanceof Error) throw t;
        return t;
      },
      lireDeploiements: () => {
        const l = lectures[Math.min(iL++, lectures.length - 1)];
        appels.trace.push(`lecture ${iL}`);
        if (l instanceof Error) throw l;
        return l;
      },
      declencher: () => {
        appels.declencher += 1;
        appels.trace.push('ECRITURE');
        if (declencherLeve) throw declencherLeve;
      },
      estAncetre,
      dormir: async () => {
        appels.dormir += 1;
      },
      essais: 5,
      intervalleMs: 1,
      lireRunsReleaseDb: () => [],
      lireEtapesReleaseDb: () => [],
      dernierCommitReleaseDb: () => null,
      lireCi: () => 'success',
    },
  };
}

/** Un run release-db tel que l'API le rend au noyau. */
const run = (head_sha, status, conclusion = null, id = 1) => ({ id, head_sha, status, conclusion });
const [ONE_OFF, VERIFICATION] = ETAPES_ATTESTATION;
/** Les étapes du job `release` d'un run rouge, avec les conclusions des deux étapes d'attestation. */
const etapesRelease = (oneOff, verification) => [
  { name: ETAPE_DECLENCHEMENT, conclusion: 'success' },
  { name: ONE_OFF, conclusion: oneOff },
  { name: VERIFICATION, conclusion: verification },
  { name: 'Garde anti-recul — le commit du run a été dépassé', conclusion: 'failure' },
];
/** Les étapes d'un run EN COURS : le déclenchement conclu (ou non), le reste pas encore joué. */
const etapesEnCours = (declenchement) => [
  { name: ETAPE_DECLENCHEMENT, conclusion: declenchement },
  { name: ONE_OFF, conclusion: null },
  { name: VERIFICATION, conclusion: null },
];

// ── Abstentions ─────────────────────────────────────────────────────────────

test('ce run n’est plus la tête, et le CI de la tête n’a pas conclu : abstention, AUCUN déclenchement', async () => {
  for (const ci of ['en-cours', 'absent']) {
    const m = monde({ tetes: [C], lectures: [tableau(EN_SERVICE_A)] });
    const v = await deployer({ sha: B, ...m.deps, lireCi: () => ci });
    assert.equal(v.code, SORTIE_OK, ci);
    assert.equal(v.etat, 'depasse', ci);
    assert.equal(m.appels.declencher, 0, ci);
  }
});

// Revue du lot 3 (C3) : la concurrence GitHub ne garde qu'UN run en attente ;
// celui de la tête peut être évincé par le run d'un commit plus ancien dont le
// CI a fini après. Ce run-là doit alors livrer la TÊTE, pas s'abstenir.
test('revue lot 3 — un run dépassé dont la tête a un CI VERT livre la tête', async () => {
  const m = monde({
    tetes: [C],
    lectures: [tableau(EN_SERVICE_A), tableau(ligne('dep-c', '2026/09/25 11:00:00', '5m0s', C), EN_SERVICE_A)],
  });
  const v = await deployer({ sha: B, ...m.deps, lireCi: (x) => (x === C ? 'success' : 'echec') });
  assert.equal(v.etat, 'deploye', v.motif);
  assert.equal(m.appels.declencher, 1);
  assert.match(v.motif, new RegExp(C));
});

// Quand un run dépassé livre la tête, c'est la TÊTE qui doit être en service :
// que la version en service contienne le commit du run ne suffit pas.
test('revue lot 3 — un run dépassé juge la contenance sur la tête qu’il livre, pas sur son commit', async () => {
  const m = monde({
    tetes: [C],
    lectures: [tableau(EN_SERVICE_A), tableau(ligne('dep-b', '2026/09/25 11:00:00', '5m0s', B), EN_SERVICE_A)],
  });
  const v = await deployer({ sha: B, ...m.deps });
  assert.equal(v.code, SORTIE_ECHEC);
  assert.equal(v.etat, 'non-livre');
});

test('revue lot 3 — dépassé par une tête au CI ROUGE : averti, aucune écriture', async () => {
  const m = monde({ tetes: [C], lectures: [tableau(EN_SERVICE_A)] });
  const v = await deployer({ sha: B, ...m.deps, lireCi: () => 'echec' });
  assert.equal(v.code, SORTIE_OK);
  assert.equal(v.etat, 'depasse-tete-rouge');
  assert.equal(v.avertissement, true);
  assert.equal(m.appels.declencher, 0);
});

test('revue lot 3 — dépassé par une tête verte mais RETENUE : la retenue vaut pour la tête', async () => {
  const m = monde({ tetes: [C], lectures: [tableau(EN_SERVICE_A)] });
  const v = await deployer({
    sha: B,
    ...m.deps,
    dernierCommitReleaseDb: (x) => (x === C ? C : null),
    lireRunsReleaseDb: () => [run(C, 'waiting')],
  });
  assert.equal(v.etat, 'retenu-release-db');
  assert.equal(m.appels.declencher, 0);
});

test('revue lot 3 — la branche livre un commit plus neuf NON vérifié : rouge', async () => {
  for (const [ci, runs] of [
    ['en-cours', []],
    ['success', [run(C, 'waiting')]],
  ]) {
    const m = monde({
      tetes: [B, B, C],
      lectures: [tableau(EN_SERVICE_A), tableau(ligne('dep-c', '2026/09/25 11:00:00', '5m0s', C), EN_SERVICE_A)],
    });
    const v = await deployer({
      sha: B,
      ...m.deps,
      lireCi: (x) => (x === C ? ci : 'success'),
      dernierCommitReleaseDb: (x) => (x === C && runs.length ? C : null),
      lireRunsReleaseDb: () => runs,
    });
    assert.equal(v.code, SORTIE_ECHEC, ci);
    assert.equal(v.etat, 'livre-non-verifie', ci);
  }
});

test('classement du CI d’un commit', () => {
  assert.equal(classerCi([]), 'absent');
  assert.equal(classerCi([{ status: 'in_progress', conclusion: null }]), 'en-cours');
  assert.equal(classerCi([{ status: 'completed', conclusion: 'failure' }]), 'echec');
  assert.equal(classerCi([{ status: 'completed', conclusion: 'cancelled' }]), 'echec');
  // Une relance réussie efface l'échec.
  assert.equal(classerCi([{ status: 'completed', conclusion: 'failure' }, { status: 'completed', conclusion: 'success' }]), 'success');
});

test('la tête bouge ENTRE la lecture et l’écriture : abstention, aucun déclenchement', async () => {
  const m = monde({ tetes: [B, C], lectures: [tableau(EN_SERVICE_A)] });
  const v = await deployer({ sha: B, ...m.deps });
  assert.equal(v.etat, 'depasse');
  assert.equal(m.appels.declencher, 0);
});

// Revue #1220 : une branche DIVERGENTE bâtie sur la tête CONTIENT la tête sans
// être sur `main`. En service, elle ne doit pas faire conclure « déjà en
// service » — il faut redéployer `main`.
test('revue #1220 — une branche divergente en service n’est pas « déjà en service »', async () => {
  const DIVERGENT = 'f'.repeat(40);
  const m = monde({
    tetes: [B],
    lectures: [
      tableau(ligne('dep-f', '2026/09/25 10:50:00', '5m0s', DIVERGENT), EN_SERVICE_A),
      tableau(ligne('dep-b', '2026/09/25 11:00:00', '5m0s', B), ligne('dep-f', '2026/09/25 10:50:00', '5m0s', DIVERGENT), EN_SERVICE_A),
    ],
  });
  // DIVERGENT descend de B, mais n'est pas sur la ligne de main.
  const v = await deployer({ sha: B, ...m.deps, estAncetre: (x, y) => (y === DIVERGENT ? x === DIVERGENT || estAncetre(x, B) : estAncetre(x, y)) });
  assert.equal(m.appels.declencher, 1, 'il faut redéployer main');
  assert.equal(v.etat, 'deploye', v.motif);
});

// Les trois bornes d'attente (la fin d'un run release-db en exécution, le
// calme avant l'écriture, la conclusion après) doivent tenir dans le timeout
// du job, installation comprise.
test('revue #1220 — le timeout du job couvre les trois attentes cumulées', () => {
  const minutes = Number(job('deploiement').match(/^\s+timeout-minutes:\s*(\d+)\s*$/m)?.[1]);
  const attentes = (3 * ESSAIS_DEFAUT * INTERVALLE_MS_DEFAUT) / 60000;
  assert.ok(minutes >= attentes + 5, `timeout ${minutes} min < ${attentes} min d'attentes + 5 min d'installation`);
});

test('déjà en service sur un tableau calme : abstention, sauf à forcer', async () => {
  const m = monde({ tetes: [A], lectures: [tableau(EN_SERVICE_A)] });
  const v = await deployer({ sha: A, ...m.deps });
  assert.equal(v.etat, 'deja-en-service');
  assert.equal(m.appels.declencher, 0);
});

// ── Chemin nominal ──────────────────────────────────────────────────────────

test('répétition à vide (forcer) : redéploie la tête déjà en service, et attend SON déploiement', async () => {
  const m = monde({
    tetes: [A],
    lectures: [
      tableau(EN_SERVICE_A),
      tableau(ligne('dep-a2', '2026/09/25 11:00:00', '', A, 'building'), EN_SERVICE_A),
      tableau(ligne('dep-a2', '2026/09/25 11:00:00', '6m0s', A), EN_SERVICE_A),
    ],
  });
  const v = await deployer({ sha: A, forcer: true, ...m.deps });
  assert.equal(v.code, SORTIE_OK, v.motif);
  assert.equal(v.etat, 'deploye');
  assert.match(v.motif, /dep-a2/, 'c’est le NOUVEAU déploiement qui conclut, pas l’ancien');
  assert.equal(m.appels.declencher, 1);
});

test('nouvelle tête : déclenche, suit le build, conclut quand elle est EN SERVICE', async () => {
  const m = monde({
    tetes: [B],
    lectures: [
      tableau(EN_SERVICE_A),
      tableau(ligne('dep-b', '2026/09/25 11:00:00', '', B, 'queued'), EN_SERVICE_A),
      tableau(ligne('dep-b', '2026/09/25 11:00:00', '', B, 'building'), EN_SERVICE_A),
      tableau(ligne('dep-b', '2026/09/25 11:00:00', '5m0s', B), EN_SERVICE_A),
    ],
  });
  const v = await deployer({ sha: B, ...m.deps });
  assert.equal(v.etat, 'deploye');
  assert.equal(m.appels.declencher, 1);
  assert.equal(m.appels.dormir, 3);
});

test('une tête plus neuve livrée par la même branche compte comme livrée', async () => {
  // manual-deploy lit la branche : si C a été mergé entre-temps, c'est C qui part.
  const m = monde({
    tetes: [B, B, C],
    lectures: [tableau(EN_SERVICE_A), tableau(ligne('dep-c', '2026/09/25 11:00:00', '5m0s', C), EN_SERVICE_A)],
  });
  const v = await deployer({ sha: B, ...m.deps });
  assert.equal(v.etat, 'deploye');
});

// ── Builds en vol (revue, constat C1) ──────────────────────────────────────

test('revue — un build en vol AVANT le déclenchement : on attend qu’il finisse, PUIS on écrit', async () => {
  const m = monde({
    tetes: [B],
    lectures: [
      tableau(ligne('dep-x', '2026/09/25 10:50:00', '', A2, 'building'), EN_SERVICE_A),
      tableau(ligne('dep-x', '2026/09/25 10:50:00', '6m0s', A2), EN_SERVICE_A),
      tableau(ligne('dep-b', '2026/09/25 11:00:00', '5m0s', B), ligne('dep-x', '2026/09/25 10:50:00', '6m0s', A2), EN_SERVICE_A),
    ],
  });
  const v = await deployer({ sha: B, ...m.deps });
  assert.equal(v.etat, 'deploye', v.motif);
  assert.deepEqual(m.appels.trace.slice(0, 3), ['lecture 1', 'lecture 2', 'ECRITURE'], 'l’écriture suit la lecture CALME');
});

test('revue — « déjà en service » n’est pas jugé tant qu’un build plus ancien est en vol', async () => {
  // B en service, mais A2 en build : s'il finit après, A2 remplace B.
  const EN_SERVICE_B = ligne('dep-b', '2026/09/25 10:40:00', '5m0s', B);
  const m = monde({
    tetes: [B],
    lectures: [
      tableau(ligne('dep-x', '2026/09/25 10:50:00', '', A2, 'building'), EN_SERVICE_B),
      tableau(ligne('dep-x', '2026/09/25 10:50:00', '9m0s', A2), EN_SERVICE_B),
      tableau(ligne('dep-b2', '2026/09/25 11:00:00', '5m0s', B), ligne('dep-x', '2026/09/25 10:50:00', '9m0s', A2), EN_SERVICE_B),
    ],
  });
  const v = await deployer({ sha: B, ...m.deps });
  assert.equal(m.appels.declencher, 1, 'A2 a remplacé B : il faut redéployer, pas s’abstenir');
  assert.equal(v.etat, 'deploye');
});

test('revue — un build plus ancien en vol APRÈS le nôtre : on ne conclut pas avant sa fin, et s’il l’emporte, rouge', async () => {
  const m = monde({
    tetes: [B],
    lectures: [
      tableau(EN_SERVICE_A),
      // Notre build a fini ; un auto-déploiement de A2 est encore en vol.
      tableau(ligne('dep-x', '2026/09/25 11:01:00', '', A2, 'building'), ligne('dep-b', '2026/09/25 11:00:00', '4m0s', B), EN_SERVICE_A),
      // A2 finit APRÈS B : A2 en service.
      tableau(ligne('dep-x', '2026/09/25 11:01:00', '9m0s', A2), ligne('dep-b', '2026/09/25 11:00:00', '4m0s', B), EN_SERVICE_A),
    ],
  });
  const v = await deployer({ sha: B, ...m.deps });
  assert.equal(v.code, SORTIE_ECHEC);
  assert.equal(v.etat, 'non-livre');
});

test('un build en vol qui ne finit jamais avant l’écriture : rouge, AUCUNE écriture', async () => {
  const m = monde({ tetes: [B], lectures: [tableau(ligne('dep-x', '2026/09/25 10:50:00', '', A2, 'building'), EN_SERVICE_A)] });
  const v = await deployer({ sha: B, ...m.deps });
  assert.equal(v.etat, 'en-vol');
  assert.equal(m.appels.declencher, 0);
});

// ── Échecs ──────────────────────────────────────────────────────────────────

test('build en échec : rouge sans attendre la borne', async () => {
  const m = monde({
    tetes: [B],
    lectures: [tableau(EN_SERVICE_A), tableau(ligne('dep-b', '2026/09/25 11:00:00', '3m0s', B, 'build-error'), EN_SERVICE_A)],
  });
  const v = await deployer({ sha: B, ...m.deps });
  assert.equal(v.code, SORTIE_ECHEC);
  assert.equal(v.etat, 'build-en-echec');
  assert.equal(m.appels.dormir, 1);
});

test('un nouveau build en échec et un autre réussi : c’est le verdict d’ensemble qui compte', async () => {
  const m = monde({
    tetes: [B],
    lectures: [
      tableau(EN_SERVICE_A),
      tableau(ligne('dep-b2', '2026/09/25 11:05:00', '5m0s', B), ligne('dep-b', '2026/09/25 11:00:00', '1m0s', B, 'build-error'), EN_SERVICE_A),
    ],
  });
  const v = await deployer({ sha: B, ...m.deps });
  assert.equal(v.etat, 'deploye', v.motif);
});

test('un échec ANCIEN, déjà listé avant, n’est pas pris pour le nôtre', async () => {
  const ANCIEN_ECHEC = ligne('dep-old', '2026/09/25 09:00:00', '2m0s', A, 'build-error');
  const m = monde({
    tetes: [B],
    lectures: [
      tableau(EN_SERVICE_A, ANCIEN_ECHEC),
      tableau(EN_SERVICE_A, ANCIEN_ECHEC),
      tableau(ligne('dep-b', '2026/09/25 11:00:00', '5m0s', B), EN_SERVICE_A, ANCIEN_ECHEC),
    ],
  });
  const v = await deployer({ sha: B, ...m.deps });
  assert.equal(v.etat, 'deploye', v.motif);
});

test('revue (C7) — un nouveau déploiement réussi qui ne CONTIENT pas ce commit n’est pas une livraison', async () => {
  const m = monde({
    tetes: [B],
    lectures: [tableau(EN_SERVICE_A), tableau(ligne('dep-x', '2026/09/25 11:00:00', '5m0s', A2), EN_SERVICE_A)],
  });
  const v = await deployer({ sha: B, ...m.deps });
  assert.notEqual(v.etat, 'deploye');
  assert.equal(v.code, SORTIE_ECHEC);
});

test('un statut inconnu n’est PAS un échec : l’attente bornée tranche', async () => {
  const m = monde({
    tetes: [B],
    lectures: [tableau(EN_SERVICE_A), tableau(ligne('dep-b', '2026/09/25 11:00:00', '', B, 'bizarre'), EN_SERVICE_A)],
  });
  const v = await deployer({ sha: B, ...m.deps });
  assert.equal(v.etat, 'delai');
  assert.equal(m.appels.dormir, 5);
});

test('rien ne conclut : délai, rouge, état inconnu', async () => {
  const m = monde({ tetes: [B], lectures: [tableau(EN_SERVICE_A)] });
  const v = await deployer({ sha: B, ...m.deps });
  assert.equal(v.code, SORTIE_ECHEC);
  assert.equal(v.etat, 'delai');
});

test('déclenchement refusé par Scalingo : rouge', async () => {
  const m = monde({ tetes: [B], lectures: [tableau(EN_SERVICE_A)], declencherLeve: new Error('403 forbidden') });
  const v = await deployer({ sha: B, ...m.deps });
  assert.equal(v.code, SORTIE_ECHEC);
  assert.equal(v.etat, 'refuse');
});

test('lecture en échec AVANT l’écriture : aucune écriture', async () => {
  const m = monde({ tetes: [B], lectures: [new Error('api down')] });
  await assert.rejects(() => deployer({ sha: B, ...m.deps }));
  assert.equal(m.appels.declencher, 0);
});

test('lecture en échec APRÈS l’écriture : on continue d’attendre, on ne conclut pas', async () => {
  const m = monde({
    tetes: [B],
    lectures: [tableau(EN_SERVICE_A), new Error('api down'), tableau(ligne('dep-b', '2026/09/25 11:00:00', '5m0s', B), EN_SERVICE_A)],
  });
  const v = await deployer({ sha: B, ...m.deps });
  assert.equal(v.etat, 'deploye');
});

test('succès du build mais recul constaté sur le tableau définitif : rouge', async () => {
  // C a été mis en service (auto-déploiement), puis le déploiement de B, parti
  // avant, finit APRÈS : B en service, C retiré.
  const m = monde({
    tetes: [B, B, C],
    lectures: [
      tableau(EN_SERVICE_A),
      tableau(
        ligne('dep-b', '2026/09/25 11:00:00', '9m0s', B), // fin 11:09
        ligne('dep-c', '2026/09/25 11:01:00', '4m0s', C), // fin 11:05
        EN_SERVICE_A,
      ),
    ],
  });
  const v = await deployer({ sha: B, ...m.deps });
  assert.equal(v.code, SORTIE_ECHEC);
  assert.equal(v.etat, 'recul');
});

test('revue — la tête relue compte : une version en service hors de sa ligne est illisible, pas « déployée »', async () => {
  const INCONNU = 'e'.repeat(40);
  const m = monde({
    tetes: [B, B, INCONNU],
    lectures: [tableau(EN_SERVICE_A), tableau(ligne('dep-b', '2026/09/25 11:00:00', '5m0s', B), EN_SERVICE_A)],
  });
  const v = await deployer({ sha: B, ...m.deps });
  assert.equal(v.etat, 'illisible');
  assert.equal(v.code, SORTIE_ECHEC);
});

// ── Lot 3 et D-374 §1 : une migration non attestée appliquée retient la tête ─

// D-374 §1 — le cas que D-248 (arbitrage n° 2, « Inchangé, et à connaître »)
// décrivait et gardait : B porte une migration dont le run attend
// l'approbation ; C, du code seul, est mergé par-dessus. Jusqu'ici la retenue
// ne lisait que les runs de C — aucun —, et C partait en production avec le
// code de B, contre une base sans ses colonnes.
test('D-374 §1 — migration portée par un ANCÊTRE en attente d’approbation, tête de code verte : la tête est retenue, aucune écriture', async () => {
  const m = monde({ tetes: [C], lectures: [tableau(EN_SERVICE_A)] });
  const v = await deployer({
    sha: C,
    ...m.deps,
    dernierCommitReleaseDb: (x) => (x === C ? B : null),
    lireRunsReleaseDb: (x) => (x === B ? [run(B, 'waiting')] : []),
  });
  assert.equal(v.code, SORTIE_OK);
  assert.equal(v.etat, 'retenu-release-db');
  assert.equal(v.avertissement, undefined, 'une attente d’approbation n’est pas un avertissement');
  assert.match(v.motif, new RegExp(`^${C} contient ${B}, qui porte un run release-db non conclu \\(waiting\\)`));
  assert.equal(m.appels.declencher, 0);
});

test('lot 3 — un run release-db EN ATTENTE sur le commit lui-même le retient : vert, AUCUNE écriture', async () => {
  for (const statut of ['waiting', 'queued', 'in_progress']) {
    const m = monde({ tetes: [B], lectures: [tableau(EN_SERVICE_A)] });
    const v = await deployer({ sha: B, ...m.deps, dernierCommitReleaseDb: () => B, lireRunsReleaseDb: () => [run(B, statut)] });
    assert.equal(v.code, SORTIE_OK, statut);
    assert.equal(v.etat, 'retenu-release-db', statut);
    assert.match(v.motif, new RegExp(`^${B} porte un run release-db non conclu \\(${statut}\\)`));
    assert.equal(m.appels.declencher, 0, statut);
  }
});

// Un run rejeté, ou tombé sur une garde ou un build : le one-off n'a pas
// tourné (étape absente ou sautée), rien n'a touché la base. Retenu, comme le
// faisait Scalingo — et averti : il faut relancer.
test('lot 3 — un run release-db en échec AVANT toute application (rejeté, garde, build) retient, averti : relancer', async () => {
  for (const etapesLues of [[], etapesRelease('skipped', 'skipped')]) {
    const m = monde({ tetes: [B], lectures: [tableau(EN_SERVICE_A)] });
    const v = await deployer({
      sha: B,
      ...m.deps,
      dernierCommitReleaseDb: () => B,
      lireRunsReleaseDb: () => [run(B, 'completed', 'failure')],
      lireEtapesReleaseDb: () => etapesLues,
    });
    assert.equal(v.etat, 'retenu-release-db');
    assert.equal(v.avertissement, true);
    assert.match(v.motif, /en échec avant toute application \(failure\) — relancer release-db/);
    assert.equal(m.appels.declencher, 0);
  }
});

test('lot 3 — un run release-db RÉUSSI, ou aucun commit de release-db dans la ligne : le déploiement suit son cours', async () => {
  for (const [dernier, runs] of [
    [B, [run(B, 'completed', 'success')]],
    [null, []],
  ]) {
    const m = monde({
      tetes: [B],
      lectures: [tableau(EN_SERVICE_A), tableau(ligne('dep-b', '2026/09/25 11:00:00', '5m0s', B), EN_SERVICE_A)],
    });
    const v = await deployer({ sha: B, ...m.deps, dernierCommitReleaseDb: () => dernier, lireRunsReleaseDb: () => runs });
    assert.equal(v.etat, 'deploye', JSON.stringify(runs));
  }
});

// D-374 §2, phase 3 : la garde anti-recul fait finir en ÉCHEC VOLONTAIRE un
// run dont la release a eu lieu (incident #1577, 2026-10-19 : one-off et
// contre-épreuve verts, garde rouge). La migration est appliquée, la tête
// part. Un tel run ne devient jamais un verrou permanent.
test('D-374 §1 — fin rouge volontaire APRÈS application (garde anti-recul) : appliquée, la tête part', async () => {
  const lus = [];
  const m = monde({
    tetes: [C],
    lectures: [tableau(EN_SERVICE_A), tableau(ligne('dep-c', '2026/09/25 11:00:00', '5m0s', C), EN_SERVICE_A)],
  });
  const v = await deployer({
    sha: C,
    ...m.deps,
    dernierCommitReleaseDb: () => B,
    lireRunsReleaseDb: () => [run(B, 'completed', 'failure', 42)],
    lireEtapesReleaseDb: (id) => {
      lus.push(id);
      return etapesRelease('success', 'success');
    },
  });
  assert.equal(v.etat, 'deploye', v.motif);
  assert.deepEqual([...new Set(lus)], [42], 'les étapes du run rouge sont lues, par son identifiant');
});

// Le one-off a tourné sans attestation complète : étape rouge (préflight,
// migrate deploy, sentinelle absente), annulée (piège 3 : annuler le job
// n'arrête pas le one-off), ou contre-épreuve non verte. La base se lit par
// conteneur — retenu, averti, jamais relancé à l'aveugle.
test('D-374 §1 — le one-off a tourné sans attestation : état INCONNU, retenu, averti', async () => {
  for (const [oneOff, verification] of [
    ['failure', 'skipped'],
    ['cancelled', 'skipped'],
    ['success', 'failure'],
    ['success', 'skipped'],
  ]) {
    const m = monde({ tetes: [B], lectures: [tableau(EN_SERVICE_A)] });
    const v = await deployer({
      sha: B,
      ...m.deps,
      dernierCommitReleaseDb: () => B,
      lireRunsReleaseDb: () => [run(B, 'completed', 'failure')],
      lireEtapesReleaseDb: () => etapesRelease(oneOff, verification),
    });
    assert.equal(v.etat, 'retenu-release-db', `${oneOff}/${verification}`);
    assert.equal(v.avertissement, true, `${oneOff}/${verification}`);
    assert.match(v.motif, /état de la base INCONNU — lire `_prisma_migrations` par conteneur/);
    assert.equal(m.appels.declencher, 0);
  }
});

// Un run relancé en `workflow_dispatch` porte la tête du moment, pas le
// commit de la migration : `migrate deploy` applique tout ce qui attend, donc
// un run attesté sur un DESCENDANT du commit porteur atteste sa migration.
test('D-374 §1 — un run attesté sur un descendant du commit porteur atteste sa migration, malgré un run plus ancien en échec', async () => {
  const m = monde({
    tetes: [C],
    lectures: [tableau(EN_SERVICE_A), tableau(ligne('dep-c', '2026/09/25 11:00:00', '5m0s', C), EN_SERVICE_A)],
  });
  const v = await deployer({
    sha: C,
    ...m.deps,
    dernierCommitReleaseDb: () => B,
    lireRunsReleaseDb: () => [run(B, 'completed', 'failure', 1), run(C, 'completed', 'success', 2)],
    lireEtapesReleaseDb: () => [],
  });
  assert.equal(v.etat, 'deploye', v.motif);
});

// Revue CodeRabbit de #1713 : les runs se classent dans l'ordre rendu par
// l'API, du plus récent au plus ancien, et le premier « appliquée » libère
// sans lire les étapes des runs plus anciens — une lecture en panne sur un
// vieux run rouge sans objet ne bloque pas le déploiement.
test('revue #1713 — un run appliqué en tête de liste épargne la lecture des étapes des runs plus anciens', async () => {
  const m = monde({
    tetes: [C],
    lectures: [tableau(EN_SERVICE_A), tableau(ligne('dep-c', '2026/09/25 11:00:00', '5m0s', C), EN_SERVICE_A)],
  });
  const v = await deployer({
    sha: C,
    ...m.deps,
    dernierCommitReleaseDb: () => B,
    lireRunsReleaseDb: () => [run(C, 'completed', 'success', 2), run(B, 'completed', 'failure', 1)],
    lireEtapesReleaseDb: () => {
      throw new Error('api 502');
    },
  });
  assert.equal(v.etat, 'deploye', v.motif);
});

// Un run vert sur un commit ANTÉRIEUR au porteur date d'avant sa migration :
// il n'atteste rien pour elle. Sans cette borne, le dernier run vert de
// l'historique libérerait toute migration.
test('D-374 §1 — un run attesté sur un commit antérieur au commit porteur n’atteste pas sa migration', async () => {
  const m = monde({ tetes: [B], lectures: [tableau(EN_SERVICE_A)] });
  const v = await deployer({ sha: B, ...m.deps, dernierCommitReleaseDb: () => B, lireRunsReleaseDb: () => [run(A, 'completed', 'success')] });
  assert.equal(v.etat, 'retenu-release-db');
  assert.match(v.motif, /aucun run release-db n'est visible/);
  assert.equal(m.appels.declencher, 0);
});

// Priorité des états : un run EN ATTENTE prime sur un échec plus ancien (le
// responsable a relancé) ; un run APPLIQUÉ prime sur tout — la base ne
// recule pas.
test('D-374 §1 — un run en attente prime sur un échec antérieur ; un run appliqué prime sur tout', async () => {
  const m = monde({ tetes: [C], lectures: [tableau(EN_SERVICE_A)] });
  const v = await deployer({
    sha: C,
    ...m.deps,
    dernierCommitReleaseDb: () => B,
    lireRunsReleaseDb: () => [run(B, 'completed', 'failure', 1), run(C, 'waiting', null, 2)],
    lireEtapesReleaseDb: () => [],
  });
  assert.equal(v.etat, 'retenu-release-db');
  assert.equal(v.avertissement, undefined);
  assert.match(v.motif, /non conclu \(waiting\)/);

  const m2 = monde({
    tetes: [C],
    lectures: [tableau(EN_SERVICE_A), tableau(ligne('dep-c', '2026/09/25 11:00:00', '5m0s', C), EN_SERVICE_A)],
  });
  const v2 = await deployer({
    sha: C,
    ...m2.deps,
    dernierCommitReleaseDb: () => B,
    lireRunsReleaseDb: () => [run(B, 'completed', 'success', 1), run(C, 'waiting', null, 2)],
  });
  assert.equal(v2.etat, 'deploye', v2.motif);
});

// Revue de #1713 (constat 1) : approuvé, release-db lit la tête UNE fois, à
// son déclenchement, puis applique pendant plusieurs minutes. Un commit C
// mergé après cette lecture n'est livré par personne — le run finit sans le
// redéployer, et le run du déployeur de C, retenu au vert, ne repart pas. Le
// déployeur attend donc la fin du run, puis rejuge : C part.
test('revue #1713 — un run en exécution sur un ancêtre a déjà lu la tête : le déployeur attend sa fin, puis livre la tête', async () => {
  let lectures = 0;
  const m = monde({
    tetes: [C],
    lectures: [tableau(EN_SERVICE_A), tableau(ligne('dep-c', '2026/09/25 11:00:00', '5m0s', C), EN_SERVICE_A)],
  });
  const v = await deployer({
    sha: C,
    ...m.deps,
    dernierCommitReleaseDb: () => B,
    lireRunsReleaseDb: () => {
      lectures += 1;
      return [lectures <= 2 ? run(B, 'in_progress', null, 7) : run(B, 'completed', 'success', 7)];
    },
    lireEtapesReleaseDb: (id) => (id === 7 ? etapesEnCours('success') : []),
  });
  assert.equal(v.etat, 'deploye', v.motif);
  assert.equal(v.avertissement, undefined);
  assert.equal(m.appels.declencher, 1);
  // Deux tours d'attente du run, puis un tour de suivi du build.
  assert.equal(m.appels.dormir, 3);
  assert.deepEqual(m.appels.trace, ['lecture 1', 'ECRITURE', 'lecture 2'], 'rien n’est lu ni écrit avant la fin du run');
});

test('revue #1713 — un run sur un ancêtre qui n’a pas encore lu la tête (approbation en attente) la livrera : retenu, sans attendre', async () => {
  for (const [statut, etapesLues] of [
    ['waiting', []],
    ['queued', etapesEnCours(null)],
    ['in_progress', etapesEnCours(null)],
  ]) {
    const m = monde({ tetes: [C], lectures: [tableau(EN_SERVICE_A)] });
    const v = await deployer({
      sha: C,
      ...m.deps,
      dernierCommitReleaseDb: () => B,
      lireRunsReleaseDb: () => [run(B, statut)],
      lireEtapesReleaseDb: () => etapesLues,
    });
    assert.equal(v.etat, 'retenu-release-db', statut);
    assert.equal(v.avertissement, undefined, statut);
    assert.equal(v.attendre, undefined, 'le drapeau ne sort pas du noyau');
    assert.match(v.motif, /release-db déploiera la tête à l'approbation/, statut);
    assert.equal(m.appels.dormir, 0, statut);
    assert.equal(m.appels.declencher, 0, statut);
  }
});

test('revue #1713 — un run en exécution qui porte la cible elle-même la livrera : retenu, sans attendre', async () => {
  const m = monde({ tetes: [B], lectures: [tableau(EN_SERVICE_A)] });
  const v = await deployer({
    sha: B,
    ...m.deps,
    dernierCommitReleaseDb: () => B,
    lireRunsReleaseDb: () => [run(B, 'in_progress')],
    lireEtapesReleaseDb: () => etapesEnCours('success'),
  });
  assert.equal(v.etat, 'retenu-release-db');
  assert.equal(v.avertissement, undefined);
  assert.equal(m.appels.dormir, 0);
});

test('revue #1713 — le run est toujours en exécution après la borne : retenu, averti, à relancer à la main', async () => {
  const m = monde({ tetes: [C], lectures: [tableau(EN_SERVICE_A)] });
  const v = await deployer({
    sha: C,
    ...m.deps,
    dernierCommitReleaseDb: () => B,
    lireRunsReleaseDb: () => [run(B, 'in_progress')],
    lireEtapesReleaseDb: () => etapesEnCours('success'),
  });
  assert.equal(v.code, SORTIE_OK);
  assert.equal(v.etat, 'retenu-release-db');
  assert.equal(v.avertissement, true);
  assert.match(v.motif, /a lu la tête de main avant .* ; toujours en exécution après 0 min — relancer le déployeur \(action=deployer\)/);
  assert.equal(m.appels.dormir, 5, 'la borne est celle des autres attentes');
  assert.equal(m.appels.declencher, 0);
  assert.deepEqual(m.appels.trace, [], 'aucune lecture Scalingo, aucune écriture');
});

// Revue #1222 : le run release-db du même push peut ne pas encore être visible
// dans l'API. Une liste vide ne vaut permission que si la ligne ne contient
// AUCUN commit qui déclenche release-db.
test('revue #1222 — commit touchant un chemin de release-db SANS run visible : retenu, averti, aucune écriture', async () => {
  const m = monde({ tetes: [B], lectures: [tableau(EN_SERVICE_A)] });
  const v = await deployer({ sha: B, ...m.deps, dernierCommitReleaseDb: () => B });
  assert.equal(v.etat, 'retenu-release-db');
  assert.equal(v.avertissement, true);
  assert.match(v.motif, new RegExp(`^${B} touche un chemin de release-db mais aucun run release-db n'est visible`));
  assert.equal(m.appels.declencher, 0);
});

// Un run vert HORS de la plage [porteur, cible] n'atteste rien pour la
// cible : ni sur un sha étranger à la ligne, ni sur un descendant au-delà de
// la cible. Revue de #1713 (constat 3) : sans danger en pratique — hors
// `main`, le job `release` est sauté —, la borne reste délibérée et tenue.
test('D-374 §1 — un run attesté hors de la plage [porteur, cible] n’atteste pas sa migration', async () => {
  const HORS_LIGNE = 'f'.repeat(40);
  const m = monde({ tetes: [B], lectures: [tableau(EN_SERVICE_A)] });
  const v = await deployer({
    sha: B,
    ...m.deps,
    dernierCommitReleaseDb: () => B,
    lireRunsReleaseDb: () => [run(B, 'waiting', null, 1), run(C, 'completed', 'success', 2), run(HORS_LIGNE, 'completed', 'success', 3)],
  });
  assert.equal(v.etat, 'retenu-release-db');
  assert.match(v.motif, /non conclu \(waiting\)/);
  assert.equal(m.appels.declencher, 0);
});

// Revue #1222 : la retenue est RELUE juste avant l'écriture, après une attente
// du calme qui peut durer vingt minutes. Seul le verdict de la seconde lecture
// compte : ce monde factice change d'avis entre les deux (garde de mutation —
// un run réel ne disparaît pas, mais une relecture qui n'appliquerait pas son
// verdict passerait inaperçue).
test('revue #1222 — la retenue est relue juste avant l’écriture, et c’est son verdict qui s’applique', async () => {
  let lectures = 0;
  const m = monde({
    tetes: [B],
    lectures: [
      tableau(ligne('dep-x', '2026/09/25 10:50:00', '', A2, 'building'), EN_SERVICE_A),
      tableau(ligne('dep-x', '2026/09/25 10:50:00', '6m0s', A2), EN_SERVICE_A),
    ],
  });
  const v = await deployer({
    sha: B,
    ...m.deps,
    dernierCommitReleaseDb: () => B,
    lireRunsReleaseDb: () => {
      lectures += 1;
      return lectures === 1 ? [run(B, 'completed', 'success')] : [run(B, 'waiting')];
    },
  });
  assert.equal(v.etat, 'retenu-release-db');
  assert.equal(lectures, 2);
  assert.equal(m.appels.declencher, 0, 'aucune écriture : la retenue est relue juste avant');
});

// Et une lecture en échec à ce moment propage — sans écriture.
test('revue #1222 — une lecture de la retenue en échec juste avant l’écriture n’écrit pas', async () => {
  let lectures = 0;
  const m = monde({
    tetes: [B],
    lectures: [
      tableau(ligne('dep-x', '2026/09/25 10:50:00', '', A2, 'building'), EN_SERVICE_A),
      tableau(ligne('dep-x', '2026/09/25 10:50:00', '6m0s', A2), EN_SERVICE_A),
    ],
  });
  await assert.rejects(() =>
    deployer({
      sha: B,
      ...m.deps,
      dernierCommitReleaseDb: () => B,
      lireRunsReleaseDb: () => {
        lectures += 1;
        if (lectures === 2) throw new Error('api 502');
        return [run(B, 'completed', 'success')];
      },
    }),
  );
  assert.equal(lectures, 2);
  assert.equal(m.appels.declencher, 0, 'aucune écriture : la retenue est relue juste avant');
});

test('classement d’un run release-db : les quatre états, et les étapes ne sont lues que sur un run rouge', () => {
  let lus = 0;
  const lire = (etapesLues) => () => {
    lus += 1;
    return etapesLues;
  };
  assert.equal(classerRunReleaseDb(run(B, 'waiting'), lire([])), 'en-attente');
  assert.equal(classerRunReleaseDb(run(B, 'in_progress'), lire([])), 'en-attente');
  assert.equal(classerRunReleaseDb(run(B, 'completed', 'success'), lire([])), 'appliquee');
  assert.equal(lus, 0, 'aucune étape lue sur un run non conclu ou vert');
  assert.equal(classerRunReleaseDb(run(B, 'completed', 'failure'), lire(etapesRelease('success', 'success'))), 'appliquee');
  assert.equal(classerRunReleaseDb(run(B, 'completed', 'cancelled'), lire(etapesRelease('success', 'success'))), 'appliquee');
  assert.equal(classerRunReleaseDb(run(B, 'completed', 'failure'), lire([])), 'echec');
  assert.equal(classerRunReleaseDb(run(B, 'completed', 'failure'), lire(etapesRelease('skipped', 'skipped'))), 'echec');
  assert.equal(classerRunReleaseDb(run(B, 'completed', 'failure'), lire(etapesRelease('failure', 'skipped'))), 'inconnu');
  assert.equal(classerRunReleaseDb(run(B, 'completed', 'failure'), lire(etapesRelease('success', 'failure'))), 'inconnu');
  assert.equal(classerRunReleaseDb(run(B, 'completed', 'timed_out'), lire(etapesRelease('cancelled', 'skipped'))), 'inconnu');
});

// Les deux étapes dont le déployeur lit la conclusion doivent exister sous ce
// nom dans le job `release` de release-db.yml, dans cet ordre, et AVANT la
// garde anti-recul : renommer l'une d'elles ferait lire « inconnu » — retenue
// sans fin — là où la release a eu lieu.
test('D-374 §1 — parité des étapes d’attestation avec release-db.yml, placées avant la garde anti-recul', () => {
  const releaseDb = readFileSync(join(RACINE, '.github/workflows/release-db.yml'), 'utf8');
  const release = releaseDb.slice(releaseDb.indexOf('\n  release:\n'), releaseDb.indexOf('\n  ref-refusee:\n'));
  const noms = [...release.matchAll(/^      - name: "([^"]+)"\s*$/gm)].map((m) => m[1]);
  assert.ok(noms.length > 0, 'étapes du job release introuvables');
  const positions = ETAPES_ATTESTATION.map((nom) => noms.indexOf(nom));
  assert.ok(positions.every((p) => p !== -1), `étape d'attestation absente de release-db.yml : ${ETAPES_ATTESTATION.join(' | ')}`);
  assert.ok(positions[0] < positions[1], 'le one-off précède la contre-épreuve');
  const garde = noms.findIndex((n) => n.startsWith('Garde anti-recul'));
  assert.ok(garde > positions[1], 'la garde anti-recul vient après les deux attestations');
  // Le déclenchement — la lecture de la tête — précède l'application : un
  // run dont il est conclu a figé ce qu'il livre (revue de #1713).
  const declenchement = noms.indexOf(ETAPE_DECLENCHEMENT);
  assert.ok(declenchement !== -1, `étape de déclenchement absente de release-db.yml : ${ETAPE_DECLENCHEMENT}`);
  assert.ok(declenchement < positions[0], 'le déclenchement précède le one-off');
});

// La liste des chemins que le déployeur surveille doit être CELLE du filtre
// `paths` de release-db.yml : un chemin ajouté d'un seul côté rouvrirait le
// déploiement d'un commit clinique ou de migration avant son approbation.
test('revue #1222 — parité des chemins de release-db entre release-db.yml et le déployeur', () => {
  const releaseDb = readFileSync(join(RACINE, '.github/workflows/release-db.yml'), 'utf8');
  const bloc = releaseDb.slice(releaseDb.indexOf('\n  push:\n'), releaseDb.indexOf('\n  workflow_dispatch:'));
  const chemins = [...bloc.matchAll(/^\s+- '([^']+)\/\*\*'\s*$/gm)].map((m) => m[1]).sort();
  assert.ok(chemins.length > 0, 'filtre paths de release-db.yml introuvable');
  assert.deepEqual([...CHEMINS_RELEASE_DB].sort(), chemins);
});

test('lot 3 — les runs release-db illisibles, ou leurs étapes : aucune écriture', async () => {
  const leve = () => {
    throw new Error('api 502');
  };
  for (const deps of [{ lireRunsReleaseDb: leve }, { lireRunsReleaseDb: () => [run(B, 'completed', 'failure')], lireEtapesReleaseDb: leve }]) {
    const m = monde({ tetes: [B], lectures: [tableau(EN_SERVICE_A)] });
    await assert.rejects(() => deployer({ sha: B, ...m.deps, dernierCommitReleaseDb: () => B, ...deps }));
    assert.equal(m.appels.declencher, 0);
  }
});

test('lot 3 — un run dépassé dont la tête n’a pas fini son CI n’interroge même pas release-db', async () => {
  let lu = false;
  const m = monde({ tetes: [C], lectures: [tableau(EN_SERVICE_A)] });
  const v = await deployer({
    sha: B,
    ...m.deps,
    lireCi: () => 'en-cours',
    dernierCommitReleaseDb: () => {
      lu = true;
      return C;
    },
    lireRunsReleaseDb: () => {
      lu = true;
      return [];
    },
  });
  assert.equal(v.etat, 'depasse');
  assert.equal(lu, false);
});

// ── Garde finale (revue, constat C4) ────────────────────────────────────────

const VERT = { code: SORTIE_OK, etat: 'deploye', motif: 'x' };

test('revue — garde finale : un run dépassé ne conclut JAMAIS au vert tant que l’auto-déploiement est actif', () => {
  for (const etat of ['deploye', 'depasse', 'deja-en-service']) {
    const v = gardeFinale({ ...VERT, etat }, { sha: B, lireTete: () => C, autoDeploiementActif: true });
    assert.equal(v.code, SORTIE_ECHEC, etat);
    assert.equal(v.etat, 'garde-finale');
    assert.match(v.motif, /NE PAS RELANCER/);
  }
});

test('garde finale : tête illisible ⇒ rouge ; tête inchangée ⇒ verdict intact', () => {
  const illisible = gardeFinale(VERT, {
    sha: B,
    lireTete: () => {
      throw new Error('fetch');
    },
    autoDeploiementActif: true,
  });
  assert.equal(illisible.code, SORTIE_ECHEC);
  assert.deepEqual(gardeFinale(VERT, { sha: B, lireTete: () => B, autoDeploiementActif: true }), VERT);
});

test('garde finale : sans auto-déploiement, ou sur un rouge, elle ne change rien', () => {
  assert.deepEqual(gardeFinale(VERT, { sha: B, lireTete: () => C, autoDeploiementActif: false }), VERT);
  const rouge = { code: SORTIE_ECHEC, etat: 'build-en-echec', motif: 'y' };
  assert.deepEqual(gardeFinale(rouge, { sha: B, lireTete: () => C, autoDeploiementActif: true }), rouge);
});

// ── Invariants ───────────────────────────────────────────────────────────────

const sansCommentaires = (texte, re) =>
  texte
    .split('\n')
    .filter((l) => !re.test(l))
    .join('\n');
const WORKFLOW = sansCommentaires(readFileSync(join(RACINE, '.github/workflows/deploiement-production.yml'), 'utf8'), /^\s*#/);
const DEPLOYEUR = sansCommentaires(readFileSync(join(ICI, 'wn-deploiement-deployer.mjs'), 'utf8'), /^\s*(\/\/|\*|\/\*\*)/);
const OBSERVATION = sansCommentaires(readFileSync(join(ICI, 'wn-deploiement-observation.mjs'), 'utf8'), /^\s*(\/\/|\*|\/\*\*)/);

/** Le bloc d'un job, jusqu'au job suivant. */
function job(nom) {
  const debut = WORKFLOW.indexOf(`\n  ${nom}:\n`);
  assert.notEqual(debut, -1, `job ${nom} introuvable`);
  const suite = WORKFLOW.slice(debut + 1).search(/\n  [a-z][\w-]*:\n/);
  return suite === -1 ? WORKFLOW.slice(debut) : WORKFLOW.slice(debut, debut + 1 + suite);
}

/** Les étapes d'un job : { nom, bloc }. L'en-tête du job (avant `steps:`) à part. */
function etapes(nom) {
  const bloc = job(nom);
  const iSteps = bloc.indexOf('\n    steps:\n');
  assert.notEqual(iSteps, -1, `${nom} : pas de steps`);
  const morceaux = bloc.slice(iSteps + '\n    steps:\n'.length).split(/\n(?=      - )/);
  return {
    entete: bloc.slice(0, iSteps),
    etapes: morceaux.map((m) => ({ nom: (m.match(/name:\s*"([^"]+)"/) ?? [])[1] ?? m.split('\n')[0].trim(), bloc: m })),
  };
}

// Revue, constat C9 : une LISTE NOIRE laissait passer `run -d` et
// `--app X deploy`. Liste BLANCHE : chaque mention de `scalingo` dans le code
// du workflow est l'une de celles-ci, et rien d'autre.
test('revue — le workflow ne mentionne scalingo que pour l’installer, le connecter et effacer sa session', () => {
  const PERMIS = [
    /scalingo-cli\.tgz/,
    /releases\/download\/1\.48\.0\/scalingo_1\.48\.0_linux_amd64\.tar\.gz/,
    /^\s*sudo install scalingo_1\.48\.0_linux_amd64\/scalingo \/usr\/local\/bin\/scalingo\s*$/,
    /^\s*scalingo --version\s*$/,
    /^\s*if ! scalingo login --api-token "\$SCALINGO_API_TOKEN"; then\s*$/,
    /^\s*run: rm -rf "\$HOME\/\.config\/scalingo"\s*$/,
  ];
  const mentions = WORKFLOW.split('\n').filter((l) => /scalingo/.test(l));
  for (const l of mentions) {
    assert.ok(PERMIS.some((re) => re.test(l)), `mention de scalingo hors liste blanche : ${l.trim()}`);
  }
});

// Revue (basse) : l'invariant ne voyait que `scalingo('…')` — un
// `lancer('scalingo', …)` ou un `execFileSync` direct passait.
test('une seule écriture Scalingo, dans le seul déployeur, sur la BRANCHE main', () => {
  assert.equal((DEPLOYEUR.match(/'scalingo'/g) ?? []).length, 1, 'un seul point d’appel du binaire scalingo');
  assert.equal((DEPLOYEUR.match(/execFileSync/g) ?? []).length, 2, 'execFileSync : l’import et `lancer`, rien d’autre');
  assert.doesNotMatch(DEPLOYEUR, /\bspawn|\bexec\(|child_process'\)\.exec\b/);
  const verbes = [...DEPLOYEUR.matchAll(/scalingo\('([^']+)'(?:,\s*'([^']+)')?/g)].map((m) => [m[1], m[2]]);
  assert.deepEqual(verbes.map(([v]) => v).sort(), ['deployments', 'integration-link-manual-deploy']);
  assert.deepEqual(verbes.find(([v]) => v === 'integration-link-manual-deploy'), ['integration-link-manual-deploy', 'main']);
  // L'observation, elle, ne fait que lire.
  assert.equal((OBSERVATION.match(/'scalingo'/g) ?? []).length, 1);
  assert.match(OBSERVATION, /lancer\('scalingo',\s*\['--app', app, '--region', region, 'deployments'\]\)/);
});

// La garde finale n'existe que si le câblage l'APPLIQUE : testée seule, elle
// resterait verte même débranchée de `principal()`. Le code de sortie doit
// être celui du verdict GARDÉ, pas celui du noyau.
test('le câblage CLI applique la garde finale au verdict, et sort sur le verdict gardé', () => {
  const principal = DEPLOYEUR.slice(DEPLOYEUR.indexOf('async function principal('));
  assert.match(principal, /const brut = await deployer\(\{/);
  assert.match(principal, /const verdict = gardeFinale\(brut, \{ sha, lireTete \}\);/);
  assert.match(principal, /return verdict\.code;/);
  assert.doesNotMatch(principal, /return brut\.code/);
});

// Lot 3 : le déploiement part sur la fin VERTE du CI d'un PUSH sur `main` de
// CE dépôt — la porte que Scalingo tenait en attendant tous les checks —, ou à
// la main. Jamais sur `push` (avant le CI), jamais sur `pull_request`, et le
// `if:` exclut le CI d'une PR, fork compris (même nom de branche possible).
test('lot 3 : déploiement sur CI vert d’un push sur main de ce dépôt, ou à la main — rien d’autre', () => {
  const on = WORKFLOW.slice(WORKFLOW.indexOf('\non:'), WORKFLOW.indexOf('\npermissions:'));
  assert.doesNotMatch(on, /^\s+push:/m, 'un push déploierait AVANT le CI');
  assert.doesNotMatch(on, /pull_request/);
  assert.match(on, /^\s+workflow_run:\n\s+workflows: \[CI\]\n\s+types: \[completed\]\n\s+branches: \[main\]\s*$/m);
  assert.match(
    job('deploiement'),
    /^\s+if: github\.ref == 'refs\/heads\/main' && \(\(github\.event_name == 'workflow_run' && github\.event\.workflow_run\.conclusion == 'success' && github\.event\.workflow_run\.event == 'push' && github\.event\.workflow_run\.head_branch == 'main' && github\.event\.workflow_run\.head_repository\.full_name == github\.repository\) \|\| \(github\.event_name == 'workflow_dispatch' && inputs\.action == 'deployer'\)\)\s*$/m,
  );
});

// La garde finale et le déclencheur automatique basculent ENSEMBLE : un
// déclencheur automatique avec la garde active ferait rougir chaque run dépassé
// sans raison ; la garde coupée avec l'auto-déploiement Scalingo encore actif
// rouvrirait l'incident 1. Le lot 3 passe les deux, et `--no-auto-deploy`
// (geste du responsable) doit précéder son merge.
test('le drapeau AUTO_DEPLOIEMENT_ACTIF et l’absence de déclencheur automatique vont ensemble', () => {
  const on = WORKFLOW.slice(WORKFLOW.indexOf('\non:'), WORKFLOW.indexOf('\npermissions:'));
  assert.equal(AUTO_DEPLOIEMENT_ACTIF, !/^\s+workflow_run:/m.test(on));
});

// Sur `workflow_run`, GITHUB_SHA est la tête de la branche par défaut au
// moment du run, pas le commit que le CI a vérifié. Le script doit juger
// WN_SHA (workflow_run.head_sha) d'abord — sinon il déploierait un commit non
// vérifié en le croyant vérifié.
// Revue #1222 : sans `ref`, un workflow_run extrait la tête de main AU MOMENT
// du run — des scripts non vérifiés tourneraient avec le jeton.
test('revue #1222 — le checkout du déployeur est épinglé sur le commit vérifié', () => {
  const checkout = etapes('deploiement').etapes.find((e) => /uses: actions\/checkout@/.test(e.bloc));
  assert.ok(checkout, 'checkout introuvable');
  assert.match(checkout.bloc, /^\s+ref: \$\{\{ github\.event\.workflow_run\.head_sha \|\| github\.sha \}\}\s*$/m);
});

test('lot 3 : le déployeur juge le commit VÉRIFIÉ par le CI (WN_SHA), sans repli sur workflow_run', () => {
  const principal = DEPLOYEUR.slice(DEPLOYEUR.indexOf('async function principal('));
  assert.match(principal, /const sha = env\.GITHUB_EVENT_NAME === 'workflow_run' \? env\.WN_SHA : env\.WN_SHA \|\| env\.GITHUB_SHA;/);
  // Et le workflow le lui passe (revue C6) : sans ces deux lignes, rien.
  const etape = etapes('deploiement').etapes.find((e) => e.nom.startsWith('Déploiement — la tête'));
  assert.ok(etape, 'étape de déploiement introuvable');
  assert.match(etape.bloc, /^\s+WN_SHA: \$\{\{ github\.event\.workflow_run\.head_sha \|\| github\.sha \}\}\s*$/m);
  assert.match(etape.bloc, /^\s+GH_TOKEN: \$\{\{ github\.token \}\}\s*$/m);
});

// La retenue des commits de migration n'existe que si le câblage lui donne de
// quoi lire. Débranchée, le noyau n'a pas de valeur par défaut : il plante.
test('lot 3 : le câblage transmet la lecture des runs release-db, et le noyau n’a pas de repli', async () => {
  const principal = DEPLOYEUR.slice(DEPLOYEUR.indexOf('async function principal('));
  assert.match(principal, /^\s+lireRunsReleaseDb: \(commit\) => \{$/m);
  assert.match(principal, /^\s+lireEtapesReleaseDb: \(id\) =>$/m);
  assert.match(principal, /^\s+lireCi: \(commit\) =>$/m);
  assert.match(principal, /^\s+dernierCommitReleaseDb: \(commit\) =>$/m);
  assert.match(principal, /lancer\('git', \['log', '-1', '--first-parent', '--format=%H', commit, '--', \.\.\.CHEMINS_RELEASE_DB\]\)/);
  // La borne basse de la fenêtre de runs est la date du commit porteur, en
  // UTC et avec marge : une date locale courte exclurait le run d'un push de
  // fin de soirée.
  assert.match(principal, /lancer\('git', \['show', '-s', '--format=%ct', commit\]\)/);
  assert.match(principal, /new Date\(\(secondes - 3600\) \* 1000\)\.toISOString\(\)/);
  // Toutes les pages, pas la première : `--slurp` rend un tableau de pages.
  assert.match(principal, /\.flatMap\(\(page\) => page\.workflow_runs\)/);
  assert.match(principal, /\.jobs\.flatMap\(\(j\) => j\.steps \?\? \[\]\)/);
  const mondes = [];
  const sans = async (nom, tetes) => {
    const m = monde({ tetes, lectures: [tableau(EN_SERVICE_A)] });
    mondes.push(m);
    const deps = { ...m.deps, dernierCommitReleaseDb: () => B, lireRunsReleaseDb: () => [run(B, 'completed', 'failure')] };
    delete deps[nom];
    await assert.rejects(() => deployer({ sha: B, ...deps }), nom);
  };
  await sans('lireRunsReleaseDb', [B]);
  await sans('lireEtapesReleaseDb', [B]);
  await sans('dernierCommitReleaseDb', [B]);
  await sans('lireCi', [C]);
  assert.equal(mondes.reduce((n, m) => n + m.appels.declencher, 0), 0);
});

// Les seuls appels à l'API GitHub du déployeur : LIRE les runs CI d'un commit,
// les runs release-db depuis une date, et les étapes d'un run. Aucun verbe
// d'écriture, aucun autre chemin.
test('lot 3 : l’API GitHub n’est que lue, et seulement pour les runs CI, les runs release-db et leurs étapes', () => {
  const appels = [...DEPLOYEUR.matchAll(/lancer\('gh',\s*\[([^\]]*)\]/g)].map((m) => m[1]).sort();
  assert.deepEqual(
    appels,
    [
      "'api', '--paginate', '--slurp', `repos/${env.GITHUB_REPOSITORY}/actions/workflows/release-db.yml/runs?created=>=${depuis}&per_page=100`",
      "'api', `repos/${env.GITHUB_REPOSITORY}/actions/runs/${id}/jobs?per_page=100`",
      "'api', `repos/${env.GITHUB_REPOSITORY}/actions/workflows/ci.yml/runs?head_sha=${commit}&event=push&per_page=100`",
    ].sort(),
  );
  assert.doesNotMatch(DEPLOYEUR, /--method|'-X'|'-f'|'--field'|'-F'/);
  const perms = job('deploiement').match(/^    permissions:\n((?:      \w+: \w+\n)+)/m)?.[1] ?? '';
  assert.deepEqual(perms.trim().split('\n').map((l) => l.trim()).sort(), ['actions: read', 'contents: read']);
});

test('les deux jobs : main seule, environnement dédié, session effacée en dernier', () => {
  for (const nom of ['observation', 'deploiement']) {
    const bloc = job(nom);
    assert.match(bloc, /^\s+if: github\.ref == 'refs\/heads\/main' &&/m, `${nom} : main seule`);
    assert.match(bloc, /^\s+environment: deploy-production\s*$/m, `${nom} : environnement dédié`);
    const derniere = etapes(nom).etapes.at(-1);
    assert.equal(derniere.nom, 'Effacer la session du CLI', `${nom} : la session est effacée en dernier`);
    assert.match(derniere.bloc, /^\s+if: always\(\)\s*$/m);
  }
  assert.doesNotMatch(WORKFLOW, /:\s*write\b|write-all/, 'aucune permission d’écriture GitHub');
});

test('concurrence : par job, le déploiement sérialisé et jamais annulé', () => {
  const tete = WORKFLOW.slice(0, WORKFLOW.indexOf('\njobs:'));
  assert.doesNotMatch(tete, /^concurrency:/m, 'une concurrence de WORKFLOW ferait annuler un déploiement par le cron');
  const dep = job('deploiement');
  assert.match(dep, /^\s+group: deploiement-production\s*$/m);
  assert.match(dep, /^\s+cancel-in-progress: false\s*$/m);
  assert.doesNotMatch(job('observation'), /^\s+group: deploiement-production\s*$/m);
});

// Revue (basse) : le test ne lisait que la ligne `run:`, pas le corps d'un
// `run: |`. Désormais, toute expression `${{ }}` du job est l'une des deux
// permises, et elle est dans un `env:`.
test('aucune expression ${{ }} dans le job de déploiement hors des `env:` permis', () => {
  const PERMISES = [
    /^\s+WN_FORCER: \$\{\{ inputs\.forcer \}\}\s*$/,
    /^\s+SCALINGO_API_TOKEN: \$\{\{ secrets\.SCALINGO_API_TOKEN \}\}\s*$/,
    /^\s+WN_SHA: \$\{\{ github\.event\.workflow_run\.head_sha \|\| github\.sha \}\}\s*$/,
    /^\s+GH_TOKEN: \$\{\{ github\.token \}\}\s*$/,
    /^\s+ref: \$\{\{ github\.event\.workflow_run\.head_sha \|\| github\.sha \}\}\s*$/,
  ];
  for (const l of job('deploiement').split('\n').filter((x) => x.includes('${{'))) {
    assert.ok(PERMISES.some((re) => re.test(l)), `expression non permise : ${l.trim()}`);
  }
  assert.match(job('deploiement'), /node scripts\/wn-deploiement-deployer\.mjs/);
});

// Revue, constat C8 : on COMPTAIT les citations du jeton. Déplacé dans l'`env:`
// du job, il restait compté deux fois — et visible de toutes les étapes.
test('revue — le jeton n’est cité QUE par la garde et le login, jamais au niveau du job ni du workflow', () => {
  const tete = WORKFLOW.slice(0, WORKFLOW.indexOf('\njobs:'));
  assert.doesNotMatch(tete, /SCALINGO_API_TOKEN/);
  for (const nom of ['observation', 'deploiement']) {
    const { entete, etapes: liste } = etapes(nom);
    assert.doesNotMatch(entete, /SCALINGO_API_TOKEN/, `${nom} : pas dans l’env du job`);
    const porteuses = liste.filter((e) => /secrets\.SCALINGO_API_TOKEN/.test(e.bloc)).map((e) => e.nom);
    assert.deepEqual(porteuses, ['Garde — SCALINGO_API_TOKEN requis (fail-closed)', 'Authentification du CLI (login par jeton)'], nom);
  }
  assert.doesNotMatch(WORKFLOW, /secrets\s*\[|toJSON\s*\(\s*secrets/);
});
