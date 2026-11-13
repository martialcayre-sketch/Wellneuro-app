// La consigne « fiche-usage-v4 » est épinglée : un octet changé sans bump de
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

// [[D-501]] §5 : la structure signée fonde la désignation, jamais un fait ;
// l'identifiant seul ne fonde rien ; contradiction ⇒ refus motivé.
test('v3 : désignations approuvées pour nommer, jamais pour établir un fait, des deux côtés', () => {
  const { redaction, contreLecture } = lireConsignes();
  for (const c of [redaction, contreLecture]) {
    assert.match(c, /DÉSIGNATIONS APPROUVÉES/);
    assert.match(c, /identifiant/);
  }
  assert.match(redaction, /n'établissent AUCUN fait/);
  assert.match(redaction, /\{"refus": "<motif en une phrase>"\}/);
  assert.match(redaction, /Ne nomme aucune hypothèse que la liste ne rattache pas/);
  assert.match(contreLecture, /une DÉSIGNATION reprise des DÉSIGNATIONS APPROUVÉES/);
  assert.match(contreLecture, /un FAIT \(indication, interprétation, condition, précaution, limite\) n'est\s+fidèle que si un claim l'établit/);
});

// [[D-501]] §7 : la rubrique « question » se compose des seules désignations
// approuvées et de la réserve du statut d'usage ; la contre-lecture la juge
// fidèle sans claim de l'usage, et tout autre élément comme un fait.
test('v4 : la rubrique « question » nomme l’usage signé sans l’affirmer, des deux côtés', () => {
  const { redaction, contreLecture } = lireConsignes();
  assert.match(redaction, /LA RUBRIQUE « QUESTION »/);
  assert.match(redaction, /Elle n'énonce aucun\s+fait/);
  assert.match(contreLecture, /La rubrique « question » pose une question, elle n'affirme pas un usage/);
  assert.match(contreLecture, /Tout autre élément\s+qu'elle contient est un fait, jugé comme tel/);
});
