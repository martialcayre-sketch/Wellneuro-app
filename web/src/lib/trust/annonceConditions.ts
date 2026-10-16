import { sanitizeAuditError } from '@/lib/anthropic';
import { prisma } from '@/lib/prisma';
import { TYPES_CORRESPONDANCE_PATIENT, type StatutCorrespondancePatient } from '@/lib/correspondance/patient';
import { referenceConditionsCourantes } from './envoiConditions';

// L'E-MAIL DES CONDITIONS PART UNE FOIS PAR DOSSIER ET PAR VERSION ([[D-292]]
// §3, « envoi unique »). Pas une précaution d'écran : une RÉSERVATION en base.
//
// Avant d'envoyer, la route crée la trace du dossier avec `source_type` =
// `conditions_utilisation` et `source_id` = `<idPatient>@<version>`. La clé
// unique `correspondances_patient_source_key` existe déjà : deux envois
// concurrents (second clic après un délai dépassé, deux onglets, deux
// conteneurs) se disputent la MÊME ligne, et un seul la crée. Sans migration.
//
// LE SENS DE PANNE EST LE CONSERVATEUR, comme pour les documents remis
// (`fiches-assiette/annonce.ts`) :
// - e-mail parti, trace non mise à jour : elle reste `Non_envoye` et RÉSERVÉE
//   — le dossier ne repart pas ; la fiche dit « non envoyé » d'un e-mail
//   peut-être parti, jamais l'inverse ;
// - envoi en échec : la trace passe `Erreur` et LIBÈRE la clé (`source_id`
//   à `null`) — le dossier revient dans la liste, à renvoyer d'un clic ;
// - processus arrêté entre la réservation et l'envoi : la trace reste
//   `Non_envoye`, réservée. Le dossier sort de la liste sans e-mail ; ses
//   conditions l'attendent dans son espace et au dépôt. Aucune relance
//   automatique : la frontière du dépôt les interdit.

export const SOURCE_ANNONCE_CONDITIONS = 'conditions_utilisation';
export const REFERENCE_CONDITIONS = 'trust_document';
const OBJET_TRACE = 'Conditions d’utilisation de l’espace patient';

/** Clé de réservation : un dossier, une version. */
export function cleAnnonceConditions(idPatient: string): string {
  return `${idPatient}@${referenceConditionsCourantes()}`;
}

/** Réserve l'envoi au dossier. `null` : un autre envoi l'a déjà pris. */
export async function reserverAnnonceConditions(idPatient: string): Promise<string | null> {
  try {
    const { id } = await prisma.correspondancePatient.create({
      data: {
        idPatient,
        canal: 'email',
        sens: 'sortant',
        type: TYPES_CORRESPONDANCE_PATIENT.conditionsUtilisation,
        objet: OBJET_TRACE,
        statut: 'Non_envoye',
        referenceType: REFERENCE_CONDITIONS,
        referenceId: referenceConditionsCourantes(),
        sourceType: SOURCE_ANNONCE_CONDITIONS,
        sourceId: cleAnnonceConditions(idPatient),
      },
      select: { id: true },
    });
    return id;
  } catch (e) {
    if ((e as { code?: string }).code === 'P2002') return null;
    throw e;
  }
}

/**
 * Met la trace réservée à jour. Un échec LIBÈRE la réservation : le dossier
 * redevient éligible. Une mise à jour perdue laisse la réservation en place.
 */
export async function solderAnnonceConditions(
  idTrace: string,
  statut: StatutCorrespondancePatient,
  erreur?: unknown,
): Promise<void> {
  try {
    await prisma.correspondancePatient.update({
      where: { id: idTrace },
      data: {
        statut,
        erreurCourte: erreur ? sanitizeAuditError(erreur).slice(0, 200) : null,
        ...(statut === 'Erreur' ? { sourceId: null } : {}),
      },
    });
  } catch {
    // Traçabilité non bloquante : le sens de panne est le conservateur.
  }
}
