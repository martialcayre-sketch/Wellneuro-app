import { canonicalSha256 } from '@/lib/clinical-engine/canonical';
import {
  VERSION_OBJETS_CLINIQUES,
  type ConfirmedAssessmentEpisode,
  type DecisionCard,
  type ProtocolDraft,
} from '@/lib/clinical-engine/types';

// Versionnement du protocole (C2A LOT-03). Le contrat `reviseProtocolDraft`
// réutilise le même `protocolDraftId` et ne porte aucun pointeur de version : le
// chaînage append-only est donc produit ici, côté persistance, sans nouvelle
// migration. L'id de ligne encode le `protocolDraftId` en préfixe (recouvrable)
// suivi de l'`inputHash` du contenu — déviation assumée vs spec §8.6, consignée
// dans l'en-tête de la route et le SESSION_LOG.

// id de ligne de version = `${protocolDraftId}#${inputHash}`.
// Même contenu (timestamps compris) re-soumis → même id → upsert no-op
// (idempotence LOT-02 préservée) ; contenu différent → nouvelle ligne.
export function deriveVersionId(protocolDraftId: string, inputHash: string): string {
  return `${protocolDraftId}#${inputHash}`;
}

// Un protocole logique = un fil de versions regroupé par carte de décision.
// L'id logique est stable à travers les révisions du même `decisionCard`.
export function deriveProtocolDraftId(decisionCardId: string): string {
  return `proto_${decisionCardId}`;
}

// Sous-ensemble d'une ligne persistée sur lequel le versionnement raisonne.
export type PersistedVersionRow = {
  id: string;
  inputHash: string;
  supersedesDraftId: string | null;
  createdAt: Date;
};

// Version active = tête de fil : la ligne qu'aucune autre ne supplante (aucun
// `supersedesDraftId` ne pointe vers elle), la plus récente en cas d'égalité.
export function resolveActiveVersion<T extends PersistedVersionRow>(rows: T[]): T | null {
  if (rows.length === 0) return null;
  const superseded = new Set(
    rows.map((row) => row.supersedesDraftId).filter((id): id is string => id !== null),
  );
  const heads = rows.filter((row) => !superseded.has(row.id));
  const pool = heads.length > 0 ? heads : rows;
  return [...pool].sort((left, right) => {
    const delta = right.createdAt.getTime() - left.createdAt.getTime();
    if (delta !== 0) return delta;
    return left.id < right.id ? 1 : left.id > right.id ? -1 : 0;
  })[0];
}

// Empreinte de contenu CLINIQUE, volontairement sans horodatage ni review : deux
// enregistrements au même contenu clinique (mais timestamps différents) ne créent
// pas de nouvelle version. C'est le critère « changement clinique défini » du lot.
export function clinicalContentHash(draft: ProtocolDraft): string {
  return canonicalSha256({
    decisionCardId: draft.decisionCardId,
    decisionCardInputHash: draft.decisionCardInputHash,
    selectedPriorityId: draft.selectedPriorityId,
    purpose: draft.purpose,
    followUpCriterion: draft.followUpCriterion,
    adviceSheetRef: draft.adviceSheetRef,
    actions: draft.actions,
    therapeuticLoad: draft.therapeuticLoad,
    limitations: draft.limitations,
  });
}

export function isClinicalChange(
  activeDraft: ProtocolDraft | null,
  nextDraft: ProtocolDraft,
): boolean {
  if (!activeDraft) return true;
  return clinicalContentHash(activeDraft) !== clinicalContentHash(nextDraft);
}

// Mapping contrat → colonnes `assessment_episodes` (factorisé depuis la route
// LOT-02, comportement inchangé).
export function toEpisodeCreateInput(episode: ConfirmedAssessmentEpisode) {
  return {
    id: episode.assessmentEpisodeId,
    idPatient: episode.patientId,
    milestone: episode.milestone,
    targetAt: new Date(episode.targetAt),
    confirmedAt: new Date(episode.confirmedAt as string),
    payload: episode as unknown as object,
    payloadHash: canonicalSha256(episode),
    contractVersion: VERSION_OBJETS_CLINIQUES,
  };
}

// Mapping contrat → colonnes `protocol_drafts`. L'`id` de ligne et le
// `supersedesDraftId` sont fournis par l'appelant : la route LOT-02 passe
// `id = protocolDraftId` sans supersedes (idempotence historique), la route de
// versionnement passe `id = deriveVersionId(...)` + supersedes = version active.
export function toDraftCreateInput(params: {
  id: string;
  draft: ProtocolDraft;
  decisionCard: DecisionCard;
  episode: ConfirmedAssessmentEpisode;
  supersedesDraftId: string | null;
}) {
  const { id, draft, decisionCard, episode, supersedesDraftId } = params;
  return {
    id,
    idPatient: episode.patientId,
    assessmentEpisodeId: episode.assessmentEpisodeId,
    decisionCardId: decisionCard.decisionCardId,
    decisionCardInputHash: decisionCard.inputHash,
    snapshotInputHash: decisionCard.snapshotInputHash,
    reviewInputHash: decisionCard.reviewInputHash,
    selectedPriorityId: draft.selectedPriorityId,
    status: draft.status,
    payload: draft as unknown as object,
    inputHash: draft.inputHash,
    contractVersion: draft.version,
    supersedesDraftId,
    reviewedAt: draft.status === 'practitioner_reviewed' ? new Date(draft.updatedAt) : null,
  };
}
