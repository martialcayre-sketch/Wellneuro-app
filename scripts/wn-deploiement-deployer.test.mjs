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
// rougit si le défaut qu'elle a confirmé revient.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  deployer,
  gardeFinale,
  classerCi,
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
      lireCi: () => 'success',
    },
  };
}

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
    lireRunsReleaseDb: (x) => (x === C ? [{ status: 'waiting', conclusion: null }] : []),
  });
  assert.equal(v.etat, 'retenu-release-db');
  assert.equal(m.appels.declencher, 0);
});

test('revue lot 3 — la branche livre un commit plus neuf NON vérifié : rouge', async () => {
  for (const [ci, runs] of [
    ['en-cours', []],
    ['success', [{ status: 'waiting', conclusion: null }]],
  ]) {
    const m = monde({
      tetes: [B, B, C],
      lectures: [tableau(EN_SERVICE_A), tableau(ligne('dep-c', '2026/09/25 11:00:00', '5m0s', C), EN_SERVICE_A)],
    });
    const v = await deployer({
      sha: B,
      ...m.deps,
      lireCi: (x) => (x === C ? ci : 'success'),
      lireRunsReleaseDb: (x) => (x === C ? runs : []),
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

// Les deux bornes d'attente (avant ET après l'écriture) doivent tenir dans le
// timeout du job, installation comprise.
test('revue #1220 — le timeout du job couvre les deux attentes cumulées', () => {
  const minutes = Number(job('deploiement').match(/^\s+timeout-minutes:\s*(\d+)\s*$/m)?.[1]);
  const attentes = (2 * ESSAIS_DEFAUT * INTERVALLE_MS_DEFAUT) / 60000;
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

// ── Lot 3 : un commit porteur d'un run release-db attend l'approbation ─────

test('lot 3 — un run release-db EN ATTENTE retient le commit : vert, AUCUNE écriture', async () => {
  const m = monde({ tetes: [B], lectures: [tableau(EN_SERVICE_A)] });
  const v = await deployer({ sha: B, ...m.deps, lireRunsReleaseDb: () => [{ status: 'waiting', conclusion: null }] });
  assert.equal(v.code, SORTIE_OK);
  assert.equal(v.etat, 'retenu-release-db');
  assert.equal(m.appels.declencher, 0);
});

test('lot 3 — un run release-db REJETÉ retient aussi le commit, comme le faisait Scalingo', async () => {
  const m = monde({ tetes: [B], lectures: [tableau(EN_SERVICE_A)] });
  const v = await deployer({ sha: B, ...m.deps, lireRunsReleaseDb: () => [{ status: 'completed', conclusion: 'failure' }] });
  assert.equal(v.etat, 'retenu-release-db');
  assert.equal(m.appels.declencher, 0);
});

test('lot 3 — un run release-db RÉUSSI, ou aucun run : le déploiement suit son cours', async () => {
  for (const runs of [[{ status: 'completed', conclusion: 'success' }], []]) {
    const m = monde({
      tetes: [B],
      lectures: [tableau(EN_SERVICE_A), tableau(ligne('dep-b', '2026/09/25 11:00:00', '5m0s', B), EN_SERVICE_A)],
    });
    const v = await deployer({ sha: B, ...m.deps, lireRunsReleaseDb: () => runs });
    assert.equal(v.etat, 'deploye', JSON.stringify(runs));
  }
});

test('lot 3 — les runs release-db illisibles : aucune écriture', async () => {
  const m = monde({ tetes: [B], lectures: [tableau(EN_SERVICE_A)] });
  await assert.rejects(() =>
    deployer({
      sha: B,
      ...m.deps,
      lireRunsReleaseDb: () => {
        throw new Error('api 502');
      },
    }),
  );
  assert.equal(m.appels.declencher, 0);
});

test('lot 3 — un run dépassé dont la tête n’a pas fini son CI n’interroge même pas release-db', async () => {
  let lu = false;
  const m = monde({ tetes: [C], lectures: [tableau(EN_SERVICE_A)] });
  const v = await deployer({
    sha: B,
    ...m.deps,
    lireCi: () => 'en-cours',
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
  assert.match(principal, /^\s+lireRunsReleaseDb: \(commit\) =>$/m);
  assert.match(principal, /^\s+lireCi: \(commit\) =>$/m);
  const m = monde({ tetes: [B], lectures: [tableau(EN_SERVICE_A)] });
  const { lireRunsReleaseDb, ...sansLecture } = m.deps;
  await assert.rejects(() => deployer({ sha: B, ...sansLecture }));
  const m2 = monde({ tetes: [C], lectures: [tableau(EN_SERVICE_A)] });
  const { lireCi, ...sansCi } = m2.deps;
  await assert.rejects(() => deployer({ sha: B, ...sansCi }));
  assert.equal(m.appels.declencher + m2.appels.declencher, 0);
});

// Le seul appel à l'API GitHub du déployeur : LIRE les runs release-db du
// commit. Aucun verbe d'écriture, aucun autre chemin.
test('lot 3 : l’API GitHub n’est que lue, et seulement pour les runs CI et release-db', () => {
  const appels = [...DEPLOYEUR.matchAll(/lancer\('gh',\s*\[([^\]]*)\]/g)].map((m) => m[1]).sort();
  assert.deepEqual(appels, [
    "'api', `repos/${env.GITHUB_REPOSITORY}/actions/workflows/ci.yml/runs?head_sha=${commit}&event=push&per_page=100`",
    "'api', `repos/${env.GITHUB_REPOSITORY}/actions/workflows/release-db.yml/runs?head_sha=${commit}&per_page=100`",
  ]);
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
