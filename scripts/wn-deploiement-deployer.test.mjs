// Banc de `scripts/wn-deploiement-deployer.mjs` (D-248, lot 2).
//
// Le noyau `deployer()` est joué avec des dépendances factices : une tête de
// `main` scriptée, une suite de tableaux `scalingo deployments`, un
// déclenchement qui s'enregistre, une ascendance linéaire. Aucun réseau,
// aucun `sleep` réel. Puis les invariants du workflow et des deux scripts :
// ce sont eux qui bornent un jeton plein détenu SANS approbation.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { deployer, SORTIE_OK, SORTIE_ECHEC } from './wn-deploiement-deployer.mjs';

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, '..');

const A = 'a'.repeat(40);
const B = 'b'.repeat(40);
const C = 'c'.repeat(40);
const HISTOIRE = [A, B, C];
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
 * répète). `lectures` : tableaux successifs (idem). Une entrée `Error` dans
 * `lectures` fait échouer cette lecture-là.
 */
function monde({ tetes, lectures, declencherLeve = null }) {
  const appels = { declencher: 0, dormir: 0, lireTete: 0 };
  let iT = 0;
  let iL = 0;
  return {
    appels,
    deps: {
      lireTete: () => {
        appels.lireTete += 1;
        return tetes[Math.min(iT++, tetes.length - 1)];
      },
      lireDeploiements: () => {
        const l = lectures[Math.min(iL++, lectures.length - 1)];
        if (l instanceof Error) throw l;
        return l;
      },
      declencher: () => {
        appels.declencher += 1;
        if (declencherLeve) throw declencherLeve;
      },
      estAncetre,
      dormir: async () => {
        appels.dormir += 1;
      },
      essais: 5,
      intervalleMs: 1,
    },
  };
}

test('ce run n’est plus la tête : abstention verte, AUCUN déclenchement', async () => {
  const m = monde({ tetes: [C], lectures: [tableau(EN_SERVICE_A)] });
  const v = await deployer({ sha: B, ...m.deps });
  assert.equal(v.code, SORTIE_OK);
  assert.equal(v.etat, 'depasse');
  assert.equal(m.appels.declencher, 0);
});

test('la tête bouge ENTRE la lecture et l’écriture : abstention, aucun déclenchement', async () => {
  const m = monde({ tetes: [B, C], lectures: [tableau(EN_SERVICE_A)] });
  const v = await deployer({ sha: B, ...m.deps });
  assert.equal(v.etat, 'depasse');
  assert.equal(m.appels.declencher, 0);
});

test('déjà en service : abstention verte, sauf à forcer', async () => {
  const m = monde({ tetes: [A], lectures: [tableau(EN_SERVICE_A)] });
  const v = await deployer({ sha: A, ...m.deps });
  assert.equal(v.etat, 'deja-en-service');
  assert.equal(m.appels.declencher, 0);
});

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

