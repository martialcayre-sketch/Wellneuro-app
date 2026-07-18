import { prisma } from '@/lib/prisma';
import { isSessionAuthorizedForAssignment, readPatientSession } from '@/lib/patient-session';
import { resolveActiveApproval } from '@/lib/protocol/diffusion';

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
  const assignation = await prisma.assignation.findFirst({
    where: { idPatient: session.idPatient },
    orderBy: { dateAssignation: 'desc' },
  });
  if (!assignation || !(await isSessionAuthorizedForAssignment(session, assignation))) {
    return { ok: false, reason: 'not_found', error: 'Suivi non reconnu.' };
  }
  return { idPatient: session.idPatient, idAssignation: assignation.idAssignation };
}

// Approbation « pour diffusion » active du patient + date d'ancrage. V1
// mono-protocole : la tête de chaîne la plus récente = protocole courant.
export async function resolveProtocoleDiffuse(
  idPatient: string,
): Promise<{ protocolDraftId: string; approvedAt: Date } | null> {
  const approvals = await prisma.protocolDiffusionApproval.findMany({
    where: { idPatient },
    select: {
      id: true,
      protocolDraftId: true,
      protocolDraftInputHash: true,
      supersedesApprovalId: true,
      createdAt: true,
      approvedAt: true,
    },
  });
  const active = resolveActiveApproval(approvals);
  if (!active) return null;
  const row = approvals.find((a) => a.id === active.id);
  if (!row) return null;
  return { protocolDraftId: row.protocolDraftId, approvedAt: row.approvedAt };
}
