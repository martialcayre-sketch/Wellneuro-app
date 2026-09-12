/**
 * La composition des deux rideaux d'entrée — la liste, et rien d'autre.
 *
 * MODULE FEUILLE, et pour la même raison que `clinical/stopRulesLibelles.ts` :
 * un composant CLIENT a besoin de savoir lequel des questionnaires en attente
 * d'un dossier appartient au rideau T0, et il ne doit pas tirer
 * `preconditionsT0.ts` dans son bundle — celui-ci importe `orientationService`,
 * dont le module instancie le client Prisma au chargement.
 *
 * Le contournement précédent est visible dans `lib/fil/cartes.ts`, qui reçoit
 * `tailleRideauT0` en paramètre plutôt que d'importer la constante. Ce module
 * ferme le besoin à la source ; `cartes.ts` n'est pas touché pour autant — son
 * paramètre reste correct.
 *
 * CES DEUX CONSTANTES SONT DÉPLACÉES, PAS RECOPIÉES, et `preconditionsT0.ts`
 * les ré-exporte : la table clinique de [[D-052]] reste unique, et tous ses
 * lecteurs existants continuent de l'importer là où ils l'importaient.
 */

/**
 * Le rideau T0 — table clinique signée par [[D-052]], et non composition du
 * pack de base.
 *
 * PAS DÉRIVÉ DU PACK, délibérément : le pack est une ligne en base éditable
 * depuis l'UI, et une divergence registre↔pack a déjà été journalisée le
 * 2026-08-03. Dériver le rideau du pack ferait déplacer une règle clinique par
 * un geste administratif (`DC-26`).
 *
 * `Q_SOM_09` EST AU PACK DE BASE SEEDÉ ET N'EST PAS ICI : un agenda du sommeil
 * sur 21 nuits ne peut pas conditionner un point de décision qui se prend à J0.
 * L'écran doit l'expliquer, sans quoi l'exclusion se lit comme un oubli.
 *
 * `Q_ALI_01` est accepté DANS L'UNE OU L'AUTRE DE SES FORMES (14 ou 57 items
 * selon `WN_ALI_01_SIIN57`). Exiger la forme longue rendrait le T0
 * inconfirmable partout où le drapeau est éteint — soit partout aujourd'hui.
 * Le repère de synthèse, lui, continue de s'abstenir sur cet identifiant
 * ([[D-051]]) : constater une passation et désigner celle qui fait foi ne
 * demandent pas la même certitude.
 */
export const RIDEAU_T0 = ['Q_MOD_03', 'Q_MOD_01', 'Q_INF_03', 'Q_ALI_01'] as const;

/** Instrument du pack de base volontairement hors rideau — motivé ci-dessus. */
export const HORS_RIDEAU_MOTIVE = ['Q_SOM_09'] as const;

/**
 * Appartient-il au rideau T0 ?
 *
 * Le prédicat est ici plutôt que chez ses appelants pour une raison de type :
 * `RIDEAU_T0` est un tuple `readonly` d'identifiants littéraux, et
 * `RIDEAU_T0.includes(id)` ne compile pas sur un `string` quelconque. Chaque
 * appelant devait donc écrire le même `[...RIDEAU_T0].includes(...)` — trois
 * occurrences aujourd'hui, dont deux dans des bancs.
 */
export function estDuRideauT0(idQuestionnaire: string): boolean {
  return (RIDEAU_T0 as readonly string[]).includes(idQuestionnaire);
}
