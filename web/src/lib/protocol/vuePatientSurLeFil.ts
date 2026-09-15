import type { PatientFoodCompassSafeView } from '@/lib/food-compass/patientSafe';
import type {
  PatientProtocolView,
  ProtocolActionType,
  ProtocolInterventionStatus,
} from '@/lib/clinical-engine/types';

// CE QUE LE PATIENT REÇOIT SUR LE FIL — une seule description, ici, et nulle
// part ailleurs ([[D-191]]).
//
// LE DÉFAUT QUE CE MODULE FERME. La route du portail décrivait la vue patient
// dans son propre type ; `PatientCompanionHome` en redéclarait un second, plus
// pauvre, et castait le JSON dedans. Les deux ne se voyaient pas : la route
// pouvait servir un champ que l'écran ignorait, et `tsc` restait vert. C'est
// ainsi que `followUpCriterion` a voyagé des mois dans le JSON sans qu'aucun
// écran ne l'affiche. Le contrat `c1-patient-protocol-view-v2` produit ; ce
// module PROJETTE pour le fil ; les deux bouts lisent le même type.
//
// POURQUOI UNE PROJECTION PLUTÔT QUE LE CONTRAT TEL QUEL. Le contrat porte les
// identifiants d'enveloppe (`decisionCardId`, `protocolDraftId`) et les trois
// empreintes : l'identité interne du dossier n'a rien à faire dans un navigateur
// patient. `cycleRef`, opaque et tronquée, reste la seule référence de cycle
// servie.

/** Longueur de la référence de cycle servie au patient — préfixe, jamais l'empreinte. */
export const LONGUEUR_CYCLE_REF = 16;

export type ActionPatient = {
  actionId: string;
  type: ProtocolActionType;
  title: string;
  minimalPlan: string;
  /**
   * Présents ENSEMBLE ou pas du tout : le contrat refuse un statut sans sa
   * phrase d'attente. Une intervention `active` n'en porte aucun — elle se lit
   * telle quelle.
   */
  interventionStatus?: ProtocolInterventionStatus;
  attente?: string;
};

export type VuePatientSurLeFil = {
  /**
   * Le libellé d'axe SIGNÉ, recopié du registre des priorités par la carte
   * rejouée — jamais un texte fabriqué. Registre non signé ⇒ aucun candidat ⇒
   * le contrat refuse, et le patient lit une indisponibilité ([[D-115]]).
   */
  priorityLabel: string;
  purpose: string;
  followUpCriterion: string;
  adviceSheetRef: string | null;
  /** LES TROIS, dans l'ordre du protocole relu. */
  actions: ActionPatient[];
  limitations: string[];
  boussoles: PatientFoodCompassSafeView[];
  /**
   * Référence opaque du cycle diffusé (préfixe du hash d'ancrage du protocole) :
   * elle ne porte aucun contenu clinique et sert à donner au carnet alimentaire
   * un identifiant d'épisode distinct d'un cycle à l'autre.
   */
  cycleRef: string;
  /** Date d'approbation de la diffusion — début du cycle vécu par le patient. */
  debutCycle: string;
};

/**
 * La projection, et elle n'invente rien : chaque champ est recopié du contrat.
 *
 * Les champs ÉCARTÉS le sont nommément — `decisionCardId`, `protocolDraftId`,
 * les trois empreintes, `inputHash`, `version`, `diffusionStatus`,
 * `deliveryStatus`, `approvedAt` : identité interne et états de la mécanique.
 */
export function projeterSurLeFil(input: {
  vue: PatientProtocolView;
  boussoles: PatientFoodCompassSafeView[];
  cycleRef: string;
  debutCycle: string;
}): VuePatientSurLeFil {
  return {
    priorityLabel: input.vue.priorityLabel,
    purpose: input.vue.purpose,
    followUpCriterion: input.vue.followUpCriterion,
    adviceSheetRef: input.vue.adviceSheetRef,
    actions: input.vue.actions.map(action => ({
      actionId: action.actionId,
      type: action.type,
      title: action.title,
      minimalPlan: action.minimalPlan,
      ...(action.interventionStatus ? { interventionStatus: action.interventionStatus } : {}),
      ...(action.attente ? { attente: action.attente } : {}),
    })),
    limitations: input.vue.limitations,
    boussoles: input.boussoles,
    cycleRef: input.cycleRef,
    debutCycle: input.debutCycle,
  };
}
