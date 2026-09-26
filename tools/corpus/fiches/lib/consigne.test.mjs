// Garde de la consigne versionnée (lot 5 de D-251) : toute modification d'un
// octet des consignes impose un bump de version, sans quoi deux brouillons
// écrits sous deux consignes différentes porteraient la même version en base.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { consignesVerifiees, EMPREINTE_ATTENDUE, empreinteConsignes, lireConsignes, VERSION_CONSIGNE } from './consigne.mjs';

test('les consignes correspondent à l’empreinte épinglée — sinon, augmenter la version', () => {
  assert.equal(
    empreinteConsignes(lireConsignes()),
    EMPREINTE_ATTENDUE,
    'Consigne modifiée : augmenter VERSION_CONSIGNE (fiche-assiette-vN) et épingler la nouvelle empreinte.',
  );
});

test('la version portée par un brouillon nomme la consigne ET son empreinte', () => {
  assert.equal(consignesVerifiees().versionConsigne, `${VERSION_CONSIGNE}+${EMPREINTE_ATTENDUE}`);
  assert.match(VERSION_CONSIGNE, /^fiche-assiette-v\d+$/);
});

test('un octet changé dans l’une ou l’autre consigne change l’empreinte', () => {
  const c = lireConsignes();
  assert.notEqual(empreinteConsignes({ ...c, redaction: `${c.redaction} ` }), EMPREINTE_ATTENDUE);
  assert.notEqual(empreinteConsignes({ ...c, contreLecture: `${c.contreLecture} ` }), EMPREINTE_ATTENDUE);
});

test('les consignes nomment les interdits que le contrôle machine ne voit pas', () => {
  const { redaction, contreLecture } = lireConsignes();
  for (const attendu of ['bornes', 'renvoi vers le praticien', 'nombre en lettres', 'population', 'complément']) {
    assert.ok(redaction.includes(attendu), `redaction.md doit porter « ${attendu} »`);
  }
  assert.match(contreLecture, /En cas de doute réel, réponds fidele=false/);
});
