import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';

import {
  UNITES_CANONIQUES,
  cleLibelle,
  construireIndexReferentiel,
  normaliserDose,
  resoudreLigneComposition,
} from './resolution.mjs';

const ICI = dirname(fileURLToPath(import.meta.url));

// Fixture RÉPLIQUE : identifiants et rattachements relevés en production le
// 2026-07-31, pas inventés. Ce sont ces relations-là qui piègent la résolution.
const INGREDIENTS = [
  { ingredientId: 'ing_vit_c', nomFr: 'vitamine C', sourceIdentifiant: 'substance:348' },
  { ingredientId: 'ing_vit_b5', nomFr: 'vitamine B5', sourceIdentifiant: 'substance:515' },
  { ingredientId: 'ing_calcium', nomFr: 'calcium', sourceIdentifiant: 'substance:273' },
  { ingredientId: 'ing_huile_poisson', nomFr: 'huile de poisson', sourceIdentifiant: 'substance:716' },
  { ingredientId: 'ing_dha', nomFr: 'acide docosahéxaénoïque', sourceIdentifiant: 'substance:180' },
  { ingredientId: 'ing_epa', nomFr: 'acide eicosapentaénoïque', sourceIdentifiant: 'substance:181' },
  { ingredientId: 'ing_omega3', nomFr: 'oméga 3', sourceIdentifiant: 'substance:600' },
  // « miel » existe DEUX FOIS dans le référentiel, sous deux espaces de noms.
  { ingredientId: 'ing_miel_sub', nomFr: 'miel', sourceIdentifiant: 'substance:696' },
  { ingredientId: 'ing_miel_fos', nomFr: 'miel', sourceIdentifiant: 'form_of_supply:686' },
  { ingredientId: 'ing_citrus', nomFr: 'Citrus sinensis (L.) Osbeck', sourceIdentifiant: 'plant:613' },
  { ingredientId: 'ing_manuel', nomFr: 'préparation du cabinet', sourceIdentifiant: null },
];

const FORMES = [
  { formeId: 'f_ascorbique', labelFr: 'Acide L-ascorbique', ingredientId: 'ing_vit_c' },
  // Un sel qui apporte RÉELLEMENT deux nutriments : la source ne tranche pas.
  { formeId: 'f_pantoth_ca', labelFr: 'D-pantothénate de calcium', ingredientId: 'ing_calcium' },
  { formeId: 'f_pantoth_b5', labelFr: 'D-pantothénate de calcium', ingredientId: 'ing_vit_b5' },
  // Une forme d'apport rattachée à ses constituants — sept en production.
  { formeId: 'f_hp_dha', labelFr: 'Huile de poisson', ingredientId: 'ing_dha' },
  { formeId: 'f_hp_epa', labelFr: 'Huile de poisson', ingredientId: 'ing_epa' },
  { formeId: 'f_hp_omega3', labelFr: 'Huile de poisson', ingredientId: 'ing_omega3' },
  // Deux formes OFFICIELLES distinctes, même libellé, MÊME parent. La
  // projection du référentiel prévoit ce cas (boucle « collision
  // intra-ingrédient » qui suffixe les codes) : un seul parent ne suffit donc
  // pas à lever l'ambiguïté.
  { formeId: 'f_citrate_a', labelFr: 'Citrate de magnésium', ingredientId: 'ing_calcium' },
  { formeId: 'f_citrate_b', labelFr: 'Citrate de magnésium', ingredientId: 'ing_calcium' },
];

const INDEX = construireIndexReferentiel(INGREDIENTS, FORMES);

