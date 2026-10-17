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
//
// L'E-MAIL DU PROTOCOLE ([[D-317]], PA-2) passe par le même chemin, sous son
// propre gabarit (`protocole_diffuse`) : à chaque NOUVELLE version diffusée, il
// remplace celui-ci — un seul e-mail par clic, qui vaut l'annonce des fiches et
// de la lettre ([[D-317]] §3).
//
// LE PLAFOND ([[D-317]] §2, §4). Au plus UN e-mail d'annonce par dossier et par
// 24 heures, les deux gabarits confondus, comptant toute tentative quel que soit
// son statut (arbitrage du 2026-07-30 : tout chemin d'envoi porte un plafond
// opposable côté serveur). Un envoi refusé par le plafond est consigné
// `Non_envoye` sous son motif — et ce refus-là ne compte pas comme tentative :
// sans quoi chaque clic refusé repousserait la fenêtre.

import type { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { sanitizeAuditError } from '@/lib/anthropic';
import { sendDocumentRemisEmail, sendProtocoleDiffuseEmail } from '@/lib/consultation/email';
import { TYPES_CORRESPONDANCE_PATIENT, type StatutCorrespondancePatient } from '@/lib/correspondance/patient';
import type { AnnonceFiches } from './apercuRemise';
import { lectureFichesOuverte } from './drapeau';

export type { AnnonceFiches } from './apercuRemise';

/** Les deux annonces d'un clic « Valider pour diffusion ». */
export type GabaritAnnonce =
  | typeof TYPES_CORRESPONDANCE_PATIENT.documentRemis
  | typeof TYPES_CORRESPONDANCE_PATIENT.protocoleDiffuse;

const OBJET_TRACE: Record<GabaritAnnonce, string> = {
  document_remis: 'Document remis dans l’espace patient',
  protocole_diffuse: 'Protocole diffusé dans l’espace patient',
};

const TYPES_ANNONCE: GabaritAnnonce[] = [
  TYPES_CORRESPONDANCE_PATIENT.documentRemis,
  TYPES_CORRESPONDANCE_PATIENT.protocoleDiffuse,
];

/** Fenêtre du plafond ([[D-317]] §2) — chiffre technique, pas clinique. */
export const FENETRE_PLAFOND_ANNONCE_MS = 24 * 60 * 60 * 1000;

/** Le motif d'un envoi refusé par le plafond — et la marque qui l'exclut du compte. */
export const MOTIF_PLAFOND_ANNONCE = 'plafond : un e-mail d’annonce par 24 heures';

/** La trace réservée d'une annonce, et si le plafond l'a refusée. */
export type AnnonceReservee = { idTrace: string; gabarit: GabaritAnnonce; plafonnee: boolean };

/** L'annonce des fiches est-elle due pour ce clic ? */
export function annonceDue(fichesRemises: number): boolean {
  return fichesRemises > 0 && lectureFichesOuverte();
}

/**
 * Réserve la trace de l'annonce, DANS la transaction du clic : elle naît
 * `Non_envoye` avec les remises, et rien ne peut la perdre ensuite.
 *
 * Le plafond se juge ici, sous un verrou PAR DOSSIER tenu jusqu'au commit : le
 * verrou de chaîne de la route est par décision, et deux clics concurrents sur
 * deux décisions du même dossier liraient sinon tous deux une fenêtre vide.
 */
export async function reserverAnnonce(
  client: Pick<Prisma.TransactionClient, 'correspondancePatient' | '$executeRaw'>,
  idPatient: string,
  gabarit: GabaritAnnonce,
  maintenant: Date = new Date(),
): Promise<AnnonceReservee> {
  await client.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`annonce_diffusion:${idPatient}`}))`;
  const tentatives = await client.correspondancePatient.count({
    where: {
      idPatient,
      type: { in: TYPES_ANNONCE },
      enregistreLe: { gte: new Date(maintenant.getTime() - FENETRE_PLAFOND_ANNONCE_MS) },
      // LES DEUX BRANCHES, explicites : une simple négation sur le motif
      // écarterait aussi les lignes à `NULL` — presque toutes les tentatives.
      OR: [{ erreurCourte: null }, { erreurCourte: { not: MOTIF_PLAFOND_ANNONCE } }],
    },
  });
  const plafonnee = tentatives > 0;
  const { id } = await client.correspondancePatient.create({
    data: {
      idPatient,
      canal: 'email',
      sens: 'sortant',
      type: gabarit,
      objet: OBJET_TRACE[gabarit],
      statut: 'Non_envoye',
      ...(plafonnee ? { erreurCourte: MOTIF_PLAFOND_ANNONCE } : {}),
    },
    select: { id: true },
  });
  return { idTrace: id, gabarit, plafonnee };
}

/**
 * Envoie l'annonce réservée, et met sa trace à jour. Un compte désactivé ou un
 * accès révoqué ferme le portail (`patient-session.ts`) : rien ne part, et la
 * trace le dit. Une annonce refusée par le plafond ne lit rien et n'envoie
 * rien : sa trace est déjà juste.
 */
export async function annoncerDiffusion(
  idPatient: string,
  annonce: AnnonceReservee,
  praticienEmail?: string,
): Promise<AnnonceFiches> {
  if (annonce.plafonnee) return 'plafond';

  // Une mise à jour perdue laisse la trace `Non_envoye` : le sens de panne est
  // le conservateur — la fiche du dossier dit « non envoyé » d'un e-mail
  // peut-être parti, jamais l'inverse.
  const tracer = async (statut: StatutCorrespondancePatient, erreur?: unknown) => {
    try {
      await prisma.correspondancePatient.update({
        where: { id: annonce.idTrace },
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
    const statut = annonce.gabarit === TYPES_CORRESPONDANCE_PATIENT.protocoleDiffuse
      ? await sendProtocoleDiffuseEmail(patient.email, patient.prenom, praticienEmail)
      : await sendDocumentRemisEmail(patient.email, patient.prenom);
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
