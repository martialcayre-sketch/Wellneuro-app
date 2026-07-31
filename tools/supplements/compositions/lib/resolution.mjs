// Résolution d'une ligne de composition Compl'Alim vers le référentiel.
//
// POURQUOI PAR LIBELLÉ, alors que tout le reste de C4 apparie par identifiant.
// La voie d'ingestion du référentiel apparie par `source_identifiant`
// (`substance:524`, `plant:679`…), et un invariant du dépôt dit « jamais par le
// libellé ». Ici il n'y a pas d'identifiant à suivre : les cinq colonnes de
// composition de `declarations.csv` ne portent QUE du texte — vérifié sur le
// schéma officiel et sur les 151 Mo, zéro occurrence de clé `id` dans les
// objets embarqués. L'invariant n'est pas contourné, il est inapplicable.
//
// Sa raison, elle, demeure. On la respecte autrement : le vocabulaire source
// est CLOS et FINI (1 965 libellés distincts pour 580 892 lignes), la
// correspondance est EXACTE (jamais de `contains`, jamais d'approché), et tout
// ce qui ne se résout pas d'une seule façon n'est pas écrit — il est rapporté.
//
// POURQUOI ICI ET NON DANS `web/src`. Le libellé n'atteint jamais le serveur :
// c'est l'outil qui lit le CSV, résout, et n'envoie que des identifiants
// officiels. Le serveur, lui, traduira `substance:348` en identifiant interne
// et vérifiera qu'une forme appartient bien à son ingrédient — une lecture en
// base, pas cette logique-ci. Même partage que `tools/corpus/certify/lib/`.
//
// CE QUE CE MODULE NE FAIT PAS. Aucun accès réseau, aucun accès base, aucune
// écriture. Et il ne déduit aucune relation ingrédient → forme : celle-ci vient
// du référentiel officiel, jamais du libellé. C'est la garde clinique centrale
// du dispositif — « Hydrogénosélénite de sodium » apporte du SÉLÉNIUM,
// « iodure de potassium » de l'IODE, et lire le nom se tromperait de nutriment
// dans les deux cas.

/**
 * Vocabulaire d'unités admis en base.
 *
 * RECOPIE de `SUPPLEMENTS_UNITES` (web/src/lib/supplement-library/config.ts),
 * comme `ingest.mjs` recopie le motif de code du serveur : `tools/` est
 * autonome et n'importe pas de TypeScript. Le banc de ce module RELIT le
 * fichier TypeScript et compare les deux listes — une divergence casse le
 * test, elle ne dort pas.
 */
export const UNITES_CANONIQUES = ['µg', 'mg', 'g', 'mL', 'UI', 'UFC'];

/**
 * Espaces de noms du référentiel admis pour chaque colonne source.
 *
 * Une plante ne se résout que vers une plante. Sans ce filtre, un homonyme
 * entre deux familles (48 noms d'ingrédients sont homonymes dans le
 * référentiel) laisserait une ligne « plantes » s'accrocher à une substance
 * chimique, et le produit déclarerait un actif d'une tout autre famille.
 *
 * `nutriments` et `autres_ingredients_actifs` sont des listes de chaînes libres
 * où la source mêle formes d'apport (« Acide L-ascorbique »), substances
 * (« Taurine ») et ingrédients divers (« miel ») : aucun filtre ne s'y applique
 * sans perdre des correspondances légitimes. C'est là que la règle de
 * non-ambiguïté fait tout le travail.
 */
export const ESPACES_PAR_CATEGORIE = {
  plantes: ['plant'],
  micro_organismes: ['microorganism'],
  substances: ['substance', 'form_of_supply'],
  nutriments: null,
  autres_ingredients_actifs: null,
};

/**
 * Clé de correspondance : casse et espaces neutralisés, rien d'autre.
 *
 * Les accents sont CONSERVÉS. Les deux côtés viennent du même producteur
 * (DGAL / Compl'Alim) et s'écrivent donc pareil ; les dépouiller n'ajouterait
 * que des collisions sur un vocabulaire où une confusion désigne un autre
 * principe actif.
 */
