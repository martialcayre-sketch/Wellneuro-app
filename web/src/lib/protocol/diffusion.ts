// Approbation « pour diffusion » (C2A LOT-03 Part B). Le contrat
// ProtocolDiffusionApproval matérialise la validation praticien, distincte de la
// relecture. On valide ici les invariants sans recharger la DecisionCard (non
// persistée, §8.0) : les gardes cliniques (abstention/sécurité/priorité) ont déjà
// été franchies à la construction du draft `practitioner_reviewed`. L'approbation
// est ANCRÉE sur la version (protocol_draft_input_hash) : elle devient caduque dès
// qu'une nouvelle version est enregistrée.

export const DIFFUSION_CONFIRMATION = 'content_approved_for_diffusion' as const;

export type DiffusionVersionRow = {
  inputHash: string;
  decisionCardInputHash: string;
  status: string;
  reviewedAt: Date | null;
};

export type DiffusionApprovalInput = {
  decisionCardInputHash: string;
  protocolDraftInputHash: string;
  approvedAt: string; // ISO
  approvedBy: string;
  confirmation: string;
};

export function validateDiffusionApproval(params: {
  version: DiffusionVersionRow;
  approval: DiffusionApprovalInput;
}): { ok: true } | { ok: false; reason: string } {
  const { version, approval } = params;
  if (version.status !== 'practitioner_reviewed' || version.reviewedAt === null) {
    return { ok: false, reason: 'not_reviewed' };
  }
  if (approval.approvedBy !== 'practitioner' || approval.confirmation !== DIFFUSION_CONFIRMATION) {
    return { ok: false, reason: 'invalid_confirmation' };
  }
  if (
    approval.protocolDraftInputHash !== version.inputHash ||
    approval.decisionCardInputHash !== version.decisionCardInputHash
  ) {
    return { ok: false, reason: 'anchor_mismatch' };
  }
  // L'approbation doit être postérieure à la relecture (jamais antidatée).
  if (new Date(approval.approvedAt).getTime() <= version.reviewedAt.getTime()) {
    return { ok: false, reason: 'not_after_review' };
  }
  return { ok: true };
}

export type PersistedApprovalRow = {
  id: string;
  protocolDraftInputHash: string;
  supersedesApprovalId: string | null;
  createdAt: Date;
};

// Approbation active = tête de chaîne (aucune autre ne la supplante), la plus
// récente en cas d'égalité.
export function resolveActiveApproval<T extends PersistedApprovalRow>(rows: T[]): T | null {
  if (rows.length === 0) return null;
  const superseded = new Set(
    rows.map((row) => row.supersedesApprovalId).filter((id): id is string => id !== null),
  );
  const heads = rows.filter((row) => !superseded.has(row.id));
  const pool = heads.length > 0 ? heads : rows;
  return [...pool].sort((left, right) => {
    const delta = right.createdAt.getTime() - left.createdAt.getTime();
    if (delta !== 0) return delta;
    return left.id < right.id ? 1 : left.id > right.id ? -1 : 0;
  })[0];
}

// Une approbation est caduque si elle n'ancre plus la version active du protocole.
export function isApprovalStale(
  approval: PersistedApprovalRow | null,
  activeVersionInputHash: string | null,
): boolean {
  if (!approval || activeVersionInputHash === null) return false;
  return approval.protocolDraftInputHash !== activeVersionInputHash;
}
