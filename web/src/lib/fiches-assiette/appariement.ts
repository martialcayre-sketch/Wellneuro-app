// L'APPARIEMENT ASSIETTE → FICHE MY ([[D-251]]) — des identifiants, jamais du
// contenu.
//
// Chaque assiette d'indication s'adosse à un protocole du corpus
// (`sourceProtocole`, `WN-SRC-0284 → 0295`) ; chaque protocole a sa Fiche MY,
// le support remis au patient (`WN-SRC-0296 → 0307`), et [[D-216]] constate
// qu'ils « se correspondent une à une ». Cette correspondance n'était écrite
// qu'en prose. La voici, paire par paire, ÉCRITE EN CLAIR plutôt que calculée
// (`sourceProtocole + 12`) : un calcul aurait suivi en silence une renumérotation
// du registre, une table la fait rougir au banc.
//
// HORS DU CATALOGUE, sur le patron de `replisAssietteV1` ([[D-242]]). Une entrée
// de catalogue porte son `contentHash`, et toute référence d'assiette consignée
// sur un dossier porte ce hachage : ajouter un champ « fiche » au catalogue
// aurait périmé les références déjà posées. `plates.ts` ne bouge pas d'un octet.
//
// UNE FICHE N'EST JAMAIS UNE SOURCE DE RÈGLE ([[D-216]]) : elle ne fonde aucune
// indication, n'est jamais `sourceProtocole`, et ne sert qu'au patient. Le banc
// de garde épingle les trois.
//
// Le TEXTE des fiches ne touche jamais le dépôt, qui est public ([[D-251]] §4) :
// il vit en base. Ce module ne connaît que leurs identifiants.

import { estAssietteDIndication } from '@/lib/food-compass/plates';

/** La Fiche MY de chaque assiette d'indication, par code d'assiette. */
export const FICHE_MY_PAR_ASSIETTE: Readonly<Record<string, string>> = Object.freeze({
  ASSIETTE_VEGETALE: 'WN-SRC-0296',
  ASSIETTE_EPARGNE_DIGESTIVE: 'WN-SRC-0297',
  ASSIETTE_METHYLATION: 'WN-SRC-0298',
  ASSIETTE_DETOXICATION: 'WN-SRC-0299',
  ASSIETTE_PROTEINEE: 'WN-SRC-0300',
  ASSIETTE_DOPAMINERGIQUE: 'WN-SRC-0301',
  ASSIETTE_SEROTONINERGIQUE: 'WN-SRC-0302',
  ASSIETTE_PSYCHOBIOTIQUE: 'WN-SRC-0303',
  ASSIETTE_ANTIOXYDANTE: 'WN-SRC-0304',
  ASSIETTE_ANTI_INFLAMMATOIRE: 'WN-SRC-0305',
  ASSIETTE_OMEGA_3: 'WN-SRC-0306',
  ASSIETTE_CHRONOBIOLOGIQUE: 'WN-SRC-0307',
});

/**
 * La Fiche MY d'une assiette, ou `null`.
 *
 * `null` pour un repère de moment de repas (ils n'ont pas de fiche) comme pour
 * un code inconnu : l'appelant ne distingue pas les deux, parce qu'aucun des
 * deux n'a de fiche à remettre. La garde d'axe est rejouée ici plutôt que
 * supposée — la table ne contient que des assiettes d'indication, mais un
 * `Record` indexé par une chaîne quelconque ne le prouve pas.
 */
export function ficheSourceDeLAssiette(plateCode: string): string | null {
  if (!estAssietteDIndication(plateCode)) return null;
  return Object.prototype.hasOwnProperty.call(FICHE_MY_PAR_ASSIETTE, plateCode)
    ? FICHE_MY_PAR_ASSIETTE[plateCode]
    : null;
}
