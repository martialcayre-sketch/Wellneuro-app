import type { Prisma, PrismaClient } from '@/generated/prisma';

/**
 * Statuts TERMINAUX d'une assignation : ils n'empêchent jamais une repassation
 * (réévaluation instrument par instrument). Tout autre statut — connu ou
 * inconnu — est traité comme ouvert et bloque un doublon (fail-closed) : même
 * convention d'exclusion que `agenda-sommeil/suivi` (`not: 'Annulée'`) et
 * `portail/session` (`not: 'Complété'`), et un statut ajouté demain resserre
 * le garde au lieu de le trouer.
 */
export const STATUTS_ASSIGNATION_TERMINAL = ['Complété', 'Annulée'] as const;

// Réexportés depuis `messages.ts` : les écrans ont besoin du même texte de
// refus que la route. Ils POURRAIENT importer ce module-ci — son import Prisma
// est un `import type`, effacé à la compilation — mais un module de messages
// sans dépendance serveur ne dépend pas de cette propriété pour le rester.
export { MESSAGE_DEJA_ASSIGNE, RAISON_DEJA_ASSIGNE } from './messages';

type ClientLecture = PrismaClient | Prisma.TransactionClient;

/**
 * Rend les qids qui portent déjà une assignation ouverte (statut non terminal)
 * pour ce patient. À appeler sous le verrou de la ligne patient (FOR UPDATE)
 * quand la création suit dans la même transaction — sans quoi la fenêtre
 * TOCTOU réapparaît.
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
      statut: { notIn: [...STATUTS_ASSIGNATION_TERMINAL] },
    },
    select: { idQuestionnaire: true },
  });
  return new Set(ouvertes.map(a => a.idQuestionnaire));
}

/**
 * Verrouille la ligne patient pour sérialiser vérification + création.
 * Lève si la ligne n'existe pas : un SELECT FOR UPDATE sans ligne réussit
 * sans rien verrouiller, et la fenêtre TOCTOU reviendrait en silence.
 */
export async function verrouillerPatient(
  tx: Prisma.TransactionClient,
  idPatient: string,
): Promise<void> {
  const lignes = await tx.$queryRaw<unknown[]>`SELECT id FROM patients WHERE id_patient = ${idPatient} FOR UPDATE`;
  if (lignes.length !== 1) {
    throw new Error(`Verrou patient impossible : ${lignes.length} ligne(s) pour ${idPatient}`);
  }
}
