import { prisma } from '@/lib/prisma';
import { accepteNouvelEnvoi, MESSAGE_DOSSIER_CLOS_PATIENT, RAISON_DOSSIER_CLOS } from './cycleDeVie';

/**
 * La garde de clôture des routes de saisie patient — arbitrage du responsable
 * du 2026-11-04, option A : un dossier clos ne recueille plus de réponse,
 * quelle que soit la porte (le hub ne propose déjà plus rien, #1846 ; la route
 * refuse l'appel direct, #181).
 *
 * Elle joue AVANT la garde d'âge : un mineur clos reçoit `dossier_cloture`, et
 * non `circuit_mineur_requis` qui lui promettrait une saisie à venir.
 *
 * Un dossier introuvable est refusé, comme dans `refusDossierFerme` — la route
 * a de toute façon vérifié la session avant. Un dossier désactivé n'arrive pas
 * jusqu'ici : la session portail exige `actif`.
 */
export async function refusClotureSuiviPour(
  idPatient: string,
): Promise<{ reason: typeof RAISON_DOSSIER_CLOS; error: string } | null> {
  const patient = await prisma.patient.findUnique({
    where: { idPatient },
    select: { actif: true, suiviClotureLe: true },
  });
  if (patient && accepteNouvelEnvoi(patient)) return null;
  return { reason: RAISON_DOSSIER_CLOS, error: MESSAGE_DOSSIER_CLOS_PATIENT };
}
