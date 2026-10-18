import { prisma } from '@/lib/prisma';
import { cadenceAtteinte } from '@/lib/securite/cadenceEcritures';

// LA CADENCE DES GESTES DU PATIENT AU DOSSIER À DEUX VOIX — [[D-326]].
//
// Un plafond pour les quatre gestes du POST `portail/dossier` ensemble
// (ratification, amendement, demande de correction, réponse d'étape), compté
// sur les quatre tables qu'ils écrivent : seule cette route y écrit.
//
// HORS DE LA ROUTE, DÉLIBÉRÉMENT : la route est une surface gardée par
// l'anti-agrégat de « Ce qui compte » (`DC-19`/`DC-20`). Ce total est un
// compte technique de lignes écrites dans l'heure, jamais lu ni affiché comme
// une mesure de ce que le patient a dit.
export async function cadenceDossierAtteinte(idPatient: string): Promise<boolean> {
  return cadenceAtteinte('portail', async (depuis) => {
    const where = { idPatient, creeLe: { gte: depuis } };
    const comptes = await Promise.all([
      prisma.ratificationObjectif.count({ where }),
      prisma.amendementObjectif.count({ where }),
      prisma.demandeCorrectionObjectif.count({ where }),
      prisma.reponseJalonObjectif.count({ where }),
    ]);
    return comptes.reduce((a, b) => a + b, 0);
  });
}
