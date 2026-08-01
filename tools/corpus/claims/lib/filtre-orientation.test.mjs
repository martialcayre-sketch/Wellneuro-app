import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exclureDeLOrientation } from './filtre-orientation.mjs';

test('une notice en quarantaine est exclue, quel que soit son domaine', () => {
  const { exclu, motif } = exclureDeLOrientation({
    sourceId: 'WN-SRC-0318',
    lifecycleStatus: 'quarantined',
  });
  assert.equal(exclu, true);
  assert.match(motif, /quarantaine/);
});

test('la perfusion (WN-SRC-0244) est exclue par A-009 amendé', () => {
  const { exclu, motif } = exclureDeLOrientation({
    sourceId: 'WN-SRC-0244',
    lifecycleStatus: 'quarantined',
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
  });
  assert.equal(exclu, false);
  assert.equal(motif, null);
});

test('WN-SRC-0370 (sevrage, réintégré par la décision f) passe', () => {
  const { exclu } = exclureDeLOrientation({
    sourceId: 'WN-SRC-0370',
    lifecycleStatus: 'raw',
  });
  assert.equal(exclu, false);
});
