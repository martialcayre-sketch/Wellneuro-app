// Banc de `scripts/lib/gh-rest.mjs` : les lectures REST qui remplacent
// `gh pr …` (GraphQL refusé en cloud, `D-540`, constat du 2026-11-20), et
// leur effet sur les verdicts des scripts qui les consomment.

import test from 'node:test';
import assert from 'node:assert/strict';

import { aplatirPages, brancheSure, cheminPrs, estMergee, rollupDepuisRest, versPrGraphql } from './gh-rest.mjs';
import { diagnostiquer, SORTIE_ECHEC, SORTIE_INDETERMINE, SORTIE_NON_FUSIONNABLE, SORTIE_VERT } from '../wn-attendre-ci.mjs';
import { evenementMerge } from '../wn-guetteur.mjs';

const SHA = 'f5faea66f7cb3422eb33ff31097983fb62d898ab';
const prRest = (extra = {}) => ({
  number: 2178,
  title: 'banc',
  draft: false,
  state: 'open',
  merged_at: null,
  closed_at: null,
  merge_commit_sha: 'abc1234',
  updated_at: '2026-11-20T10:00:00Z',
  mergeable: true,
  mergeable_state: 'clean',
  head: { sha: SHA, ref: 'docs/banc' },
  base: { ref: 'main' },
  ...extra,
});

test('cheminPrs : état, tête filtrée sur le propriétaire, branche refusée hors alphabet', () => {
  assert.equal(cheminPrs({ etat: 'open' }), 'repos/{owner}/{repo}/pulls?state=open&per_page=100');
  assert.equal(
    cheminPrs({ etat: 'closed', tete: 'docs/x-1.2' }),
    'repos/{owner}/{repo}/pulls?state=closed&per_page=100&head={owner}:docs/x-1.2',
  );
  assert.throws(() => cheminPrs({ etat: 'merged' }));
  assert.throws(() => cheminPrs({ etat: 'open', tete: 'a&state=closed' }));
  assert.equal(brancheSure('a..b'), false);
  assert.equal(brancheSure(''), false);
  assert.equal(brancheSure('fix/ok_1'), true);
});

test('aplatirPages : pages de tableaux aplaties ; toute autre forme rend null, jamais []', () => {
  assert.deepEqual(aplatirPages([[1, 2], [3]]), [1, 2, 3]);
  assert.deepEqual(aplatirPages([[]]), []);
  assert.equal(aplatirPages(null), null);
  assert.equal(aplatirPages({ message: 'Forbidden' }), null);
  assert.equal(aplatirPages([{ check_runs: [] }]), null);
});

test('versPrGraphql : état, fusionnabilité et commit de merge', () => {
  const ouverte = versPrGraphql(prRest());
  assert.equal(ouverte.state, 'OPEN');
  assert.equal(ouverte.mergeable, 'MERGEABLE');
  assert.equal(ouverte.mergeStateStatus, 'CLEAN');
  assert.equal(ouverte.headRefOid, SHA);
  // `wn-attendre-ci` compare ce nom à la branche locale (tête attendue) : s'il
  // disparaissait, le garde se désarmerait en silence.
  assert.equal(ouverte.headRefName, 'docs/banc');
  assert.equal(ouverte.baseRefName, 'main');
  assert.equal(ouverte.mergeCommit, null, 'merge_commit_sha d’une PR ouverte est un essai de fusion, pas un merge');

  const conflit = versPrGraphql(prRest({ mergeable: false, mergeable_state: 'dirty' }));
  assert.equal(conflit.mergeable, 'CONFLICTING');
  assert.equal(conflit.mergeStateStatus, 'DIRTY');
  assert.equal(versPrGraphql(prRest({ mergeable: null, mergeable_state: undefined })).mergeable, 'UNKNOWN');

  const mergee = versPrGraphql(prRest({ state: 'closed', merged_at: '2026-11-19T00:19:00Z', closed_at: '2026-11-19T00:19:00Z' }));
  assert.equal(mergee.state, 'MERGED');
  assert.deepEqual(mergee.mergeCommit, { oid: 'abc1234' });
  assert.equal(estMergee(prRest({ state: 'closed', merged_at: '2026-11-19T00:19:00Z' })), true);
  assert.equal(versPrGraphql(prRest({ state: 'closed' })).state, 'CLOSED');
  assert.equal(versPrGraphql({ message: 'Not Found' }), null);

  // Origine de la tête (`D-546` §2) : jamais « même dépôt » par défaut.
  const depot = (nom, login) => ({ full_name: nom, owner: { login } });
  const meme = versPrGraphql(prRest({ head: { sha: SHA, ref: 'x', repo: depot('p/d', 'p') }, base: { ref: 'main', repo: depot('p/d', 'p') } }));
  assert.deepEqual([meme.isCrossRepository, meme.headRepositoryOwner], [false, { login: 'p' }]);
  const fourche = versPrGraphql(prRest({ head: { sha: SHA, ref: 'x', repo: depot('t/d', 't') }, base: { ref: 'main', repo: depot('p/d', 'p') } }));
  assert.deepEqual([fourche.isCrossRepository, fourche.headRepositoryOwner], [true, { login: 't' }]);
  const supprimee = versPrGraphql(prRest({ head: { sha: SHA, ref: 'x', repo: null }, base: { ref: 'main', repo: depot('p/d', 'p') } }));
  assert.deepEqual([supprimee.isCrossRepository, supprimee.headRepositoryOwner], [null, null]);
});

