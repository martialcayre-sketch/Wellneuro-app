// Les textes de l'écran « Courrier pour votre médecin » ([[D-262]], LOT-03a).
// Module PUR : les écrans client l'importent.
//
// LA PHRASE D'ACCOMPAGNEMENT EST SIGNÉE (cadrage §4, signée par le responsable
// le 2026-10-03) et recopiée ici AU CARACTÈRE PRÈS, à la typographie des
// apostrophes près (droites au cadrage, courbes à l'écran) : un banc relit le
// cadrage et rougit au premier autre écart, et un autre la passe à
// `termeAnxiogene`. C'est la
// seule prose patient de la surface ; le texte de la lettre, adressé au médecin,
// est exempté par décision (cadrage §3.4, carte de `lib/documents/vocabulaire.ts`).

export const TITRE_LETTRE = 'Courrier pour votre médecin';

export const PHRASE_ACCOMPAGNEMENT =
  'Voici le courrier que je vous ai préparé pour votre médecin traitant. Remettez-le lui lors de votre rendez-vous : vous pouvez l’imprimer ou le montrer depuis ce portail.';

/** Révoqué après remise (cadrage §3.5) : aucun motif servi. */
export const MENTION_RETIREE = 'Votre praticien a retiré ce courrier. Son texte n’est plus affiché.';

export const MENTION_INDISPONIBLE = 'Ce courrier ne peut pas être affiché pour le moment.';

export const AUCUN_COURRIER = 'Aucun courrier ne vous a été remis pour le moment.';

/** « Remis le 4 octobre 2026 », ou rien si la date est illisible. */
export function dateDeRemiseCourrier(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `Remis le ${date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
}
