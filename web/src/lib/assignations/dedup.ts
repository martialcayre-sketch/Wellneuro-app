import type { Prisma, PrismaClient } from '@/generated/prisma';

/**
 * Statuts qui rendent une assignation « ouverte » au sens de la déduplication.
 * `Complété` et `Annulée` sont terminaux : ils n'empêchent jamais une
 * repassation (réévaluation instrument par instrument).
 */
export const STATUTS_ASSIGNATION_OUVERTE = ['En attente'] as const;

export const RAISON_DEJA_ASSIGNE = 'deja_assigne';
export const MESSAGE_DEJA_ASSIGNE =
  'Ce questionnaire est déjà assigné à ce patient et en attente de réponse.';

type ClientLecture = PrismaClient | Prisma.TransactionClient;

/**
 * Rend les qids qui portent déjà une assignation ouverte pour ce patient.
 * À appeler sous le verrou de la ligne patient (FOR UPDATE) quand la création
 * suit dans la même transaction — sans quoi la fenêtre TOCTOU réapparaît.
 */
export async function qidsDejaOuverts(
  client: ClientLecture,
  idPatient: string,
  qids: string[],
): Promise<Set<string>> {
  if (qids.length === 0) return new Set();
  const ouvertes = await client.assignation.findMany({
    where: {
      idPatient,
      idQuestionnaire: { in: qids },
      statut: { in: [...STATUTS_ASSIGNATION_OUVERTE] },
    },
    select: { idQuestionnaire: true },
  });
  return new Set(ouvertes.map(a => a.idQuestionnaire));
}

/** Verrouille la ligne patient pour sérialiser vérification + création. */
export async function verrouillerPatient(
  tx: Prisma.TransactionClient,
  idPatient: string,
): Promise<void> {
  await tx.$queryRaw`SELECT id FROM patients WHERE id_patient = ${idPatient} FOR UPDATE`;
}
