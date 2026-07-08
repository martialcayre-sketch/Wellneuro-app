import { prisma } from '@/lib/prisma';
import { createPublicId } from '@/lib/ids';
import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';

const catalogue = QUESTIONNAIRE_CATALOGUE as Record<string, { id: string; titre: string }>;

export type PackAssignmentOptions = {
  /** Date limite AAAA-MM-JJ (optionnelle). */
  dateLimite?: string | null;
  notes?: string;
  /**
   * Marque le consentement comme déjà donné sur chaque assignation créée
   * (utilisé par l'onboarding portail : le consentement est recueilli une
   * fois au niveau de la consultation, pas par questionnaire).
   */
  consentementDonne?: boolean;
  consentementVersion?: string | null;
  /**
   * Consultation dont le consentement couvre ces assignations (P6). Stocké en
   * lien souple sur chaque assignation pour tracer la portée du consentement.
   */
  idConsultation?: string | null;
};

export type CreatedAssignation = { idAssignation: string; titre: string };

/**
 * Assigne tous les questionnaires d'un pack à un patient : une `Assignation`
 * par `qid` valide (ids inconnus du catalogue ignorés). Renvoie les
 * assignations créées. Ne gère pas l'email (laissé à l'appelant).
 */
export async function assignPackToPatient(params: {
  idPatientBusiness: string;
  emailPatient: string;
  qids: string[];
  packNom: string;
  options?: PackAssignmentOptions;
}): Promise<CreatedAssignation[]> {
  const { idPatientBusiness, emailPatient, qids, packNom, options } = params;
  const notes = options?.notes?.trim() || `Pack ${packNom}`;
  const dateLimite = options?.dateLimite?.trim() || null;
  const now = new Date();
  const cree: CreatedAssignation[] = [];

  for (const idQuestionnaire of qids) {
    const questionnaire = catalogue[idQuestionnaire];
    if (!questionnaire) continue;
    const idAssignation = createPublicId('ASS');
    const titre = questionnaire.titre || idQuestionnaire;
    await prisma.assignation.create({
      data: {
        idAssignation,
        idPatient: idPatientBusiness,
        emailPatient,
        idQuestionnaire,
        titre,
        dateAssignation: now,
        dateLimite,
        statut: 'En attente',
        notes,
        idConsultation: options?.idConsultation ?? null,
        ...(options?.consentementDonne
          ? {
              consentement: 'donne',
              consentementHorodatage: now,
              consentementVersion: options.consentementVersion ?? null,
            }
          : {}),
      },
    });
    cree.push({ idAssignation, titre });
  }

  return cree;
}
