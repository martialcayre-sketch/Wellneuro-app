import { canonicalSha256 } from '@/lib/clinical-engine/canonical';
import { VERSION_SCORE_EQUILIBRE } from '@/lib/equilibre/constants';
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

// Épisode T0 déjà persisté, tel que l'appelant le lit pour résoudre le cycle.
export type T0Candidate = {
  id: string;
  cycleId: string | null;
  confirmedAt: Date;
};

// Identité de cycle (gate G2). Fonction PURE : l'appelant fournit les T0 déjà
// persistés du patient, elle désigne le cycle auquel le nouvel épisode
// appartient. Un T0 ouvre son propre cycle ; un jalon postérieur rejoint le
// dernier T0 antérieur ou égal à sa confirmation ; sans T0 antérieur il reste
// `null` — jamais rattaché de force au premier cycle venu.
export function resolveCycleId(params: {
  episode: ConfirmedAssessmentEpisode;
  t0Candidates: T0Candidate[];
}): string | null {
  const { episode, t0Candidates } = params;
  if (episode.milestone === 'T0') return episode.assessmentEpisodeId;

  const confirmedAt = new Date(episode.confirmedAt as string).getTime();
  if (!Number.isFinite(confirmedAt)) return null;

  const anterieurs = t0Candidates
    .filter((t0) => t0.confirmedAt.getTime() <= confirmedAt)
    .sort((a, b) => b.confirmedAt.getTime() - a.confirmedAt.getTime());

  const ancre = anterieurs[0];
  if (!ancre) return null;
  // Une ligne héritée dont le cycle n'a pas été backfillé n'invente rien : on
  // retombe sur son propre id, qui est par construction l'id du cycle qu'elle ouvre.
  return ancre.cycleId ?? ancre.id;
}

// Mapping contrat → colonnes `assessment_episodes` (factorisé depuis la route
// LOT-02). `cycleId` est résolu par l'appelant (gate G2) ; `versionScore` est
// figé à la confirmation — jamais recalculé à la lecture, sinon la garde A8-3
// (« pas de comparaison hors version identique ») serait indéclenchable.
export function toEpisodeCreateInput(
  episode: ConfirmedAssessmentEpisode,
  identiteCycle: { cycleId: string | null },
) {
  return {
    id: episode.assessmentEpisodeId,
    idPatient: episode.patientId,
    milestone: episode.milestone,
    targetAt: new Date(episode.targetAt),
    confirmedAt: new Date(episode.confirmedAt as string),
    payload: episode as unknown as object,
    payloadHash: canonicalSha256(episode),
    contractVersion: VERSION_OBJETS_CLINIQUES,
    cycleId: identiteCycle.cycleId,
    versionScore: VERSION_SCORE_EQUILIBRE,
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
    reviewedAt: draft.status === 'practitioner_reviewed'
      // Les nouveaux contrats conservent la date exacte de revue. Le repli sur
      // updatedAt maintient la lecture des anciens payloads déjà persistés.
      ? new Date(draft.review?.reviewedAt ?? draft.updatedAt)
      : null,
  };
}
