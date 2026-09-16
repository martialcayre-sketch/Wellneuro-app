import { MAX_ACTIONS_PROTOCOLE_21J } from './types';
import type {
  DecisionCard,
  DecisionPriorityCandidate,
  PatientProtocolAction,
  ProtocolDraft,
  ProtocolInterventionStatus,
} from './types';

// CE QUE LE PATIENT LIT — la description, et elle est ici, seule.
//
// LE DÉFAUT QUE CE MODULE FERME ([[D-200]] dette 1). `buildPatientProtocolView`
// tenait ensemble deux questions distinctes : « ce dossier autorise-t-il un
// contenu patient, et lequel ? » et « ce contenu est-il ATTESTÉ pour
// diffusion ? ». La seconde exige une approbation praticien — donc rien ne
// pouvait être montré AVANT le geste de validation. `ProtocolConsultationPanel`
// en a tiré la conséquence qu'il ne fallait pas : il recomposait la vue patient
// à la main depuis `ProtocolDraft`, sans passer par le contrat, et n'y rendait
// jamais `interventionStatus` — une intervention suspendue s'y lisait comme un
// conseil ferme.
//
// LA SÉPARATION EST LA RÉPONSE, PAS UNE SECONDE DESCRIPTION. Le contenu se
// projette ici ; `patientProtocolView.ts` l'enveloppe d'une attestation et le
// signe. L'aperçu praticien appelle le premier, le portail le second — mais le
// texte, les trois actions et leurs phrases d'attente sortent du MÊME code.
//
// AUCUNE DÉPENDANCE À `crypto` ICI, et c'est structurel : cet aperçu est rendu
// par un composant client sur le chemin fixture, qui ne peut pas importer
// `canonical.ts` (il tire `node:crypto`). La signature reste du côté serveur.

/**
 * Ce qu'un patient lit d'une intervention non ferme (`D-056`, arbitrage 5).
 *
 * Formulations validées, non anxiogènes, et surtout NON DÉDUITES de
 * `waitFor.cible` : « ferritine » est le vocabulaire du praticien, « votre
 * bilan » celui du patient. Une intervention `active` n'a pas d'entrée ici —
 * elle se lit telle quelle, sans mention de statut.
 */
const ATTENTE_PATIENT: Record<Exclude<ProtocolInterventionStatus, 'active'>, string> = {
  conditionnelle_biologie: 'En attente de confirmation par votre bilan.',
  differee: 'Prévu pour plus tard dans votre suivi.',
  contre_indiquee: 'Écarté pour vous par votre praticien.',
  non_indiquee_actuellement: 'Pas indiqué pour vous en ce moment.',
};

// Liste distincte de celle du builder à dessein : ce qu'un patient a le droit
// de voir n'est pas ce qu'un praticien a le droit de composer. Les deux
// nouveaux types V4 y entrent — sans quoi tout protocole portant une action
// `observation` échouerait à la diffusion (`D-056`).
const ACTION_TYPES = [
  'food', 'chronobiology', 'calming_routine', 'gentle_activity',
  'hydration', 'advice_sheet', 'biological_exploration', 'supplement_exploration',
  'observation', 'medical_referral',
] as const;

export function nonEmpty(value: string, field: string): string {
  if (!value.trim()) throw new TypeError(`${field} est requis.`);
  return value.trim();
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))]
    .sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
}

/**
 * Le contenu patient, et rien de l'enveloppe : ni identifiants d'enveloppe, ni
 * empreintes, ni statut de diffusion. Ce sont exactement les champs qu'un écran
 * rend.
 */
export type ContenuPatientProtocole = {
  priorityLabel: string;
  purpose: string;
  followUpCriterion: string;
  adviceSheetRef: string | null;
  actions: PatientProtocolAction[];
  limitations: string[];
};

/**
 * Les gardes de COHÉRENCE du dossier — bloqueurs de la carte, priorité
 * sélectionnée, relecture praticien, correspondance carte↔protocole. Elles ne
 * disent rien de l'attestation de diffusion, qui est une question distincte et
 * postérieure.
 */
export function garderCoherencePatient(input: {
  decisionCard: DecisionCard;
  protocolDraft: ProtocolDraft;
}): { selectedPriorityId: string; candidate: DecisionPriorityCandidate; reviewedAt: string } {
  const { decisionCard, protocolDraft } = input;
  if (decisionCard.abstention.status !== 'not_required') {
    throw new TypeError('L’aperçu patient exige une décision sans abstention requise.');
  }
  if (decisionCard.safetyFindingIds.length > 0) {
    throw new TypeError('Les constats de sécurité bloquent la validation pour diffusion.');
  }
  const selected = decisionCard.selectedMainPriority;
  const candidate = selected && decisionCard.priorityCandidates.find(item => item.candidateId === selected.candidateId);
  if (!selected || !candidate) throw new TypeError('Une priorité praticien valide est requise.');
  if (protocolDraft.status !== 'practitioner_reviewed' || !protocolDraft.review) {
    throw new TypeError('Le protocole doit être relu par le praticien avant diffusion.');
  }
  if (protocolDraft.decisionCardId !== decisionCard.decisionCardId
    || protocolDraft.decisionCardInputHash !== decisionCard.inputHash
    || protocolDraft.selectedPriorityId !== selected.candidateId) {
    throw new TypeError('Le protocole ne correspond pas à la décision sélectionnée.');
  }
  return { selectedPriorityId: selected.candidateId, candidate, reviewedAt: protocolDraft.review.reviewedAt };
}

