import { sanitizeAuditError } from '@/lib/anthropic';

export const TYPES_CORRESPONDANCE_PATIENT = {
  booklet: 'booklet',
  accesPortail: 'acces_portail',
  lienMagique: 'lien_magique',
  questionnaire: 'questionnaire',
  questionnaires: 'questionnaires',
  accuseQuestionnaire: 'accuse_questionnaire',
  relanceAgendaSommeil: 'relance_agenda_sommeil',
} as const;

export type TypeCorrespondancePatient =
  (typeof TYPES_CORRESPONDANCE_PATIENT)[keyof typeof TYPES_CORRESPONDANCE_PATIENT];

type EntreeCorrespondancePatient = {
  idPatient: string;
  type: TypeCorrespondancePatient;
  objet: string;
  statut: 'Envoye' | 'Erreur' | 'Non_envoye';
  referenceType?: string;
  referenceId?: string;
  sourceType?: string;
  sourceId?: string;
  erreur?: unknown;
};

/**
 * Journal best-effort : une panne du registre ne transforme jamais un e-mail
 * effectivement envoyé en échec fonctionnel. Le corps et l'adresse du message
 * ne font volontairement pas partie du contrat.
 */
export async function journaliserCorrespondancePatient(
  entree: EntreeCorrespondancePatient,
): Promise<void> {
  try {
    const { prisma } = await import('@/lib/prisma');
    await prisma.correspondancePatient.create({
      data: {
        idPatient: entree.idPatient,
        canal: 'email',
        sens: 'sortant',
        type: entree.type,
        objet: entree.objet.slice(0, 200),
        statut: entree.statut,
        referenceType: entree.referenceType,
        referenceId: entree.referenceId,
        sourceType: entree.sourceType,
        sourceId: entree.sourceId,
        erreurCourte: entree.erreur ? sanitizeAuditError(entree.erreur).slice(0, 200) : undefined,
      },
    });
  } catch {
    // Traçabilité non bloquante, comme l'audit historique des booklets.
  }
}