describe('resoudreLigneComposition', () => {
  // Le cas nominal, et de loin le plus fréquent : 194 701 lignes de la source
  // sont des nutriments, c'est-à-dire des formes d'apport nommées seules.
  it('une forme à parent unique rend l’ingrédient ET la forme', () => {
    const r = resoudreLigneComposition('Acide L-ascorbique', 'nutriments', INDEX);
    assert.equal(r.statut, 'resolu');
    assert.equal(r.ingredient.sourceIdentifiant, 'substance:348');
    assert.equal(r.forme.formeId, 'f_ascorbique');
    assert.equal(r.via, 'forme');
  });

  // LE test du lot. « Huile de poisson » est à la fois un ingrédient du
  // référentiel et une forme d'apport rattachée à sept constituants. Suivre la
  // forme ferait déclarer au produit sept actifs que le fabricant n'a jamais
  // déclarés — dans la table même qui alimentera la sentinelle de cumul.
  it('l’ingrédient direct l’emporte — « huile de poisson » ne devient pas sept actifs', () => {
    const r = resoudreLigneComposition('Huile de poisson', 'autres_ingredients_actifs', INDEX);
    assert.equal(r.statut, 'resolu');
    assert.equal(r.ingredient.sourceIdentifiant, 'substance:716');
    assert.equal(r.forme, null);
    assert.equal(r.via, 'ingredient');
    // Formulé en négatif aussi : aucun des constituants ne doit sortir.
    assert.ok(!['ing_dha', 'ing_epa', 'ing_omega3'].includes(r.ingredient.ingredientId));
  });

  // Deux parents légitimes : le sel apporte vraiment le calcium ET la B5. Rien
  // dans la donnée ne dit lequel le fabricant visait — donc on n'écrit pas, on
  // rapporte. 69 libellés de forme sur 568 sont dans ce cas.
  it('une forme à plusieurs parents n’est PAS écrite — elle est rapportée', () => {
    const r = resoudreLigneComposition('D-pantothénate de calcium', 'nutriments', INDEX);
    assert.equal(r.statut, 'ambigu');
    assert.match(r.motif, /plusieurs ingrédients/);
    assert.deepEqual(r.candidats, ['substance:273', 'substance:515']);
  });

  // 48 noms d'ingrédients sont homonymes en production.
  it('deux ingrédients de même nom : ambigu, avec ses candidats nommés', () => {
    const r = resoudreLigneComposition('miel', 'autres_ingredients_actifs', INDEX);
    assert.equal(r.statut, 'ambigu');
    assert.deepEqual(r.candidats, ['form_of_supply:686', 'substance:696']);
  });

  it('une plante se résout par son nom latin', () => {
    const r = resoudreLigneComposition('Citrus sinensis (L.) Osbeck', 'plantes', INDEX);
    assert.equal(r.statut, 'resolu');
    assert.equal(r.ingredient.sourceIdentifiant, 'plant:613');
  });

  // Le filtre d'espace de noms, côté ingrédient direct ET côté parent de forme.
  // Sans lui, une ligne « plantes » homonyme d'une substance ferait déclarer au
  // produit un actif d'une tout autre famille que celle que la source annonce.
  it('une ligne « plantes » ne s’accroche jamais à une substance ni à sa forme', () => {
    assert.equal(resoudreLigneComposition('huile de poisson', 'plantes', INDEX).statut, 'inconnu');
    assert.equal(resoudreLigneComposition('Acide L-ascorbique', 'plantes', INDEX).statut, 'inconnu');
  });

  it('une ligne « micro_organismes » ne s’accroche pas à une substance', () => {
    assert.equal(
      resoudreLigneComposition('huile de poisson', 'micro_organismes', INDEX).statut,
      'inconnu',
    );
  });

  // Un seul parent ne suffit pas. Sans la condition sur le NOMBRE de formes,
  // `formes[0]` tranche selon l'ordre d'insertion dans l'index : le bon
  // ingrédient serait écrit, mais avec une forme que le fabricant n'a pas
  // déclarée — et c'est la forme que lit `calculerBiodisponibilite`.
  it('deux formes officielles de même libellé sous le MÊME parent : ambigu, pas un tirage au sort', () => {
    const r = resoudreLigneComposition('Citrate de magnésium', 'nutriments', INDEX);
    assert.equal(r.statut, 'ambigu');
    assert.match(r.motif, /plusieurs formes officielles/);
    assert.deepEqual(r.candidats, ['f_citrate_a', 'f_citrate_b']);
  });

  // Une saisie praticien n'a pas d'espace de noms. Le refus vaut pour TOUTES
  // les catégories, y compris les deux qui n'ont aucun filtre — ce sont
  // justement les plus volumineuses (301 428 lignes). Sinon l'import
  // raccrocherait des milliers de produits industriels à l'entrée privée du
  // cabinet, sans ambiguïté déclenchée puisque le candidat est unique, et les
  // règles cliniques du praticien se déclencheraient sur eux.
  it('une saisie praticien n’est JAMAIS la cible d’un import, même sans filtre de catégorie', () => {
    for (const categorie of [
      'plantes',
      'substances',
      'micro_organismes',
      'nutriments',
      'autres_ingredients_actifs',
    ]) {
      assert.equal(
        resoudreLigneComposition('préparation du cabinet', categorie, INDEX).statut,
        'inconnu',
        `catégorie ${categorie}`,
      );
    }
  });

  it('un libellé absent rend « inconnu », jamais une approximation', () => {
    assert.equal(resoudreLigneComposition('poudre de licorne', 'substances', INDEX).statut, 'inconnu');
    // Un préfixe d'un libellé connu ne doit RIEN rendre : la correspondance est
    // exacte, jamais un `contains`.
    assert.equal(resoudreLigneComposition('Acide L-', 'nutriments', INDEX).statut, 'inconnu');
    assert.equal(resoudreLigneComposition('', 'nutriments', INDEX).statut, 'inconnu');
    assert.equal(resoudreLigneComposition(null, 'nutriments', INDEX).statut, 'inconnu');
  });

  it('casse et espaces surnuméraires ne font pas manquer une correspondance', () => {
    assert.equal(cleLibelle('  ACIDE   L-Ascorbique '), 'acide l-ascorbique');
    assert.equal(cleLibelle('Acide L-ascorbique'), 'acide l-ascorbique');
    assert.equal(
      resoudreLigneComposition('  ACIDE   L-Ascorbique ', 'nutriments', INDEX).statut,
      'resolu',
    );
  });

  // Les accents sont conservés : les deux côtés viennent du même producteur, et
  // les dépouiller n'ajouterait que des collisions sur un vocabulaire où une
  // confusion désigne un autre principe actif.
  it('les accents comptent — « oméga 3 » n’est pas « omega 3 »', () => {
    assert.equal(resoudreLigneComposition('oméga 3', 'substances', INDEX).statut, 'resolu');
    assert.equal(resoudreLigneComposition('omega 3', 'substances', INDEX).statut, 'inconnu');
  });

  // Une catégorie inconnue signifierait que la source a changé de forme. Sans
  // ce refus, `ESPACES_PAR_CATEGORIE[...]` vaudrait `undefined` — indistinct de
  // `null`, qui veut dire « aucun filtre » : la colonne nouvelle serait résolue
  // sans aucune barrière d'espace de noms, en silence.
  it('une catégorie inconnue lève, elle ne passe pas pour « sans filtre »', () => {
    assert.throws(
      () => resoudreLigneComposition('miel', 'colonne_inventee', INDEX),
      /Catégorie de composition inconnue/,
    );
  });
});

