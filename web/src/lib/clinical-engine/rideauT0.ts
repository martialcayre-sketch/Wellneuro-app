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

import { AGENDA_ALI_ID } from '../agenda-alimentaire/types';
import { AGENDA_SOMMEIL_ID } from '../agenda-sommeil/types';

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
 * LES AGENDAS NE COMPOSENT AUCUN RIDEAU — ni le premier, ni le second.
 *
 * LE PREMIER LES EXCLUAIT DÉJÀ, et par une phrase qui n'a jamais valu que pour
 * lui : « un agenda du sommeil sur 21 nuits ne peut pas conditionner un point
 * de décision qui se prend à J0 » (`HORS_RIDEAU_MOTIVE`, ci-dessus). Le SECOND
 * rideau, lui, n'avait aucune exclusion — et un agenda alimentaire de 21 jours
 * s'y invitait, bloquant le `T0` exactement pour la raison que la doctrine
 * avait nommée quelques lignes plus haut.
 *
 * CONSTATÉ EN PRODUCTION, par conteneur : un agenda alimentaire assigné le 5
 * août, deux journées renseignées le jour même puis plus rien. Au 2026-09-13,
 * **cinq dossiers portent un agenda alimentaire en attente** (assignés du 5 août
 * au 7 septembre) et **cinq un agenda du sommeil** (du 2 au 12 septembre).
 *
 * LA RAISON EST CLINIQUE, ET ELLE EST DU RESPONSABLE ([[D-176]], arbitrage
 * rendu en session le 2026-09-13) : **un agenda est un outil d'AJUSTEMENT, pas
 * de constat.** Il accompagne une conduite déjà décidée ; il n'établit pas
 * l'état de départ sur lequel cette conduite se décide. Faire garder le point
 * d'entrée par un recueil qui court sur trois semaines, c'est faire attendre la
 * décision par l'outil qui devait la suivre.
 *
 * CE QUE CETTE EXCLUSION NE FAIT PAS. Elle ne retire l'agenda de rien d'autre :
 * il reste assigné, se remplit jour après jour, se clôture, et sa passation
 * entre au dossier comme n'importe quelle autre. Elle dit seulement qu'il ne
 * GARDE aucun point de décision — et donc, par la condition sœur de fraîcheur,
 * qu'une journée d'agenda ne périme plus une synthèse validée.
 *
 * CONSÉQUENCE ASSUMÉE : un dossier dont la SEULE assignation postérieure à la
 * synthèse est un agenda n'a plus de second rideau du tout, et lit « reste à
 * composer » au lieu de « incomplet ». C'est plus juste — un agenda ne
 * constitue pas une exploration.
 */
export const AGENDAS_HORS_RIDEAU = [AGENDA_SOMMEIL_ID, AGENDA_ALI_ID] as const;

/** Est-ce un agenda, donc hors de tout rideau ? */
export function estAgendaHorsRideau(idQuestionnaire: string): boolean {
  return (AGENDAS_HORS_RIDEAU as readonly string[]).includes(idQuestionnaire);
}

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
