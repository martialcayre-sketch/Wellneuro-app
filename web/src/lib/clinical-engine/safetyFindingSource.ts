// La SOURCE d'un constat de sécurité, lisible depuis son identifiant.
//
// MODULE FEUILLE — il n'importe rien, et il ne porte que des libellés. C'est ce
// qui l'autorise à être lu par un composant client : `lib/clinical` est fermé au
// bundle du navigateur (`bundleClient.guard.test.ts`), et `safetyFindings.ts`
// importe la table signée, donc `crypto` et le référentiel entier.
//
// POURQUOI IL EXISTE. `review.safetyFindings` mélange TROIS producteurs : les
// signaux d'alerte déclarés à l'anamnèse ([[D-099]]), les signalements d'effet
// indésirable rattachés à un protocole ([[D-101]]) et les réponses aux questions
// sur le suicide des questionnaires ([[D-275]] §2). Ils inhibent la décision de
// la même façon, mais ils n'appellent pas le même geste — la lettre d'adressage
// ([[D-218]]) sait écrire le premier et le troisième, jamais le second. Offrir le
// geste sur un dossier qui ne porte que des effets indésirables, c'était offrir
// un bouton dont la route répond 409.
//
// Le préfixe EST le contrat du producteur : il le compose ici, l'écran le lit
// ici, et une seule constante les tient ensemble.

/** Préfixe des constats issus des signaux d'alerte DÉCLARÉS à l'anamnèse. */
export const PREFIXE_FINDING_ANAMNESE = 'safety:anamnese:';

/** Préfixe des constats issus d'un signalement d'effet indésirable. */
export const PREFIXE_FINDING_EFFET_INDESIRABLE = 'safety:effet-indesirable:';

/** Préfixe des constats issus d'une réponse à une question sur le suicide ([[D-275]] §2). */
export const PREFIXE_FINDING_QUESTIONNAIRE = 'safety:questionnaire:';

/**
 * `true` si ce constat vient d'un signal d'alerte déclaré à l'anamnèse.
 *
 * Un identifiant inconnu rend `false` : l'éligibilité au geste ne se PRÉSUME
 * pas. Un producteur neuf n'ouvre pas la lettre d'adressage par accident — il
 * vient s'inscrire ici, ou il reste hors du geste.
 */
export function estFindingAnamnese(findingId: unknown): boolean {
  return typeof findingId === 'string' && findingId.startsWith(PREFIXE_FINDING_ANAMNESE);
}

/** `true` si ce constat vient d'une réponse de questionnaire ([[D-275]] §2). */
export function estFindingQuestionnaire(findingId: unknown): boolean {
  return typeof findingId === 'string' && findingId.startsWith(PREFIXE_FINDING_QUESTIONNAIRE);
}

/**
 * `true` si une lettre d'adressage peut couvrir ce constat : anamnèse ou
 * questionnaire. Même règle que l'éligibilité — elle ne se PRÉSUME pas, un
 * producteur neuf vient s'inscrire ici.
 */
export function estFindingAdressable(findingId: unknown): boolean {
  return estFindingAnamnese(findingId) || estFindingQuestionnaire(findingId);
}

/**
 * Une couverture d'adressage ACTIVE ([[D-257]], LOT-04) : une lettre consignée,
 * non révoquée, sur la consultation porteuse courante. `lireCouverturesAdressage`
 * a déjà écarté tout le reste. Déclarée ici, module feuille, parce que l'écran
 * la lit aussi : la réponse du cockpit la sert à côté de la carte.
 */
export type CouvertureAdressage = {
  idAdressage: string;
  idCorrespondance: string;
  findingIds: string[];
  /** ISO, posé par la base à la consignation. */
  acteLe: string;
};
