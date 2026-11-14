// La consigne « fiche-usage-v6 » est épinglée : un octet changé sans bump de
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

// [[D-501]] §8 : la qualification « fonctionnel » du libellé d'une hypothèse
// est la forme qu'impose le cadre signé ([[D-477]] §2), pas un fait à étayer ;
// tout autre élément du libellé reste un fait, jugé comme tel.
test('v5 : le libellé d’une hypothèse porte la forme signée sans claim qui la nomme', () => {
  const { redaction, contreLecture } = lireConsignes();
  assert.match(redaction, /Le libellé d'une hypothèse nomme un état fonctionnel/);
  assert.match(contreLecture, /Le libellé d'une hypothèse nomme un état, il n'affirme pas un fait/);
  assert.match(contreLecture, /FIDÈLE même\s+si aucun claim n'emploie le mot « fonctionnel »/);
  assert.match(contreLecture, /Tout autre élément qu'il\s+contient \(une cause, un mécanisme, une population, une gravité, une\s+conséquence\) est un fait, jugé comme tel/);
  // La règle des défauts ne bouge pas : marqueur, dosage, seuil, diagnostic restent infidèles.
  assert.match(contreLecture, /plutôt qu'un état fonctionnel d'un seul\s+nutriment dans le sens bas/);
});

// [[D-501]] §9 : la « question » est interrogative ; rien ne s'écrit sur ce que
// les sources taisent ; « population » ne nomme que la population ; l'objet de
// chaque rubrique (cadrage v3 §3.2) est donné des deux côtés.
test('v6 : question interrogative, aucun commentaire sur les sources, objet des rubriques', () => {
  const { redaction, contreLecture } = lireConsignes();
  assert.match(redaction, /une seule phrase interrogative, terminée par un point d'interrogation/);
  assert.match(redaction, /N'écris rien que tu déduis du seul silence des claims/);
  assert.match(redaction, /un manque de données qu'un claim énonce lui-même se restitue/);
  assert.match(redaction, /la phrase\s+d'absence ne s'y emploie jamais/);
  assert.match(redaction, /rubrique autre que « question », écris exactement/);
  assert.match(contreLecture, /une rubrique « question » composée comme dit plus haut\s+n'omet rien/);
  assert.match(redaction, /la\s+rubrique « population » désigne la seule population d'usage/);
  for (const c of [redaction, contreLecture]) {
    assert.match(c, /surveillance_arret :\s+la surveillance et le critère d'arrêt/);
    assert.match(c, /population : la population en clair/);
  }
});
