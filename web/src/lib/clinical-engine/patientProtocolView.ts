import { canonicalSha256 } from './canonical';
import { MAX_ACTIONS_PROTOCOLE_21J, VERSION_PATIENT_PROTOCOL_VIEW } from './types';
import type {
  DecisionCard,
  PatientProtocolAction,
  PatientProtocolView,
  ProtocolDiffusionApproval,
  ProtocolDraft,
  ProtocolInterventionStatus,
} from './types';

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

function canonicalIso(value: string, field: string): string {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime()) || date.toISOString() !== value) {
    throw new TypeError(`${field} doit être une date ISO canonique valide.`);
  }
  return value;
}

function nonEmpty(value: string, field: string): string {
  if (!value.trim()) throw new TypeError(`${field} est requis.`);
  return value.trim();
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))]
    .sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
}

export function buildPatientProtocolView(input: {
  decisionCard: DecisionCard;
  protocolDraft: ProtocolDraft;
  approval: ProtocolDiffusionApproval;
  patientLimitations?: string[];
}): PatientProtocolView {
  const { decisionCard, protocolDraft, approval } = input;
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
  if (approval.approvedBy !== 'practitioner'
    || approval.confirmation !== 'content_approved_for_diffusion') {
    throw new TypeError('La validation pour diffusion doit être confirmée par le praticien.');
  }
  if (approval.decisionCardInputHash !== decisionCard.inputHash
    || approval.protocolDraftInputHash !== protocolDraft.inputHash) {
    throw new TypeError('La validation pour diffusion ne correspond plus aux objets relus.');
  }
  canonicalIso(approval.approvedAt, 'approvedAt');
  if (approval.approvedAt <= protocolDraft.review.reviewedAt) {
    throw new TypeError('La validation pour diffusion doit être postérieure à la revue.');
  }
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

  const withoutHash = {
    decisionCardId: decisionCard.decisionCardId,
    decisionCardInputHash: decisionCard.inputHash,
    protocolDraftId: protocolDraft.protocolDraftId,
    protocolDraftInputHash: protocolDraft.inputHash,
    selectedPriorityId: selected.candidateId,
    priorityLabel: nonEmpty(candidate.label, 'libellé de priorité'),
    version: VERSION_PATIENT_PROTOCOL_VIEW,
    diffusionStatus: 'approved_for_diffusion' as const,
    deliveryStatus: 'not_transmitted' as const,
    approvedAt: approval.approvedAt,
    purpose: nonEmpty(protocolDraft.purpose, 'raison d’être'),
    followUpCriterion: nonEmpty(protocolDraft.followUpCriterion, 'critère observable à J21'),
    adviceSheetRef: protocolDraft.adviceSheetRef?.trim() || null,
    actions,
    limitations: uniqueSorted(input.patientLimitations ?? []),
  };
  return { ...withoutHash, inputHash: canonicalSha256(withoutHash) };
}
