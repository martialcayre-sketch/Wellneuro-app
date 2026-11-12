// La consigne « fiche-usage-v2 » est épinglée : un octet changé sans bump de
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

// [[D-501]] : les axes signés, la réserve d'indication et la règle des libellés
// d'hypothèse ([[D-477]] §2) sont dans les deux consignes.
test('v2 : axes signés, réserve d’indication et libellé d’hypothèse, des deux côtés', () => {
  const { redaction, contreLecture } = lireConsignes();
  for (const c of [redaction, contreLecture]) {
    assert.match(c, /\[SOUS RÉSERVE D'INDICATION\]/);
    for (const axe of ['preuves_limitees', 'non_valide', 'information_contributive', 'exploration_fonctionnelle', 'marqueur_experimental']) {
      assert.ok(c.includes(axe), axe);
    }
    assert.match(c, /état fonctionnel/);
  }
  assert.match(redaction, /des plafonds,\s+pas des contenus/);
  assert.match(contreLecture, /AXES SIGNÉS DE LA FICHE/);
});
