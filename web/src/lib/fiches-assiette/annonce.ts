// L'E-MAIL NEUTRE ([[D-251]] §9, lot 11) — « Un document de votre praticien vous
// attend ». Décide s'il part, réserve sa trace, puis l'envoie. Le texte vit au
// registre des gabarits (`document_remis`), l'envoi dans `consultation/email.ts`.
//
// QUAND IL PART (arbitrages du 2026-09-29) :
//   • APRÈS le COMMIT du clic « Valider pour diffusion ». Jamais dans la
//     transaction : un e-mail ne se reprend pas, une transaction si.
//   • UN PAR CLIC, et seulement si ce clic a remis au moins une fiche. Un
//     double clic ne remet rien la seconde fois (la base annule une remise
//     identique à la remise en cours) : il n'annonce donc rien non plus.
//   • SEULEMENT ESPACE DE LECTURE OUVERT (`WN_FICHES_ASSIETTE_LECTURE`) :
//     annoncer un document derrière une page fermée serait promettre une porte
//     close.
//
// LA TRACE EST RÉSERVÉE DANS LA TRANSACTION (revue Copilot de #1249). Un
// processus arrêté entre le commit et l'envoi perdait l'e-mail SANS rien
// laisser, et un nouveau clic ne remet rien, donc n'annonce plus rien. La ligne
// `Non_envoye` est écrite avec les remises : si l'envoi n'a jamais lieu, la
// correspondance du dossier le dit. Aucune relance automatique : la frontière
// du dépôt les interdit.
//
// CE QU'IL NE DÉFAIT PAS : les fiches sont remises quand l'envoi est tenté. Un
// échec se trace et se rend ; il ne transforme jamais le clic en erreur.

import type { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { sanitizeAuditError } from '@/lib/anthropic';
import { sendDocumentRemisEmail } from '@/lib/consultation/email';
import { TYPES_CORRESPONDANCE_PATIENT, type StatutCorrespondancePatient } from '@/lib/correspondance/patient';
import type { AnnonceFiches } from './apercuRemise';
import { lectureFichesOuverte } from './drapeau';

export type { AnnonceFiches } from './apercuRemise';

const OBJET_TRACE = 'Document remis dans l’espace patient';

/** L'annonce est-elle due pour ce clic ? */
export function annonceDue(fichesRemises: number): boolean {
  return fichesRemises > 0 && lectureFichesOuverte();
}

/**
 * Réserve la trace de l'annonce, DANS la transaction du clic : elle naît
 * `Non_envoye` avec les remises, et rien ne peut la perdre ensuite.
 */
export async function reserverAnnonce(
  client: Pick<Prisma.TransactionClient, 'correspondancePatient'>,
  idPatient: string,
): Promise<string> {
  const { id } = await client.correspondancePatient.create({
    data: {
      idPatient,
      canal: 'email',
      sens: 'sortant',
      type: TYPES_CORRESPONDANCE_PATIENT.documentRemis,
      objet: OBJET_TRACE,
      statut: 'Non_envoye',
    },
    select: { id: true },
  });
  return id;
}

/**
 * Envoie l'annonce réservée, et met sa trace à jour. Un compte désactivé ou un
 * accès révoqué ferme le portail (`patient-session.ts`) : rien ne part, et la
 * trace le dit.
 */
export async function annoncerDocumentRemis(idPatient: string, idTrace: string): Promise<AnnonceFiches> {
  // Une mise à jour perdue laisse la trace `Non_envoye` : le sens de panne est
  // le conservateur — la fiche du dossier dit « non envoyé » d'un e-mail
  // peut-être parti, jamais l'inverse.
  const tracer = async (statut: StatutCorrespondancePatient, erreur?: unknown) => {
    try {
      await prisma.correspondancePatient.update({
        where: { id: idTrace },
        data: { statut, erreurCourte: erreur ? sanitizeAuditError(erreur).slice(0, 200) : null },
      });
    } catch {
      // Traçabilité non bloquante : le clic a réussi.
    }
  };

  // UN SEUL `try`, autour de tout : la lecture du dossier comprise. Les fiches
  // sont déjà remises ; une panne ici ne doit pas rendre un 500 au praticien
  // pour un geste qui a réussi.
  try {
    const patient = await prisma.patient.findUniqueOrThrow({
      where: { idPatient },
      select: { email: true, prenom: true, actif: true, accessTokenRevoked: true },
    });
    // `actif` AUSSI (revue du lot 11) : une désactivation entre le commit du
    // clic et cette lecture fermerait le portail que l'e-mail annonce.
    if (!patient.actif || patient.accessTokenRevoked) {
      await tracer('Non_envoye', 'portail fermé à ce patient');
      return 'portail_ferme';
    }
    const statut = await sendDocumentRemisEmail(patient.email, patient.prenom);
    if (statut === 'Envoye') {
      await tracer('Envoye');
      return 'envoye';
    }
    await tracer('Non_envoye', 'messagerie non configurée');
    return 'non_configure';
  } catch (err) {
    await tracer('Erreur', err);
    // La classe seule au journal applicatif, jamais le message.
    console.warn('[fiches-assiette/annonce] annonce non envoyée', err instanceof Error ? err.name : 'inconnu');
    return 'echoue';
  }
}
