// Les textes de l'écran « Courrier à remettre à votre médecin » ([[D-345]],
// J3-12h lot 4). Module PUR : les écrans client l'importent.
//
// LE TITRE ET LA PHRASE D'ACCOMPAGNEMENT SONT ARBITRÉS par le responsable le
// 2026-10-25 et consignés dans la décision du lot, où un banc les relit au
// caractère près ; un autre les passe à `termeAnxiogene`. C'est la seule prose
// patient de la surface. Elle ne nomme ni la population ni la situation qui
// appellent le courrier (forme opaque). Le texte du courrier, adressé au
// médecin, est validé (D-358 §1) et recopié tel que remis — il ne se retouche
// pas ici (carte de `lib/documents/vocabulaire.ts`).

export const TITRE_COURRIER_COMPLEMENT = 'Courrier à remettre à votre médecin';

export const PHRASE_COURRIER_COMPLEMENT =
  'Voici le courrier que je vous ai préparé pour votre médecin. Remettez-le-lui avant de commencer les compléments qu’il cite : vous pouvez l’imprimer ou le montrer depuis ce portail.';

export const MENTION_INDISPONIBLE_COMPLEMENT = 'Ce courrier ne peut pas être affiché pour le moment.';

export const AUCUN_COURRIER_COMPLEMENT = 'Aucun courrier ne vous a été remis pour le moment.';

/** Le destinataire saisi par le praticien, recopié sans ajout. */
export function ligneDestinataire(destinataire: string): string {
  return `À remettre à : ${destinataire}`;
}