export function cleLibelle(brut) {
  if (typeof brut !== 'string') return '';
  return brut
    .replace(/ /g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('fr');
}

/**
 * Construit l'index de résolution depuis la moisson du référentiel.
 *
 * @param {Array<{ingredientId: string, nomFr: string, sourceIdentifiant: string|null}>} ingredients
 * @param {Array<{formeId: string, labelFr: string, ingredientId: string}>} formes
 */
export function construireIndexReferentiel(ingredients, formes) {
  const parNomIngredient = new Map();
  const parIdIngredient = new Map();
  for (const ingredient of ingredients) {
    parIdIngredient.set(ingredient.ingredientId, ingredient);
    const cle = cleLibelle(ingredient.nomFr);
    if (!cle) continue;
    const seau = parNomIngredient.get(cle);
    if (seau) seau.push(ingredient);
    else parNomIngredient.set(cle, [ingredient]);
  }

  const parLabelForme = new Map();
  for (const forme of formes) {
    const cle = cleLibelle(forme.labelFr);
    if (!cle) continue;
    const seau = parLabelForme.get(cle);
    if (seau) seau.push(forme);
    else parLabelForme.set(cle, [forme]);
  }

  return { parNomIngredient, parLabelForme, parIdIngredient };
}

function dansEspace(ingredient, espaces) {
  // UNE SAISIE PRATICIEN N'EST JAMAIS LA CIBLE D'UN IMPORT EXTERNE, et ce refus
  // vient AVANT le test d'espace de noms — sinon les deux catégories sans
  // filtre (`nutriments`, `autres_ingredients_actifs`, 301 428 lignes, le gros
  // du corpus) l'atteindraient par le `return true` ci-dessous.
  //
  // Le dégât serait silencieux et large : le praticien crée à la main une
  // entrée « Curcumine » avec ses règles cliniques ; l'import y raccroche des
  // milliers de produits industriels, sans ambiguïté déclenchée puisque le
  // candidat est unique — et les règles du cabinet se mettent à parler de
  // produits qu'il n'a jamais examinés. Le référentiel couvre 100 % des
  // libellés du catalogue : refuser ne coûte aucune correspondance légitime.
  const identifiant = ingredient.sourceIdentifiant;
  if (typeof identifiant !== 'string') return false;
  const separateur = identifiant.indexOf(':');
  if (separateur < 0) return false;
  if (espaces === null) return true;
  return espaces.includes(identifiant.slice(0, separateur));
}

/**
 * Résout un libellé de composition vers un ingrédient du référentiel.
 *
 * TROIS RÈGLES, DANS CET ORDRE.
 *
 * 1. **L'ingrédient direct l'emporte.** Si le libellé désigne lui-même un
 *    ingrédient du référentiel, c'est lui — et on s'arrête là. C'est ce qui
 *    sauve « Huile de poisson » : elle existe comme `substance:716`, et elle
 *    est AUSSI une forme d'apport rattachée à sept ingrédients (DHA, EPA,
 *    oméga 3, vitamine E…). Suivre la forme en ferait sept actifs déclarés là
 *    où le fabricant n'en a déclaré qu'un. On n'invente pas de composition.
 *
 * 2. **Sinon la forme, à condition qu'elle n'ait qu'un parent.** « Acide
 *    L-ascorbique » n'est pas un ingrédient, c'est une forme d'apport de la
 *    vitamine C : on retient l'ingrédient `vitamine C` ET la forme, qui porte
 *    le détail clinique. 69 libellés de forme sur 568 ont plusieurs parents ;
 *    ceux-là ne passent pas.
 *
 * 3. **Toute ambiguïté résiduelle n'est pas écrite.** Elle est rendue avec ses
 *    candidats, pour arbitrage praticien. Mieux vaut une composition
 *    incomplète — le tri-état de complétude sait la signaler et s'abstenir —
 *    qu'une composition fausse, que rien en aval ne rattraperait.
 *
 * @returns {{statut:'resolu', ingredient: object, forme: object|null, via:'ingredient'|'forme'}
 *          | {statut:'ambigu', motif: string, candidats: string[]}
 *          | {statut:'inconnu'}}
 */
export function resoudreLigneComposition(libelleBrut, categorie, index) {
  const cle = cleLibelle(libelleBrut);
  if (!cle) return { statut: 'inconnu' };

  const espaces = ESPACES_PAR_CATEGORIE[categorie];
  if (espaces === undefined) {
    throw new Error(`Catégorie de composition inconnue : « ${categorie} ».`);
  }

  // 1. L'ingrédient direct.
  const directs = (index.parNomIngredient.get(cle) ?? []).filter((i) => dansEspace(i, espaces));
  if (directs.length === 1) {
    return { statut: 'resolu', ingredient: directs[0], forme: null, via: 'ingredient' };
  }
  if (directs.length > 1) {
    return {
      statut: 'ambigu',
      motif: 'plusieurs ingrédients portent ce nom',
      candidats: directs.map((i) => i.sourceIdentifiant ?? i.ingredientId).sort(),
    };
  }

  // 2. La forme, si elle ne désigne qu'un ingrédient.
  //
  // Le filtre d'espace de noms porte sur le PARENT, pas seulement sur les
  // ingrédients directs. Sans cela, une ligne « plantes » dont le nom coïncide
  // avec une forme d'apport chimique s'accrocherait à la substance qui la
  // porte, et le produit déclarerait un actif d'une tout autre famille.
  const formes = (index.parLabelForme.get(cle) ?? []).filter((f) => {
    const parent = index.parIdIngredient.get(f.ingredientId);
    return parent !== undefined && dansEspace(parent, espaces);
  });
  // DEUX CONDITIONS, PAS UNE. Un seul parent ne suffit pas : deux formes
  // OFFICIELLES DISTINCTES peuvent porter le même libellé sous le même
  // ingrédient — la projection du référentiel le sait, elle suffixe leurs codes
  // par une boucle « collision intra-ingrédient ». Ne tester que les parents
  // laisserait `formes[0]` trancher selon l'ordre d'insertion dans l'index,
  // c'est-à-dire au hasard : le bon ingrédient serait écrit, mais avec une
  // forme que le fabricant n'a pas déclarée — et `calculerBiodisponibilite`
  // lit précisément la forme. Un résultat FAUX, là où ce module ne doit rendre
  // qu'un résultat sûr ou une ambiguïté.
  const parents = new Set(formes.map((f) => f.ingredientId));
  if (parents.size === 1 && formes.length === 1) {
    const forme = formes[0];
    return {
      statut: 'resolu',
      ingredient: index.parIdIngredient.get(forme.ingredientId),
      forme,
      via: 'forme',
    };
  }
  if (parents.size === 1) {
    return {
      statut: 'ambigu',
      motif: 'plusieurs formes officielles portent ce libellé sous le même ingrédient',
      candidats: formes.map((f) => f.formeId).sort(),
    };
  }
  if (parents.size > 1) {
    return {
      statut: 'ambigu',
      motif: 'cette forme relève de plusieurs ingrédients',
      candidats: [...parents]
        .map((id) => index.parIdIngredient.get(id)?.sourceIdentifiant ?? id)
        .sort(),
    };
  }

  return { statut: 'inconnu' };
}

// ─── Dose et unité ──────────────────────────────────────────────────────────

/**
 * Graphies de la source à ramener au vocabulaire canonique.
 *
 * `ml` minuscule couvre 19 330 lignes : la base n'admet que `mL`, et c'est à
 * l'import de normaliser plutôt qu'au vocabulaire de s'élargir — deux graphies
 * de la même unité en base, et la sentinelle de cumul comparerait des colonnes
 * qu'elle croit distinctes.
 */
const GRAPHIES = {
  ug: 'µg',
  mcg: 'µg',
  cfu: 'UFC',
  // Chaque unité canonique est aussi admise dans sa graphie en minuscules —
  // c'est ce qui fait passer `ml` → `mL`. Les énumérer à la main laissait un
  // trou incohérent : `ML` était accepté et `MG` refusé, pour la seule raison
  // que `mg` était déjà canonique et `ml` non.
  ...Object.fromEntries(UNITES_CANONIQUES.map((u) => [u.toLocaleLowerCase('fr'), u])),
};

const CANONIQUES = new Set(UNITES_CANONIQUES);

/**
 * Ramène une dose source au couple (dose, unité) que la base accepte, ou rend
 * un refus motivé.
 *
 * DEUX RÈGLES QUI NE SE NÉGOCIENT PAS.
 *
 * - **On ne devine jamais une unité.** 65 lignes de substances portent un
 *   nombre sans grandeur ; 18 portent `C/j`, hors vocabulaire. Ces lignes
 *   s'écrivent sans dose. Un nombre auquel on aurait prêté « mg » serait une
 *   dose inventée dans la table qui alimentera la sentinelle de cumul.
 * - **Un micro-organisme dosé est en UFC.** Seule exception, et ce n'est pas
 *   une devinette : la colonne `micro_organismes` ne porte AUCUNE clé d'unité
 *   sur ses 21 805 lignes, et le schéma officiel documente `cfu` pour ce champ.
 *   Sans cette règle, 21 478 dosages probiotiques seraient jetés.
 */
export function normaliserDose(doseBrute, uniteBrute, categorie) {
  if (doseBrute === null || doseBrute === undefined || doseBrute === '') {
    return { dose: null, unite: null, rejet: 'aucune_dose' };
  }
  const dose = typeof doseBrute === 'number' ? doseBrute : Number(doseBrute);
  if (!Number.isFinite(dose) || dose < 0) {
    return { dose: null, unite: null, rejet: 'dose_invalide' };
  }

  const brut = typeof uniteBrute === 'string' ? uniteBrute.trim() : '';
  if (!brut) {
    if (categorie === 'micro_organismes') return { dose, unite: 'UFC' };
    return { dose: null, unite: null, rejet: 'unite_absente' };
  }

  const canonique = CANONIQUES.has(brut) ? brut : GRAPHIES[brut.toLocaleLowerCase('fr')];
  if (!canonique) return { dose: null, unite: null, rejet: 'unite_hors_vocabulaire' };

  return { dose, unite: canonique };
}
