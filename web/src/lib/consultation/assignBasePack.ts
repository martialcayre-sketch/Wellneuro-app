import { prisma } from '@/lib/prisma';
import { createPublicId } from '@/lib/ids';
import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';
import { IDS_SUSPENDUS } from '@/lib/questionnaires-catalog';
import { IDS_PASSATION_PRATICIEN } from '@/lib/bibliotheque';
import { qidsDejaOuverts, verrouillerPatient } from '@/lib/assignations/dedup';

/**
 * Les qids écartés parce que l'instrument est suspendu. Rendu à l'appelant
 * plutôt que journalisé ici : `LogPayload` exige un contexte de requête, que
 * cette fonction n'a pas — et fabriquer un faux contexte pour contenter le
 * type reviendrait à mentir dans le journal. La route qui appelle est celle
 * qui sait tracer.
 */
export function qidsSuspendus(qids: string[]): string[] {
  return qids.filter(id => IDS_SUSPENDUS.has(id));
}

/**
 * Les qids écartés parce que l'instrument est de CONSULTATION ([[D-066]]).
 * Ceinture du refus posé par `praticien/packs/route.ts` : le pack de base est
 * l'envoi de routine par excellence (chaque nouveau patient, à l'onboarding),
 * et un instrument de consultation ne doit jamais y voyager — même si une
 * composition antérieure au refus en portait un.
 */
export function qidsConsultation(qids: string[]): string[] {
  return qids.filter(id => IDS_PASSATION_PRATICIEN.has(id));
}

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

export type BasePackAssignmentResult = {
  cree: CreatedAssignation[];
  /**
   * Qids écartés parce qu'une assignation ouverte les porte déjà. Rendus à
   * l'appelant pour la même raison que `qidsSuspendus` : ce chemin n'a aucun
   * praticien pour lire un écart de comptage, la route est celle qui trace.
   */
  dejaOuverts: string[];
};

/**
 * Assigne tous les questionnaires d'un pack à un patient : une `Assignation`
 * par `qid` valide (ids inconnus du catalogue ignorés, qids déjà ouverts
 * écartés). Renvoie les assignations créées et les qids écartés pour
 * antériorité. Ne gère pas l'email (laissé à l'appelant).
 */
export async function assignPackToPatient(params: {
  idPatientBusiness: string;
  emailPatient: string;
  qids: string[];
  packNom: string;
  options?: PackAssignmentOptions;
}): Promise<BasePackAssignmentResult> {
  const { idPatientBusiness, emailPatient, qids, packNom, options } = params;
  const notes = options?.notes?.trim() || `Pack ${packNom}`;
  const dateLimite = options?.dateLimite?.trim() || null;
  const now = new Date();
  if (qids.length === 0) return { cree: [], dejaOuverts: [] };

  // Vérification + créations sous verrou de la ligne patient : un qid déjà
  // porté par une assignation ouverte est écarté (idempotence — une
  // revalidation d'onboarding ne double pas le pack de base) et rendu à
  // l'appelant pour qu'il le trace.
  return prisma.$transaction(async tx => {
    await verrouillerPatient(tx, idPatientBusiness);
    const ouvertes = await qidsDejaOuverts(tx, idPatientBusiness, qids);
    const cree: CreatedAssignation[] = [];

    for (const idQuestionnaire of qids) {
      const questionnaire = catalogue[idQuestionnaire];
      // Un instrument suspendu OU de consultation est écarté comme un id
      // inconnu. Ce chemin est le plus sensible des trois : il part de
      // l'onboarding portail, donc sans clic praticien sur le questionnaire
      // lui-même — exactement l'« envoi de routine » que [[D-066]] interdit
      // aux instruments de consultation.
      if (!questionnaire || IDS_SUSPENDUS.has(idQuestionnaire) || IDS_PASSATION_PRATICIEN.has(idQuestionnaire)) continue;
      if (ouvertes.has(idQuestionnaire)) continue;
      const idAssignation = createPublicId('ASS');
      const titre = questionnaire.titre || idQuestionnaire;
      await tx.assignation.create({
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

    return { cree, dejaOuverts: [...ouvertes].sort() };
  });
}
