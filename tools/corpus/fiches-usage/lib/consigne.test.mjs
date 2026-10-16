// La consigne « fiche-usage-v1 » est épinglée : un octet changé sans bump de
// version rougit ici, et l'outil refuse de tourner ([[D-314]] §4).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { consignesVerifiees, EMPREINTE_ATTENDUE, empreinteConsignes, lireConsignes, VERSION_CONSIGNE } from './consigne.mjs';

test('les consignes livrées redonnent l’empreinte épinglée', () => {
  assert.equal(empreinteConsignes(lireConsignes()), EMPREINTE_ATTENDUE);
  assert.equal(consignesVerifiees().versionConsigne, `${VERSION_CONSIGNE}+${EMPREINTE_ATTENDUE}`);
});

test('un octet changé change l’empreinte', () => {
  const c = lireConsignes();
  assert.notEqual(empreinteConsignes({ ...c, redaction: `${c.redaction} ` }), EMPREINTE_ATTENDUE);
});

test('la consigne interdit nombre, donnée patient et médicament, et impose la phrase d’absence', () => {
  const { redaction, contreLecture } = lireConsignes();
  assert.match(redaction, /Aucun nombre/);
  assert.match(redaction, /Aucune donnée de patient/);
  assert.match(redaction, /aucun médicament/);
  assert.match(redaction, /Les sources retenues ne documentent pas ce point\./);
  assert.match(contreLecture, /En cas de doute, le texte est INFIDÈLE/);
});