test('guetteur : la sonde merge lit l’état REST converti', () => {
  assert.equal(evenementMerge('2178', versPrGraphql(prRest())), null);
  assert.equal(
    evenementMerge('2178', versPrGraphql(prRest({ state: 'closed', merged_at: '2026-11-19T00:19:00Z' }))),
    'MERGEE pr=2178 commit=abc1234 le=2026-11-19T00:19:00Z',
  );
  assert.equal(
    evenementMerge('2178', versPrGraphql(prRest({ state: 'closed', closed_at: '2026-11-19T01:00:00Z' }))),
    'FERMEE-SANS-MERGE pr=2178 le=2026-11-19T01:00:00Z',
  );
});

const checkRuns = (...runs) => [{ total_count: runs.length, check_runs: runs }];
const statuts = (...s) => [{ state: s.length ? 'success' : 'pending', statuses: s }];

test('rollupDepuisRest : check-runs et statuts gardent les deux formes de normaliserCheck', () => {
  const rollup = rollupDepuisRest(
    checkRuns({ name: 'verify', status: 'completed', conclusion: 'success' }),
    statuts({ context: 'Vercel', state: 'pending' }),
  );
  assert.deepEqual(rollup, [
    { __typename: 'CheckRun', name: 'verify', status: 'completed', conclusion: 'success' },
    { __typename: 'StatusContext', context: 'Vercel', state: 'pending' },
  ]);
  assert.equal(rollupDepuisRest(null, statuts()), null, 'check-runs illisibles : rollup illisible');
  assert.equal(rollupDepuisRest(checkRuns(), [{ message: 'Forbidden' }]), null, 'statuts illisibles : rollup illisible');
});

function faits(pr, rollup) {
  const vue = versPrGraphql(pr);
  return {
    contextesRequis: ['verify'],
    pr: { numero: vue.number, etat: vue.state, mergeable: vue.mergeable, mergeStateStatus: vue.mergeStateStatus, base: vue.baseRefName, headRefOid: vue.headRefOid },
    rollup,
    delaiDepasse: false,
  };
}

test('attendre-ci sur des faits REST : vert, échec, conflit, PR fermée', () => {
  const vert = rollupDepuisRest(checkRuns({ name: 'verify', status: 'completed', conclusion: 'success' }), statuts());
  assert.equal(diagnostiquer(faits(prRest(), vert)).sortie, SORTIE_VERT);

  const rouge = rollupDepuisRest(checkRuns({ name: 'verify', status: 'completed', conclusion: 'failure' }), statuts());
  assert.equal(diagnostiquer(faits(prRest(), rouge)).sortie, SORTIE_ECHEC);

  assert.equal(diagnostiquer(faits(prRest({ mergeable: false, mergeable_state: 'dirty' }), vert)).sortie, SORTIE_NON_FUSIONNABLE);

  assert.equal(diagnostiquer(faits(prRest({ state: 'closed', merged_at: '2026-11-19T00:19:00Z' }), vert)).sortie, SORTIE_INDETERMINE);

  // `mergeable` pas encore calculé, mais état de fusion `dirty` : non fusionnable.
  assert.equal(diagnostiquer(faits(prRest({ mergeable: null, mergeable_state: 'dirty' }), vert)).sortie, SORTIE_NON_FUSIONNABLE);

  // Statuts sur deux pages, dont un contexte obligatoire en `error`.
  const statutErreur = rollupDepuisRest(
    checkRuns({ name: 'autre', status: 'completed', conclusion: 'success' }),
    [{ statuses: [{ context: 'Vercel', state: 'success' }] }, { statuses: [{ context: 'verify', state: 'error' }] }],
  );
  assert.equal(diagnostiquer(faits(prRest(), statutErreur)).sortie, SORTIE_ECHEC);

  const enCours = rollupDepuisRest(checkRuns({ name: 'verify', status: 'in_progress', conclusion: null }), statuts());
  assert.equal(diagnostiquer(faits(prRest(), enCours)).attendre, true);
});
