import { prisma } from '@/lib/prisma';
import { isSessionAuthorizedForAssignment, readPatientSession } from '@/lib/patient-session';
import { resolveActiveApproval } from '@/lib/protocol/diffusion';
import { resolveActiveVersion } from '@/lib/protocol/versioning';

// Helpers partagés des routes patient portail du protocole (C2A LOT-04/05).
// Auth : cookie portail obligatoire, chemin legacy email-gate exclu (§8.4).
// Résolution du protocole diffusé actif (approbation « pour diffusion » LOT-03).

export type PortailAuthError = { ok: false; reason: 'unauthenticated' | 'not_found'; error: string };
export type PortailAuth = { idPatient: string; idAssignation: string };

// Authentifie via le cookie portail et résout l'assignation d'ancrage du patient
// (la plus récente), re-vérifiée par `isSessionAuthorizedForAssignment` (§8.4).
// Le portail étant token-based, l'assignation est résolue CÔTÉ SERVEUR, jamais
// imposée par le client.
export async function authorizePortail(req: Request): Promise<PortailAuth | PortailAuthError> {
  const session = readPatientSession(req);
  if (!session) {
    return { ok: false, reason: 'unauthenticated', error: 'Connexion au portail requise.' };
  }
  // Départage déterministe. `dateAssignation` est identique pour tous les
  // questionnaires d'un même pack (`assignBasePack`, `packs/assign`) : sans
  // second critère, l'ordre entre égaux suit l'ordre physique des tuples, qui
  // bouge à chaque UPDATE. Deux résolutions successives éliraient alors deux
  // assignations différentes.
  const assignation = await prisma.assignation.findFirst({
    where: { idPatient: session.idPatient },
    orderBy: [{ dateAssignation: 'desc' }, { idAssignation: 'desc' }],
  });
  if (!assignation || !(await isSessionAuthorizedForAssignment(session, assignation))) {
    return { ok: false, reason: 'not_found', error: 'Suivi non reconnu.' };
  }
  return { idPatient: session.idPatient, idAssignation: assignation.idAssignation };
}

/**
 * Ancre du bilan de calibrage : l'identifiant d'assignation réduit aux
 * caractères sûrs. Dérivée ICI et nulle part ailleurs — les deux routes qui
 * l'emploient doivent rendre exactement la même chaîne.
 */
export function ancreDepuisAssignation(idAssignation: string): string {
  return idAssignation.replace(/[^A-Za-z0-9_-]/g, '');
}

// Approbation « pour diffusion » active du patient + date d'ancrage. V1
// mono-protocole : la tête de chaîne la plus récente = protocole courant.
export async function resolveProtocoleDiffuse(
  idPatient: string,
): Promise<{
  protocolDraftId: string;
  protocolDraftInputHash: string;
  decisionCardInputHash: string;
  approvedAt: Date;
  approvedBy: string;
  confirmation: string;
} | null> {
  const approvals = await prisma.protocolDiffusionApproval.findMany({
    where: { idPatient },
    select: {
      id: true,
      protocolDraftId: true,
      protocolDraftInputHash: true,
      supersedesApprovalId: true,
      createdAt: true,
      approvedAt: true,
      decisionCardInputHash: true,
      approvedBy: true,
      confirmation: true,
    },
  });
  const active = resolveActiveApproval(approvals);
  if (!active) return null;
  const row = approvals.find((a) => a.id === active.id);
  if (!row) return null;
  const approvedDraft = await prisma.protocolDraft.findUnique({
    where: { id: row.protocolDraftId },
    select: {
      decisionCardId: true,
      decisionCardInputHash: true,
      inputHash: true,
      status: true,
      reviewedAt: true,
    },
  });
  if (!approvedDraft
    || approvedDraft.inputHash !== row.protocolDraftInputHash
    || approvedDraft.decisionCardInputHash !== row.decisionCardInputHash
    || approvedDraft.status !== 'practitioner_reviewed'
    || approvedDraft.reviewedAt === null
    || row.approvedBy !== 'practitioner'
    || row.confirmation !== 'content_approved_for_diffusion'
    || row.approvedAt.getTime() <= approvedDraft.reviewedAt.getTime()) {
    return null;
  }
  const versions = await prisma.protocolDraft.findMany({
    where: { idPatient, decisionCardId: approvedDraft.decisionCardId },
    select: { id: true, inputHash: true, supersedesDraftId: true, createdAt: true },
  });
  const activeVersion = resolveActiveVersion(versions);
  if (!activeVersion
    || activeVersion.id !== row.protocolDraftId
    || activeVersion.inputHash !== row.protocolDraftInputHash) {
    return null;
  }
  return {
    protocolDraftId: row.protocolDraftId,
    protocolDraftInputHash: row.protocolDraftInputHash,
    decisionCardInputHash: row.decisionCardInputHash,
    approvedAt: row.approvedAt,
    approvedBy: row.approvedBy,
    confirmation: row.confirmation,
  };
}