/**
 * La projection du contenu, une fois la cohérence tenue. Toute action non ferme
 * sort d'ici AVEC sa phrase d'attente : le contrat refuse un statut sans elle,
 * et un statut inconnu est un refus, pas un silence.
 */
export function projeterContenuPatient(input: {
  protocolDraft: ProtocolDraft;
  candidate: DecisionPriorityCandidate;
  patientLimitations?: string[];
}): ContenuPatientProtocole {
  const { protocolDraft, candidate } = input;
  if (protocolDraft.actions.length === 0 || protocolDraft.actions.length > MAX_ACTIONS_PROTOCOLE_21J) {
    throw new TypeError('L’aperçu patient exige entre une et trois actions.');
  }

  const actions: PatientProtocolAction[] = protocolDraft.actions.map(action => {
    if (!(ACTION_TYPES as readonly string[]).includes(action.type)) {
      throw new TypeError('Type d’action patient inconnu.');
    }
    const base: PatientProtocolAction = {
      actionId: nonEmpty(action.actionId, 'actionId'),
      type: action.type,
      title: nonEmpty(action.title, 'intitulé d’action'),
      minimalPlan: nonEmpty(action.minimalPlan, 'plan minimal'),
    };
    // Une intervention non ferme est TOUJOURS accompagnée de sa phrase
    // d'attente : sans elle, le patient lirait un conseil là où le praticien
    // a posé une réserve. Un statut inconnu est un refus, pas un silence.
    const statut = action.interventionStatus;
    if (statut === undefined || statut === 'active') return base;
    const attente = ATTENTE_PATIENT[statut];
    if (attente === undefined) {
      throw new TypeError('Statut d’intervention patient inconnu.');
    }
    return { ...base, interventionStatus: statut, attente };
  });
  if (new Set(actions.map(action => action.actionId)).size !== actions.length) {
    throw new TypeError('Les actions patient doivent avoir des identifiants uniques.');
  }

  return {
    priorityLabel: nonEmpty(candidate.label, 'libellé de priorité'),
    purpose: nonEmpty(protocolDraft.purpose, 'raison d’être'),
    followUpCriterion: nonEmpty(protocolDraft.followUpCriterion, 'critère observable à J21'),
    adviceSheetRef: protocolDraft.adviceSheetRef?.trim() || null,
    actions,
    limitations: uniqueSorted(input.patientLimitations ?? []),
  };
}

/**
 * Le contenu patient d'un protocole, SANS attestation de diffusion — ce que le
 * patient lirait si ce protocole lui était diffusé aujourd'hui.
 *
 * CE QU'IL NE PRODUIT PAS, et l'omission est le point : ni `diffusionStatus`,
 * ni `approvedAt`, ni empreinte signée. Un aperçu n'atteste rien, et aucun objet
 * sorti d'ici ne peut être pris pour une vue approuvée.
 */
export function buildContenuPatientProtocole(input: {
  decisionCard: DecisionCard;
  protocolDraft: ProtocolDraft;
  patientLimitations?: string[];
}): ContenuPatientProtocole {
  const { candidate } = garderCoherencePatient(input);
  return projeterContenuPatient({
    protocolDraft: input.protocolDraft,
    candidate,
    patientLimitations: input.patientLimitations,
  });
}

/**
 * Ce qu'un aperçu praticien rend : le contenu, ou le MOTIF de son absence.
 *
 * Les trois motifs sont les trois crans où l'aperçu peut s'arrêter — la carte
 * de décision ne se rejoue plus, le contenu persisté ne se relit pas, ou le
 * contrat patient refuse. Le type est déclaré ICI, avec le contrat, et non dans
 * la route : c'est le défaut que [[D-191]] a fermé sur la vue patient, où la
 * route et l'écran décrivaient chacun le leur.
 */
export type ApercuPatientServi =
  | { ok: true; contenu: ContenuPatientProtocole }
  | {
      ok: false;
      motif: 'carte_non_rejouable' | 'payload_illisible' | 'contrat_refuse';
      detail: string;
    };

/**
 * La même question que `vuePatientOuRefus`, posée un cran plus tôt : « que
 * lirait ce patient si ce protocole lui était diffusé ? ».
 *
 * LE REFUS EST UN FAIT À DIRE, pas une exception à rattraper en silence : un
 * aperçu vide apprendrait au praticien qu'il n'a rien à montrer, jamais
 * POURQUOI. La forme est celle de `ServiceAuPatient`, à dessein — les deux
 * réponses se lisent pareil.
 */
export function apercuContenuPatient(input: {
  decisionCard: DecisionCard;
  protocolDraft: ProtocolDraft;
  patientLimitations?: string[];
}): ApercuPatientServi {
  try {
    return { ok: true, contenu: buildContenuPatientProtocole(input) };
  } catch (erreur) {
    return {
      ok: false,
      motif: 'contrat_refuse',
      detail: erreur instanceof Error ? erreur.message : String(erreur),
    };
  }
}
