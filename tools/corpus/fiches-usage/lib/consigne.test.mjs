// La consigne « fiche-usage-v9 » est épinglée : un octet changé sans bump de
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
  assert.match(redaction, /Aucun médicament nommé/);
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
  // v8 (D-501 §11) : « population » rejoint « question » hors de la phrase d'absence.
  assert.match(redaction, /rubrique autre que « question » et « population », écris\s+exactement/);
  assert.match(contreLecture, /une rubrique « question » composée comme dit plus haut\s+n'omet rien/);
  assert.match(redaction, /la\s+rubrique « population » désigne la seule population d'usage/);
  for (const c of [redaction, contreLecture]) {
    assert.match(c, /surveillance_arret :\s+la surveillance et le critère d'arrêt/);
    assert.match(c, /population : la population en clair/);
  }
});

// [[D-501]] §10 : chaque fait garde toutes ses conditions, rien ne s'ajoute
// aux claims, un fait s'écrit dans la seule rubrique dont il relève ; la
// réserve de la « question » est celle du statut, et « cet examen » désigne
// la mesure d'une fiche sans analyte, des deux côtés.
test('v7 : conditions entières, rien d’ajouté, un fait dans sa rubrique, réserve du statut', () => {
  const { redaction, contreLecture } = lireConsignes();
  assert.match(redaction, /si tu\s+ne peux pas toutes les reprendre, n'écris pas ce fait/);
  assert.match(redaction, /Chaque phrase reformule un ou plusieurs claims et n'y ajoute rien/);
  assert.match(redaction, /Ne compare pas\s+deux claims/);
  assert.match(redaction, /Ne les\s+énonce pas non plus comme des faits, même par la négative/);
  assert.match(redaction, /Hors de la « question », ne rappelle pas l'usage décisionnel/);
  assert.match(redaction, /Range chaque fait dans la\s+rubrique dont il relève/);
  assert.match(redaction, /la question\s+ne demande pas si l'usage est établi ou validé/);
  for (const c of [redaction, contreLecture]) {
    assert.match(c, /sous « preuves_limitees », que l'usage n'est pas\s+établi ; sous\s+« non_valide », qu'il n'est pas validé/);
    assert.match(c, /« cet\s+examen »/);
  }
  assert.match(contreLecture, /une rubrique qui ne présente aucun usage n'a\s+pas à le dire/);
  // Contre-revue Codex : une limite sourcée se restitue, et une condition de
  // sécurité qu'aucune rubrique demandée ne couvre ne se tait pas.
  assert.match(redaction, /telle limite qu'un claim établit lui-même se restitue/);
  assert.match(redaction, /se restitue dans la rubrique demandée la plus proche de\s+son objet plutôt que d'être tue/);
  assert.match(contreLecture, /restituée dans la rubrique demandée la plus proche de son objet, n'est pas\s+un débordement/);
  // Contre-passe : « question » et « population » n'énoncent aucun fait et ne
  // reçoivent jamais la condition de sécurité.
  assert.match(redaction, /hors « question » et « population », qui\s+n'énoncent aucun fait/);
  assert.match(contreLecture, /elle ne tait aucune condition de sécurité ou\s+d'admissibilité/);
  assert.match(contreLecture, /sauf dans « question » ou « population », où elle reste un\s+fait, jugé comme tel/);
  assert.match(contreLecture, /FIDÈLE si\s+aucun claim ne porte sur l'objet de la rubrique/);
});

// [[D-501]] §11 : arbitrages du 2026-11-14. La « population » nomme toujours
// la population d'usage, sans phrase d'absence ; les quantités se jugent selon
// leur fonction ; la catégorie « médicaments » est admise dans un fait
// descriptif ; un claim fourni n'a pas à être employé. Des deux côtés.
test('v8 : population nommée, quantités selon leur fonction, catégorie « médicaments », claims non employés', () => {
  const { redaction, contreLecture } = lireConsignes();
  assert.match(redaction, /Les rubriques « question » et « population » ne prennent jamais cette\s+phrase/);
  assert.match(redaction, /même si aucun claim ne porte\s+sur cette population : la phrase d'absence ne s'y emploie jamais/);
  assert.match(contreLecture, /employée\s+dans « population », elle est INFIDÈLE/);
  assert.match(contreLecture, /toujours INFIDÈLE dans « question » ou « population »/);
  for (const c of [redaction, contreLecture]) {
    assert.match(c, /une\s+teneur\s+de\s+composition\s+\(la\s+quantité\s+d'un\s+nutriment\s+effectivement\s+présente/);
    assert.match(c, /seuil\s+qui\s+borne\s+une\s+observation\s+ou\s+un\s+risque/);
    assert.match(c, /apport\s+recommandé\s+ou\s+de\s+référence/);
    assert.match(c, /teneur\s+maximale\s+recommandée\s+pour\s+un\s+produit/);
    assert.match(c, /ne\s+s'écrit\s+pas\s+du\s+tout/);
  }
  assert.match(redaction, /Ne s'écrivent pas, même rapportés par un\s+claim, même attribués à leur source/);
  // Contre-revue Codex (D-505) : pas d'impasse, une sortie de refus pour la
  // sécurité, et l'exception de sécurité réservée des deux côtés.
  assert.match(redaction, /ne rédige rien :\s+réponds \{"refus"/);
  assert.match(contreLecture, /son omission entière n'est pas une\s+condition tue/);
  assert.match(redaction, /une rubrique autre que « question »\s+et « population » prend la phrase d'absence/);
  // Contre-passe Codex : la condition de sécurité remplace la phrase d'absence,
  // et son omission n'est jamais exemptée sous « oui ».
  assert.match(redaction, /elle écrit\s+cette condition à la place de la phrase d'absence/);
  assert.match(redaction, /n'accueille\s+aucune condition de sécurité ou d'admissibilité/);
  // v9 (D-501 §12) : la phrase de quantité rejoint la phrase d'absence.
  assert.match(contreLecture, /l'écrit à la place de la phrase d'absence\s+ou de la phrase de quantité, et l'une ou l'autre seule y est une condition\s+tue/);
  assert.match(contreLecture, /Cette exemption ne\s+vaut jamais pour une condition de sécurité ou d'admissibilité/);
  // Seconde contre-passe : un nombre d'une désignation approuvée n'est pas un
  // défaut, et l'exemption écarte le seul fait inexprimable, pas le claim.
  assert.match(contreLecture, /une valeur ou une unité reprise telle quelle\s+d'une désignation approuvée, au sein de cette seule désignation employée\s+pour nommer, n'en est pas un/);
  assert.match(contreLecture, /hors une\s+valeur reprise d'une désignation approuvée comme dit plus haut/);
  // PR-Agent (#2135) : principe actif et classe thérapeutique restent interdits ;
  // une forme de nutriment n'est pas un médicament. Des deux côtés.
  for (const c of [redaction, contreLecture]) {
    assert.match(c, /principe\s+actif\s+ou\s+classe\s+thérapeutique\s+nommés\s+en\s+tant\s+que\s+médicaments/);
    assert.match(c, /nommer\s+une\s+forme\s+de\s+nutriment\s+\(un\s+sel,\s+un\s+composé\)\s+n'est\s+pas,\s+en\s+soi,\s+nommer\s+un\s+médicament,\s+sauf\s+quand\s+elle\s+est\s+nommée\s+en\s+tant\s+que\s+médicament/i);
    // Codex (cinquième passe) : l'exemption d'omission et le refus sous « oui »
    // couvrent tout médicament nommé, plus la seule spécialité.
    assert.match(c, /sans\s+un\s+médicament\s+nommé/);
    assert.doesNotMatch(c, /sans\s+une\s+spécialité/);
  }
  assert.match(redaction, /qu'avec\s+une\s+quantité\s+exclue\s+ou\s+un\s+médicament\s+nommé,\s+ne\s+rédige\s+rien/);
  assert.match(redaction, /Ces règles ne visent pas une valeur ni une unité reprise telle quelle\s+d'une désignation approuvée/);
  assert.match(redaction, /les autres faits du même claim se restituent\s+comme tout fait/);
  assert.match(contreLecture, /les autres faits du même\s+claim restent jugés comme tels/);
  for (const c of [redaction, contreLecture]) {
    assert.match(c, /une\s+fréquence\s+ou\s+un\s+fractionnement\s+des\s+prises,\s+une\s+durée\s+de\s+prise\s+ou\s+de\s+traitement/);
    assert.match(c, /sans\s+spécialité\s+nommée\s+ni\s+schéma\s+de\s+prise/);
  }
  assert.match(redaction, /Un fait propre à\s+une spécialité ne se généralise jamais à cette catégorie/);
  assert.match(contreLecture, /un fait propre à une spécialité\s+généralisé à cette catégorie en est un/);
  assert.match(redaction, /Un claim fourni n'a pas à être employé/);
  assert.match(contreLecture, /Un claim\s+fourni qui ne porte pas sur l'objet de la rubrique n'a pas à y figurer/);
});

// [[D-501]] §12 : arbitrages du 2026-11-15 (Q1-B, Q2-A, Q3-A). Un fait
// empêché par une quantité de prise ne s'écrit ni entier ni privé d'elle, et
// une phrase fixe distincte de l'absence le dit ; « le dosage de » est une
// forme du cadre dans la « question » ; la phrase d'absence s'écrit si et
// seulement si aucun claim fourni ne porte sur l'objet. Des deux côtés.
test('v9 : phrase de quantité, « le dosage de » dans la question, objet des claims et phrase d’absence', () => {
  const { redaction, contreLecture } = lireConsignes();
  const phraseDeQuantite = "Les sources retenues documentent ce point avec une quantité de prise, qui ne s'écrit pas dans cette fiche.";
  for (const c of [redaction, contreLecture]) {
    assert.ok(c.includes(phraseDeQuantite), 'phrase de quantité, mot pour mot');
    assert.match(c, /Les sources retenues ne documentent pas ce point\./);
    assert.match(c, /« le dosage\s+de »,\s+accordés/);
    assert.match(c, /pas seulement son sujet/);
    assert.match(c, /Un claim qui ne relie aucun\s+résultat de l'examen à ce qu'il permet ou interdit de conclure ne porte\s+pas sur l'objet de « interpretations »/);
    // Contre-revue Codex (D-505) : « resultats_consequences » garde l'alternative,
    // et un fait empêché par une quantité de prise compte pour la phrase d'absence.
    assert.match(c, /un claim qui ne nomme ni un\s+résultat possible de l'examen, ni une conséquence qu'un résultat\s+autorise, ne porte pas sur celui de « resultats_consequences »/);
    // Contre-passe : la quantité de prise l'emporte quand les deux empêchements se cumulent.
    assert.match(c, /Empêché\s+seulement\s+par\s+un\s+médicament\s+nommé/);
    assert.match(c, /Empêché\s+par\s+une\s+quantité\s+de\s+prise,\s+même\s+s'il\s+l'est\s+aussi\s+par\s+un\s+médicament\s+nommé\s+ou\s+une\s+autre\s+quantité\s+exclue,\s+il\s+y\s+compte/);
    assert.match(c, /privé de cette quantité ou de\s+ce\s+médicament/);
    assert.match(c, /fait\s+auquel\s+son\s+claim\s+attache\s+une\s+quantité\s+de\s+prise/);
  }
  assert.match(redaction, /ni l'une ni l'autre/);
  assert.match(redaction, /elle s'écrit si, et seulement si, aucun ne porte sur\s+l'objet de la rubrique/);
  assert.match(redaction, /elle\s+prend la phrase de quantité, pas la phrase d'absence/);
  assert.match(redaction, /aucun autre terme de\s+mesure ne s'y ajoute/);
  assert.match(contreLecture, /examine TOUS les\s+claims fournis, pas seulement ceux que le texte emploie/);
  assert.match(contreLecture, /toujours dans « question » ou « population »/);
  assert.match(contreLecture, /Tout\s+autre terme de mesure ajouté à cette désignation/);
  assert.match(contreLecture, /est INFIDÈLE dans la « question », même porté par un claim/);
  assert.match(contreLecture, /la phrase d'absence est alors\s+INFIDÈLE/);
});
