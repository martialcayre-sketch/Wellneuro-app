import { canonicalSha256 } from './canonical';
import {
  garderCoherencePatient,
  projeterContenuPatient,
} from './contenuPatientProtocole';
import { VERSION_PATIENT_PROTOCOL_VIEW } from './types';
import type {
  DecisionCard,
  PatientProtocolView,
  ProtocolDiffusionApproval,
  ProtocolDraft,
} from './types';

// L'ATTESTATION, et elle seule. Le CONTENU que le patient lit est projeté par
// `contenuPatientProtocole.ts` — une seule description, partagée avec l'aperçu
// que le praticien consulte avant de valider ([[D-200]] dette 1). Ce module
// ajoute ce que l'aperçu n'a pas le droit de porter : les gardes de
// l'approbation praticien, l'enveloppe d'identité et la signature.

function canonicalIso(value: string, field: string): string {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime()) || date.toISOString() !== value) {
    throw new TypeError(`${field} doit être une date ISO canonique valide.`);
  }
  return value;
}

export function buildPatientProtocolView(input: {
  decisionCard: DecisionCard;
  protocolDraft: ProtocolDraft;
  approval: ProtocolDiffusionApproval;
  patientLimitations?: string[];
}): PatientProtocolView {
  const { decisionCard, protocolDraft, approval } = input;
  const { selectedPriorityId, candidate, reviewedAt } = garderCoherencePatient({ decisionCard, protocolDraft });
  if (approval.approvedBy !== 'practitioner'
    || approval.confirmation !== 'content_approved_for_diffusion') {
    throw new TypeError('La validation pour diffusion doit être confirmée par le praticien.');
  }
  if (approval.decisionCardInputHash !== decisionCard.inputHash
    || approval.protocolDraftInputHash !== protocolDraft.inputHash) {
    throw new TypeError('La validation pour diffusion ne correspond plus aux objets relus.');
  }
  canonicalIso(approval.approvedAt, 'approvedAt');
  if (approval.approvedAt <= reviewedAt) {
    throw new TypeError('La validation pour diffusion doit être postérieure à la revue.');
  }

  const contenu = projeterContenuPatient({
    protocolDraft,
    candidate,
    patientLimitations: input.patientLimitations,
  });

  const withoutHash = {
    decisionCardId: decisionCard.decisionCardId,
    decisionCardInputHash: decisionCard.inputHash,
    protocolDraftId: protocolDraft.protocolDraftId,
    protocolDraftInputHash: protocolDraft.inputHash,
    selectedPriorityId,
    version: VERSION_PATIENT_PROTOCOL_VIEW,
    diffusionStatus: 'approved_for_diffusion' as const,
    deliveryStatus: 'not_transmitted' as const,
    approvedAt: approval.approvedAt,
    ...contenu,
  };
  return { ...withoutHash, inputHash: canonicalSha256(withoutHash) };
}
