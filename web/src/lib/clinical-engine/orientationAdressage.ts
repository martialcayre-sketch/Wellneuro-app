import type { ProtocolAction } from './types';

// L'ACTION D'ORIENTATION VERS LE MÉDECIN — [[D-257]] §8-9, LOT-05.
//
// UN TEXTE SIGNÉ, ET LE SEUL. Rédigé par l'équipe, signé par le responsable le
// 2026-10-02 et recopié ici AU CARACTÈRE PRÈS depuis `D-257` §9 — un banc relit
// la décision et rougit au premier écart. Ni « alerte », ni signal nommé, ni
// délai chiffré ; le repère d'urgence proposé n'a pas été retenu.
//
// MODULE FEUILLE, LISIBLE PAR LE NAVIGATEUR : le constructeur de protocole
// affiche ce texte tel qu'il partira, et le moteur l'exige tel quel. Une seule
// source pour les deux — deux recopies finiraient par diverger.
//
// CE QUE CETTE ACTION EST, ET N'EST PAS (A4, A11). Elle n'est pas une
// intervention : elle ne compte pas dans `MAX_ACTIONS_PROTOCOLE_21J` et ne pèse
// pas dans la charge. Elle n'est pas un choix du praticien : dès qu'un constat
// est adressé, elle ouvre le protocole, et elle ne se retire pas tant que la
// levée tient.

/** Identifiant réservé : aucune autre action ne peut le porter. */
export const ACTION_ID_ORIENTATION = 'orientation-medecin';

export const TEXTE_ORIENTATION = Object.freeze({
  title: 'Consulter votre médecin',
  idealPlan: 'Prendre rendez-vous avec votre médecin traitant dès que possible et lui remettre le courrier que je vous ai préparé.',
  minimalPlan: 'Appeler le cabinet de votre médecin pour fixer ce rendez-vous.',
  rescuePlan: 'Si vous ne parvenez pas à obtenir de rendez-vous, prévenez-moi : nous chercherons ensemble une autre solution.',
});

/** La carte porte-t-elle au moins un constat adressé ? Alors l'orientation est due. */
export function orientationRequise(card: { safetyFindingAdresseIds?: string[] } | null | undefined): boolean {
  return (card?.safetyFindingAdresseIds?.length ?? 0) > 0;
}

/** L'action telle qu'elle part en tête du protocole ; `active` sur un contrat V4. */
export function actionOrientation(contratV4: boolean): ProtocolAction {
  return {
    actionId: ACTION_ID_ORIENTATION,
    type: 'medical_referral',
    ...TEXTE_ORIENTATION,
    limitations: [],
    ...(contratV4 ? { interventionStatus: 'active' as const } : {}),
  };
}

/** Cette action est-elle l'orientation réservée (identifiant ET type) ? */
export function estActionOrientation(action: { actionId: string; type: string }): boolean {
  return action.actionId === ACTION_ID_ORIENTATION && action.type === 'medical_referral';
}
