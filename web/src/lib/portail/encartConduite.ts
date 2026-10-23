// `WN_PORTAIL_ENCART_CONDUITE` — L'ENCART « QUAND RALENTIR OU DEMANDER AVIS »
// (lettre bd, fiche H71, [[D-348]]). Fermé, l'accueil du portail sert le
// protocole exactement comme avant. Ouvert, la route du protocole annonce
// l'encart quand elle sert une vue, et l'accueil le rend avec le texte accepté
// (`texteEncartConduite.ts`). Aucune écriture, aucune trace, aucune migration.
//
// Il prend la place suivante de la file C ([[D-346]] §2) : une activation,
// constatée avant la suivante (porte 18, [[D-288]] §1-2).
//
// Convention des drapeaux produit (`docs/FEATURE_FLAGS.md` § A) : la chaîne
// exacte `'true'`, absent = fermé. Variable serveur : un composant client ne la
// lit pas, c'est la route du protocole qui le lui dit.

export function encartConduiteOuvert(): boolean {
  return process.env.WN_PORTAIL_ENCART_CONDUITE === 'true';
}