test('succès du build mais recul constaté ensuite : rouge', async () => {
  // C a été mis en service (auto-déploiement encore actif au lot 2), puis le
  // déploiement de B, parti avant, finit APRÈS : B en service, C retiré.
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

// ── Invariants ───────────────────────────────────────────────────────────────

const sansCommentaires = (texte, re) =>
  texte
    .split('\n')
    .filter((l) => !re.test(l))
    .join('\n');
const WORKFLOW = sansCommentaires(readFileSync(join(RACINE, '.github/workflows/deploiement-production.yml'), 'utf8'), /^\s*#/);
const DEPLOYEUR = sansCommentaires(readFileSync(join(ICI, 'wn-deploiement-deployer.mjs'), 'utf8'), /^\s*\/\//);
const OBSERVATION = sansCommentaires(readFileSync(join(ICI, 'wn-deploiement-observation.mjs'), 'utf8'), /^\s*\/\//);

/** Le bloc d'un job, jusqu'au job suivant. */
function job(nom) {
  const debut = WORKFLOW.indexOf(`\n  ${nom}:\n`);
  assert.notEqual(debut, -1, `job ${nom} introuvable`);
  const suite = WORKFLOW.slice(debut + 1).search(/\n  [a-z][\w-]*:\n/);
  return suite === -1 ? WORKFLOW.slice(debut) : WORKFLOW.slice(debut, debut + 1 + suite);
}

test('une seule écriture Scalingo, dans le seul déployeur, sur la BRANCHE main', () => {
  const verbes = [...DEPLOYEUR.matchAll(/scalingo\('([^']+)'(?:,\s*'([^']+)')?/g)].map((m) => [m[1], m[2]]);
  assert.deepEqual(
    verbes.map(([v]) => v).sort(),
    ['deployments', 'integration-link-manual-deploy'],
    'le déployeur ne parle à Scalingo que pour lire la liste et déclencher',
  );
  assert.deepEqual(
    verbes.find(([v]) => v === 'integration-link-manual-deploy'),
    ['integration-link-manual-deploy', 'main'],
    'le déclenchement vise la branche main, jamais un SHA ni une autre ref',
  );
  // L'observation, elle, ne fait que lire.
  const appelsObs = [...OBSERVATION.matchAll(/lancer\('scalingo',\s*\[([^\]]*)\]/g)].map((m) => m[1]);
  assert.equal(appelsObs.length, 1);
  assert.match(appelsObs[0], /'deployments'\s*$/);
});

test('le workflow ne contient aucune commande Scalingo d’écriture en ligne', () => {
  assert.doesNotMatch(
    WORKFLOW,
    /manual-deploy|scalingo deploy|\brun\s+--detached|one-off|rollback|env-set|env-unset|integration-link-update|restart|scale\b/,
  );
});

test('lot 2 : le déploiement ne part QUE sur dispatch — aucun déclencheur push', () => {
  const on = WORKFLOW.slice(WORKFLOW.indexOf('\non:'), WORKFLOW.indexOf('\npermissions:'));
  assert.doesNotMatch(on, /^\s+push:/m, 'le push arrive avec la bascule du lot 3, pas avant');
  assert.doesNotMatch(on, /pull_request/);
  assert.match(
    job('deploiement'),
    /^\s+if: github\.ref == 'refs\/heads\/main' && github\.event_name == 'workflow_dispatch' && inputs\.action == 'deployer'\s*$/m,
  );
});

test('les deux jobs : main seule, environnement dédié', () => {
  for (const nom of ['observation', 'deploiement']) {
    const bloc = job(nom);
    assert.match(bloc, /^\s+if: github\.ref == 'refs\/heads\/main' &&/m, `${nom} : main seule`);
    assert.match(bloc, /^\s+environment: deploy-production\s*$/m, `${nom} : environnement dédié`);
  }
  assert.doesNotMatch(WORKFLOW, /:\s*write\b|write-all/, 'aucune permission d’écriture GitHub');
});

test('concurrence : par job, le déploiement sérialisé et jamais annulé', () => {
  const tete = WORKFLOW.slice(0, WORKFLOW.indexOf('\njobs:'));
  assert.doesNotMatch(tete, /^concurrency:/m, 'une concurrence de WORKFLOW ferait annuler un déploiement par le cron');
  const dep = job('deploiement');
  assert.match(dep, /^\s+group: deploiement-production\s*$/m);
  assert.match(dep, /^\s+cancel-in-progress: false\s*$/m);
  assert.doesNotMatch(job('observation'), /^\s+group: deploiement-production\s*$/m, 'l’observation ne partage pas le groupe du déploiement');
});

test('`forcer` passe par l’environnement, jamais interpolé dans un script', () => {
  const dep = job('deploiement');
  assert.match(dep, /^\s+WN_FORCER: \$\{\{ inputs\.forcer \}\}\s*$/m);
  assert.doesNotMatch(dep, /run:[^\n]*\$\{\{/, 'aucune expression ${{ }} dans une ligne run:');
  assert.match(dep, /node scripts\/wn-deploiement-deployer\.mjs/);
});

test('le jeton n’est visible que de la garde et du login, dans chaque job', () => {
  for (const nom of ['observation', 'deploiement']) {
    const citations = job(nom).match(/secrets\.SCALINGO_API_TOKEN/g) ?? [];
    assert.equal(citations.length, 2, `${nom} : deux citations du jeton exactement`);
  }
  assert.doesNotMatch(WORKFLOW, /secrets\s*\[|toJSON\s*\(\s*secrets/);
});
