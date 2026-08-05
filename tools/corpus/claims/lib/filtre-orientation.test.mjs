import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exclureDeLOrientation } from './filtre-orientation.mjs';

test('une notice en quarantaine non prescriptive reste exclue', () => {
  const { exclu, motif } = exclureDeLOrientation({
    sourceId: 'WN-SRC-0090',
    lifecycleStatus: 'quarantined',
    prescriptive: false,
  });
  assert.equal(exclu, true);
  assert.match(motif, /quarantaine/);
});

test('la perfusion (WN-SRC-0244) est exclue par A-009 amendé', () => {
  const { exclu, motif } = exclureDeLOrientation({
    sourceId: 'WN-SRC-0244',
    lifecycleStatus: 'quarantined',
    prescriptive: true,
  });
  assert.equal(exclu, true);
  // La quarantaine prime dans le motif, mais même sans elle la perfusion sort.
  const sansQuarantaine = exclureDeLOrientation({ sourceId: 'WN-SRC-0244', lifecycleStatus: 'raw' });
  assert.equal(sansQuarantaine.exclu, true);
  assert.match(sansQuarantaine.motif, /perfusion/);
  assert.ok(motif);
});

test('une notice raw ordinaire passe', () => {
  const { exclu, motif } = exclureDeLOrientation({
    sourceId: 'WN-SRC-0313',
    lifecycleStatus: 'raw',
    prescriptive: false,
  });
  assert.equal(exclu, false);
  assert.equal(motif, null);
});

// La levée ne concerne que les sources prescriptives : WN-SRC-0370
// (addictions et sevrage) est réintégrée, tandis qu'une notice non
// prescriptive en quarantaine reste dehors.
test('un domaine réintégré et prescriptif passe malgré la quarantaine', () => {
  const { exclu, motif } = exclureDeLOrientation({
    sourceId: 'WN-SRC-0370',
    lifecycleStatus: 'quarantined',
    prescriptive: true,
  });
  assert.equal(exclu, false);
  assert.equal(motif, null);
});

test('la même source hors quarantaine passerait — rien n’exclut son domaine', () => {
  const { exclu } = exclureDeLOrientation({
    sourceId: 'WN-SRC-0370',
    lifecycleStatus: 'raw',
    prescriptive: true,
  });
  assert.equal(exclu, false);
});
