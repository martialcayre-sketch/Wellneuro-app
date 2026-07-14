import { createPublicId } from '@/lib/ids';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma';

export type PortalAccessFailure = 'patient_not_found' | 'portal_revoked';

export class PortalAccessError extends Error {
  constructor(public readonly reason: PortalAccessFailure) {
    super(reason);
  }
}

export function buildPortalUrl(accessToken: string): string {
  const baseUrl = (process.env.NEXTAUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  return `${baseUrl}/portail/${accessToken}`;
}

type LockedPatientAccess = {
  actif: boolean;
  accessToken: string | null;
  accessTokenRevoked: boolean;
};

export type ActivePortalAccess = { accessToken: string; url: string };

// Verrouille la ligne patient pendant l'opération pour empêcher qu'une
// révocation concurrente soit dépassée par une création d'assignation.
export async function withActivePortalAccess<T>(
  idPatient: string,
  operation: (tx: Prisma.TransactionClient, access: ActivePortalAccess) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async tx => {
    const rows = await tx.$queryRaw<LockedPatientAccess[]>`
      SELECT
        "actif",
        "access_token" AS "accessToken",
        "access_token_revoked" AS "accessTokenRevoked"
      FROM "patients"
      WHERE "id_patient" = ${idPatient}
      FOR UPDATE
    `;
    const patient = rows[0];
    if (!patient?.actif) throw new PortalAccessError('patient_not_found');
    if (patient.accessTokenRevoked) throw new PortalAccessError('portal_revoked');

    let accessToken = patient.accessToken;
    if (!accessToken) {
      accessToken = createPublicId('TOK');
      await tx.patient.update({
        where: { idPatient },
        data: { accessToken, accessTokenCreatedAt: new Date() },
      });
    }
    return operation(tx, { accessToken, url: buildPortalUrl(accessToken) });
  });
}

export async function ensureActivePortalAccess(idPatient: string): Promise<ActivePortalAccess> {
  return withActivePortalAccess(idPatient, async (_tx, access) => access);
}