describe('normaliserDose', () => {
  it('normalise `ml` en `mL` — 19 330 lignes de la source en dépendent', () => {
    assert.deepEqual(normaliserDose(2, 'ml', 'plantes'), { dose: 2, unite: 'mL' });
  });

  it('laisse passer les unités déjà canoniques', () => {
    assert.deepEqual(normaliserDose(29, 'mg', 'plantes'), { dose: 29, unite: 'mg' });
    assert.deepEqual(normaliserDose(5, 'µg', 'substances'), { dose: 5, unite: 'µg' });
  });

  // La seule exception admise, et ce n'est pas une devinette : la colonne
  // `micro_organismes` ne porte AUCUNE clé d'unité sur ses 21 805 lignes, et le
  // schéma officiel documente `cfu` pour ce champ.
  it('un micro-organisme dosé sans unité est en UFC — sinon 21 478 dosages sont jetés', () => {
    assert.deepEqual(normaliserDose(2e9, null, 'micro_organismes'), { dose: 2e9, unite: 'UFC' });
  });

  // Et l'exception ne déborde pas : ailleurs, une unité absente reste absente.
  it('une dose SANS unité hors micro-organismes n’est pas écrite — on ne devine jamais `mg`', () => {
    assert.equal(normaliserDose(10, null, 'substances').rejet, 'unite_absente');
    assert.equal(normaliserDose(10, '  ', 'plantes').rejet, 'unite_absente');
    assert.equal(normaliserDose(10, null, 'substances').dose, null);
  });

  it('une unité hors vocabulaire n’est pas traduite au jugé', () => {
    assert.equal(normaliserDose(3, 'C/j', 'plantes').rejet, 'unite_hors_vocabulaire');
    assert.equal(normaliserDose(3, 'cuillère', 'substances').rejet, 'unite_hors_vocabulaire');
  });

  it('absence de dose et dose aberrante sont distinguées au rapport', () => {
    assert.equal(normaliserDose(null, 'mg', 'plantes').rejet, 'aucune_dose');
    assert.equal(normaliserDose('', 'mg', 'plantes').rejet, 'aucune_dose');
    assert.equal(normaliserDose('abc', 'mg', 'plantes').rejet, 'dose_invalide');
    assert.equal(normaliserDose(-1, 'mg', 'plantes').rejet, 'dose_invalide');
  });

  it('accepte une quantité en chaîne, comme la source l’écrit parfois', () => {
    assert.deepEqual(normaliserDose('29', 'mg', 'plantes'), { dose: 29, unite: 'mg' });
  });

  // Toutes les unités canoniques sont admises en minuscules, pas seulement
  // celles qu'on avait pensé à énumérer. Le trou précédent acceptait `ML` et
  // refusait `MG`, pour la seule raison que `mg` était déjà canonique.
  it('la casse ne décide pas quelle unité passe', () => {
    for (const [brut, attendu] of [
      ['ML', 'mL'],
      ['MG', 'mg'],
      ['Mg', 'mg'],
      ['G', 'g'],
      ['ufc', 'UFC'],
      ['CFU', 'UFC'],
      ['ui', 'UI'],
      ['mcg', 'µg'],
    ]) {
      assert.deepEqual(normaliserDose(1, brut, 'plantes'), { dose: 1, unite: attendu }, brut);
    }
  });

  // Une dose déclarée à zéro est une DÉCLARATION, pas une absence : on la garde
  // telle quelle plutôt que de la réécrire en « inconnue ». Elle est inoffensive
  // pour un cumul, et la travestir en absence perdrait ce que la source dit.
  it('une dose de zéro est écrite telle quelle, pas convertie en absence', () => {
    assert.deepEqual(normaliserDose(0, 'mg', 'substances'), { dose: 0, unite: 'mg' });
  });

  // La source écrit ses nombres au point ; une virgule décimale donnerait NaN.
  // Le refus est fail-closed et COMPTÉ au rapport — si le compteur ressortait
  // à plusieurs milliers, ce serait une décision de transport, pas un détail.
  it('une décimale à la virgule est refusée, jamais réinterprétée', () => {
    assert.equal(normaliserDose('1,5', 'mg', 'plantes').rejet, 'dose_invalide');
    assert.deepEqual(normaliserDose('1.5', 'mg', 'plantes'), { dose: 1.5, unite: 'mg' });
  });
});

// `tools/` est autonome et n'importe pas de TypeScript : le vocabulaire y est
// recopié. Une recopie diverge au premier ajout, et la divergence est
// silencieuse — l'outil normaliserait vers une unité que la base refuse, et le
// lot échouerait en 422 après avoir écrit les précédents. Ce banc relit la
// source de vérité et compare.
describe('anti-dérive du vocabulaire', () => {
  it('UNITES_CANONIQUES est identique à SUPPLEMENTS_UNITES côté application', () => {
    const configTs = readFileSync(
      join(ICI, '..', '..', '..', '..', 'web', 'src', 'lib', 'supplement-library', 'config.ts'),
      'utf8',
    );
    const bloc = /export const SUPPLEMENTS_UNITES = \[([^\]]*)\] as const;/.exec(configTs);
    assert.ok(bloc, 'SUPPLEMENTS_UNITES introuvable dans config.ts — le banc doit être ajusté');
    const cote = [...bloc[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    assert.deepEqual(cote, UNITES_CANONIQUES);
  });
});
