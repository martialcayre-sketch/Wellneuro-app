import { isDeadlineExpired } from '@/lib/patient-access';

// Représentation patient-safe d'une assignation, partagée entre
// /api/patient/assignations (ancré sur un id) et /api/portail/assignations
// (ancré sur la session portail). Aucune donnée praticien exposée.
export type AssignationPatient = {
  idAssignation: string;
  idQuestionnaire: string;
  titre: string;
  statut: string;
  statutReponses: string;
  dateLimite: string | null;
  estEnAttenteSaisie: boolean;
};

type AssignationSource = {
  idAssignation: string;
  idQuestionnaire: string;
  titre: string;
  statut: string;
  statutReponses: string;
  dateLimite: string | null;
};

/**
 * Projette une assignation Prisma vers sa forme patient, en calculant
 * `estEnAttenteSaisie`. La date limite ne bloque pas les réponses déjà
 * verrouillées / en correction (droit de consultation permanent, R8-lite).
 */
export function mapAssignationPatient(a: AssignationSource): AssignationPatient {
  const bloqueParDeadline = a.statutReponses !== 'verrouille' && a.statutReponses !== 'modification_demandee';
  const expiree = bloqueParDeadline && isDeadlineExpired(a.dateLimite);
  const estEnAttenteSaisie = a.statut !== 'Complété' && !expiree;

  return {
    idAssignation: a.idAssignation,
    idQuestionnaire: a.idQuestionnaire,
    titre: a.titre,
    statut: a.statut,
    statutReponses: a.statutReponses,
    dateLimite: a.dateLimite ?? null,
    estEnAttenteSaisie,
  };
}
