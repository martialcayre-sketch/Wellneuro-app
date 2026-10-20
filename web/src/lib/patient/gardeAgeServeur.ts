import { prisma } from '@/lib/prisma';
import { refusSaisieSante, statutAge, type RaisonRefusAge } from './gardeAge';

/**
 * La garde d'âge pour une route qui n'a pas le dossier sous la main (D-284 §3).
 *
 * Séparée de `gardeAge.ts` pour que celui-ci reste pur : l'écran l'importe, et
 * il ne doit pas embarquer le client Prisma. Un dossier introuvable rend le
 * refus « date manquante » — fail-closed ; la route a de toute façon vérifié
 * la session avant.
 */
export async function refusSaisieSantePour(
  idPatient: string,
): Promise<{ reason: RaisonRefusAge; error: string } | null> {
  const patient = await prisma.patient.findUnique({
    where: { idPatient },
    select: { dateNaissance: true },
  });
  return refusSaisieSante(statutAge(patient?.dateNaissance ?? null, Date.now()));
}
