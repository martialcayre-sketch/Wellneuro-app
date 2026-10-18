import { prisma } from '@/lib/prisma';
import { cadenceAtteinte } from '@/lib/securite/cadenceEcritures';

// LA CADENCE DES ÉCRITURES PRATICIEN SUR LES OBJECTIFS D'UN DOSSIER — [[D-326]].
//
// Un plafond pour les quatre gestes ensemble (objectif négocié, accord attesté,
// fin d'objectif, proposition écartée), compté sur les quatre tables qu'ils
// écrivent : ce sont les seules routes qui y écrivent. Une reprise de
// proposition écrit un objectif ET une disposition : elle compte deux fois,
// assumé (le plafond reste hors d'atteinte d'un usage normal). La proposition de priorité par IA a son propre
// plafond, plus bas (chaque appel est payant).
export async function cadenceObjectifsAtteinte(idPatient: string): Promise<boolean> {
  return cadenceAtteinte('praticienObjectifs', async (depuis) => {
    const where = { idPatient, creeLe: { gte: depuis } };
    const comptes = await Promise.all([
      prisma.objectifNegocie.count({ where }),
      prisma.accordAtteste.count({ where }),
      prisma.finObjectif.count({ where }),
      prisma.dispositionProposition.count({ where }),
    ]);
    return comptes.reduce((a, b) => a + b, 0);
  });
}
