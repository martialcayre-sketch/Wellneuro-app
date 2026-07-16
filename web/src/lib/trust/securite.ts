import type { OrientationEI, SeveriteDeclaree } from './types';

/**
 * TRUST V1 — règle d'orientation d'un signalement d'effet indésirable
 * (LOT-01, gate G-TRUST-05).
 *
 * Règle déterministe, versionnée, sans aucun seuil caché ni LLM : elle
 * aiguille un MESSAGE d'orientation à partir de la sévérité DÉCLARÉE par le
 * patient. Elle ne calcule rien, ne déduit aucune causalité et ne modifie
 * aucun scoring. Propriétaire clinique : le praticien (validation par
 * relecture de la PR de lot — GATES_GO_NO_GO.md). Toute évolution = nouvelle
 * version + documentation CHANGELOG.
 */
export const REGLE_ORIENTATION_EI = Object.freeze({
  id: 'orientation-effet-indesirable',
  version: 'v1',
  source: 'sévérité déclarée par le patient (aucune analyse de texte libre)',
  proprietaire: 'praticien',
} as const);

const MESSAGES: Record<OrientationEI, string> = {
  urgence_conseillee:
    'Si vous ressentez en ce moment des symptômes graves ou inquiétants, contactez ' +
    'immédiatement le 15 (SAMU) ou le 112. Wellneuro n’est pas un service d’urgence ' +
    'et vos signalements ne sont pas surveillés en continu. Votre signalement sera ' +
    'examiné par votre praticien.',
  contact_medical_conseille:
    'Nous vous conseillons d’en parler rapidement à votre médecin traitant ou à votre ' +
    'praticien. Ne modifiez pas un traitement prescrit sans l’accord du prescripteur. ' +
    'Votre signalement sera examiné par votre praticien, sans garantie de délai.',
  revue_praticien:
    'Votre signalement a bien été enregistré. Il sera examiné par votre praticien lors ' +
    'de sa prochaine revue. Si les symptômes s’aggravent, rapprochez-vous de votre ' +
    'médecin ou utilisez les numéros d’urgence habituels.',
};

export function orienterEffetIndesirable(severite: SeveriteDeclaree): {
  orientation: OrientationEI;
  messagePatient: string;
  regleId: string;
  regleVersion: string;
} {
  const orientation: OrientationEI =
    severite === 'severe'
      ? 'urgence_conseillee'
      : severite === 'moderee'
        ? 'contact_medical_conseille'
        : 'revue_praticien';
  return {
    orientation,
    messagePatient: MESSAGES[orientation],
    regleId: REGLE_ORIENTATION_EI.id,
    regleVersion: REGLE_ORIENTATION_EI.version,
  };
}

/**
 * Projection des choix courants depuis les événements append-only : pour
 * chaque finalité, le dernier événement (par date d'enregistrement) fait
 * foi ; rien n'est jamais écrasé ni supprimé.
 */
export function projeterChoixCourants<
  T extends { finalite: string; statut: string; enregistreLe: string },
>(evenements: T[]): Map<string, T> {
  const courants = new Map<string, T>();
  for (const evenement of [...evenements].sort((a, b) => a.enregistreLe.localeCompare(b.enregistreLe))) {
    courants.set(evenement.finalite, evenement);
  }
  return courants;
}
