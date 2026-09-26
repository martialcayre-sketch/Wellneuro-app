// Bancs des contrôles rejoués avant envoi (lot 5 de D-251), avec un serveur
// SIMULÉ. Le branchement sur les vrais modules de web/src est éprouvé par
// chargement-web.test.mjs.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clesCitees, controlerBrouillon } from './controles.mjs';

const CONTENU = {
  titre: 't',
  precautions: [{ texte: 'p', claims: ['WN-CL-0285-002::v1.0'] }],
  sections: [{ titre: 's', blocs: [{ texte: 'b', provenance: { type: 'claims', claims: ['WN-CL-0297-001::v1.0'] } }] }],
};
const BROUILLON = { sourceId: 'WN-SRC-0297', texteSource: 'source', contenu: CONTENU };
const CLAIMS = new Map([
  ['WN-CL-0285-002::v1.0', { sourceId: 'WN-SRC-0285', texte: 'réserve' }],
  ['WN-CL-0297-001::v1.0', { sourceId: 'WN-SRC-0297', texte: 'claim de fiche' }],
]);

test('clesCitees réunit précautions et blocs, sans doublon', () => {
  assert.deepEqual(clesCitees(CONTENU), ['WN-CL-0285-002::v1.0', 'WN-CL-0297-001::v1.0']);
});

test('une faute de contrat arrête tout, sous le code « contrat »', () => {
  const serveur = {
    lireBrouillonFiche: () => {
      throw new Error('Champ refusé : « acte ».');
    },
    controlerFiche: () => assert.fail('les contrôles ne tournent pas sur un brouillon hors contrat'),
  };
  const r = controlerBrouillon(serveur, BROUILLON, CLAIMS, []);
  assert.equal(r.lu, null);
  assert.deepEqual(r.anomalies.map(a => a.code), ['contrat']);
});

test('les contrôles reçoivent le brouillon REBÂTI, les textes des claims cités et les réserves attendues', () => {
  let recu;
  const serveur = {
    lireBrouillonFiche: b => ({ ...b, rebati: true }),
    controlerFiche: entrees => {
      recu = entrees;
      return [];
    },
  };
  const r = controlerBrouillon(serveur, BROUILLON, CLAIMS, ['WN-CL-0285-002::v1.0']);
  assert.equal(r.lu.rebati, true);
  assert.deepEqual(r.anomalies, []);
  assert.deepEqual(recu.textesClaimsCites.sort(), ['claim de fiche', 'réserve']);
  assert.deepEqual(recu.clesSecuriteAttendues, ['WN-CL-0285-002::v1.0']);
  assert.equal(recu.sourceIdFiche, 'WN-SRC-0297');
});

test('un claim cité absent de l’instantané local est une anomalie', () => {
  const serveur = { lireBrouillonFiche: b => b, controlerFiche: () => [] };
  const r = controlerBrouillon(serveur, BROUILLON, new Map([...CLAIMS].slice(0, 1)), []);
  assert.deepEqual(r.anomalies.map(a => a.code), ['claim_absent_de_l_instantane']);
});
