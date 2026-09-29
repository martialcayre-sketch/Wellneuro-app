// L'E-MAIL NEUTRE ([[D-251]] §9, lot 11) — « Un document de votre praticien vous
// attend ». Décide s'il part, puis l'envoie. Le texte vit au registre des
// gabarits (`document_remis`), l'envoi dans `consultation/email.ts`, qui le
// journalise.
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
// CE QU'IL NE DÉFAIT PAS : les fiches sont remises quand cette fonction est
// appelée. Un échec d'envoi se journalise et se rend ; il ne transforme jamais
// le clic en erreur.

import { prisma } from '@/lib/prisma';
import { sendDocumentRemisEmail, type EnvoiAcces } from '@/lib/consultation/email';
import { journaliserCorrespondancePatient, TYPES_CORRESPONDANCE_PATIENT } from '@/lib/correspondance/patient';
import { lectureFichesOuverte } from './drapeau';

/** Ce que la réponse du clic dit de l'annonce, quand elle était due. */
export type AnnonceFiches = EnvoiAcces | 'portail_ferme';

/** L'annonce est-elle due pour ce clic ? */
export function annonceDue(fichesRemises: number): boolean {
  return fichesRemises > 0 && lectureFichesOuverte();
}

const OBJET_TRACE = 'Document remis dans l’espace patient';

/**
 * Annonce au patient qu'un document l'attend. Un compte désactivé ou un accès
 * révoqué ferme le portail (`patient-session.ts`) : rien ne part, et la fiche
 * du dossier le dit.
 */
export async function annoncerDocumentRemis(idPatient: string): Promise<AnnonceFiches> {
  // UN SEUL `try`, autour de tout : la lecture du dossier comprise. Les fiches
  // sont déjà remises ; une panne ici ne doit pas rendre un 500 au praticien
  // pour un geste qui a réussi.
  let envoiTente = false;
  try {
    const patient = await prisma.patient.findUniqueOrThrow({
      where: { idPatient },
      select: { email: true, prenom: true, actif: true, accessTokenRevoked: true },
    });
    // `actif` AUSSI (revue du lot 11) : une désactivation entre le commit du
    // clic et cette lecture fermerait le portail que l'e-mail annonce.
    if (!patient.actif || patient.accessTokenRevoked) {
      await journaliserCorrespondancePatient({
        idPatient,
        type: TYPES_CORRESPONDANCE_PATIENT.documentRemis,
        objet: OBJET_TRACE,
        statut: 'Non_envoye',
        erreur: 'portail fermé à ce patient',
      });
      return 'portail_ferme';
    }
    envoiTente = true;
    const statut = await sendDocumentRemisEmail(patient.email, patient.prenom, idPatient);
    return statut === 'Envoye' ? 'envoye' : 'non_configure';
  } catch (err) {
    // Un échec SMTP est déjà journalisé en `Erreur` par l'envoi. Une panne
    // AVANT l'envoi ne l'est pas encore : sans cette trace, rien ne dirait sur
    // la fiche du dossier que l'annonce n'est pas partie (revue du lot 11).
    if (!envoiTente) {
      try {
        await journaliserCorrespondancePatient({
          idPatient,
          type: TYPES_CORRESPONDANCE_PATIENT.documentRemis,
          objet: OBJET_TRACE,
          statut: 'Erreur',
          erreur: err,
        });
      } catch {
        // Son contrat est de ne jamais lever ; s'il le faisait, le clic reste
        // réussi.
      }
    }
    // La classe seule au journal applicatif, jamais le message.
    console.warn('[fiches-assiette/annonce] annonce non envoyée', err instanceof Error ? err.name : 'inconnu');
    return 'echoue';
  }
}
