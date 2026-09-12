import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readPatientSession } from '@/lib/patient-session';
import { resolvePortailPatientFromSession } from '@/lib/consultation/portail';
import { whereEnvoiVisible } from '@/lib/documents/bilanPatient';
import {
  isCeQuiCompteEnabled,
  isComprehensionEnabled,
  isDossierDeuxVoixEnabled,
  isJournalPortailEnabled,
} from '@/lib/patient/featureFlag';
import { construireJournalDossier, type EvenementJournal } from '@/lib/portail/journalDossier';
import { logger } from '@/lib/observability/logger';
import { EVENT_CODES } from '@/lib/observability/eventCodes';
import {
  createRequestContext,
  finalizeLogContext,
  withCorrelationHeader,
} from '@/lib/observability/requestContext';

// GET /api/portail/journal — « ce qui s'est passé dans votre dossier ».
//
// LECTURE SEULE, ET RIEN NE S'ÉCRIT. Le journal se DÉRIVE des tables
// existantes ; aucune ligne n'est stockée une seconde fois, aucune migration
// n'accompagne ce lot. Un journal recopié divergerait de ce qu'il prétend
// refléter, et personne ne saurait lequel des deux croire.
//
// CE QU'ELLE REMPLACE. `lib/portail-visite.ts` devinait « depuis votre dernière
// visite » d'un instantané `localStorage` comparé au suivant : il ne voyait que
// les assignations, ne suivait pas la personne d'un appareil à l'autre, et
// était vide à la première visite par construction. Il reste en place — son
// retrait appartient au LOT-03, avec l'écran qui le remplace.
//
// LES DRAPEAUX DES SURFACES NE SE LÈVENT PAS ICI, ET C'EST L'INVARIANT DE LA
// ROUTE. `WN_PORTAIL_JOURNAL` ouvre le journal ; il n'ouvre rien d'autre. Une
// surface fermée par son propre drapeau passe `null` à la dérivation et ne
// produit AUCUNE ligne — le journal ne peut pas devenir la porte dérobée par
// laquelle une synthèse de compréhension atteint un patient dont la surface est
// close.
//
// Auth : cookie de session portail, comme `api/portail/bilan`. Pas
// d'`authorizePortail` : celui-ci exige une assignation, or un patient dont le
// suivi est terminé n'en a plus et garde le droit de relire son dossier.

export type PortailJournalResponse =
  | { ok: true; evenements: EvenementJournal[] }
  | { ok: false; reason: 'unauthenticated' | 'forbidden' | 'ferme' | 'exception'; error: string };

export async function GET(req: Request): Promise<NextResponse<PortailJournalResponse>> {
  const requestContext = createRequestContext(req);

  const session = readPatientSession(req);
  if (!session) {
    logger.security({
      event: EVENT_CODES.PORTAIL_SESSION_FORBIDDEN,
      domain: 'SECURITY',
      message: 'Session portail absente ou expirée (journal)',
      context: finalizeLogContext(requestContext, { statusCode: 401, retryable: false }),
    });
    return withCorrelationHeader(
      NextResponse.json<PortailJournalResponse>(
        { ok: false, reason: 'unauthenticated', error: 'Session expirée. Reconnectez-vous.' },
        { status: 401 },
      ),
      requestContext,
    );
  }

  // 403 et non 401 : le cookie est lisible, c'est le COMPTE qui est refusé.
  // Répondre 401 renverrait le client au gate du portail, qui refuserait à son
  // tour — une boucle sans message. Même verdict que `api/portail/bilan`.
  const patient = await resolvePortailPatientFromSession(session);
  if (!patient) {
    logger.security({
      event: EVENT_CODES.PORTAIL_SESSION_FORBIDDEN,
      domain: 'SECURITY',
      message: 'Accès portail révoqué ou incohérent (journal)',
      context: finalizeLogContext(requestContext, { statusCode: 403, retryable: false }),
    });
    return withCorrelationHeader(
      NextResponse.json<PortailJournalResponse>(
        { ok: false, reason: 'forbidden', error: 'Accès non reconnu ou révoqué.' },
        { status: 403 },
      ),
      requestContext,
    );
  }

  // LE DRAPEAU EST RELU APRÈS L'IDENTITÉ, jamais avant : un 503 servi avant
  // l'authentification dirait à un visiteur non identifié ce que le cabinet a
  // déployé. Fail-closed — seule la chaîne exacte « true » ouvre.
  if (!isJournalPortailEnabled()) {
    return withCorrelationHeader(
      NextResponse.json<PortailJournalResponse>(
        { ok: false, reason: 'ferme', error: 'Cette page n’est pas disponible.' },
        { status: 503 },
      ),
      requestContext,
    );
  }

  try {
    const idPatient = patient.idPatient;
    const deuxVoix = isDossierDeuxVoixEnabled();
    const comprehension = isComprehensionEnabled();
    const ceQuiCompte = isCeQuiCompteEnabled();

    const [
      assignations,
      bilansTransmis,
      synthesesPubliees,
      objectifs,
      ratifications,
      amendements,
      demandesCorrection,
      reponsesJalon,
      entreesCeQuiCompte,
    ] = await Promise.all([
      prisma.assignation.findMany({
        where: { idPatient },
        select: {
          idAssignation: true,
          titre: true,
          dateAssignation: true,
          statutReponses: true,
          dateDerniereModification: true,
        },
      }),
      // LA MÊME RÈGLE DE VISIBILITÉ QUE `api/portail/bilan` : est transmis ce
      // qui a été ENVOYÉ, jamais ce qui a été seulement rédigé. La définition
      // est unique et partagée (`whereEnvoiVisible`) — deux surfaces qui la
      // recopieraient finiraient par diverger, ce qui est déjà arrivé.
      prisma.bookletEnvoi.findMany({
        where: whereEnvoiVisible(idPatient),
        select: { id: true, dateEnvoi: true },
      }),
      // UNE SYNTHÈSE NON PUBLIÉE EST UN BROUILLON DU PRATICIEN. `publiee_le`
      // NULL n'atteint aucune surface patient, et le journal ne fait pas
      // exception : l'y laisser entrer annoncerait au patient un texte qu'il ne
      // peut pas lire.
      comprehension
        ? prisma.syntheseComprehension.findMany({
            where: { idPatient, publieeLe: { not: null } },
            select: { id: true, publieeLe: true },
          })
        : Promise.resolve(null),
      deuxVoix
        ? prisma.objectifNegocie.findMany({
            where: { idPatient },
            select: { id: true, creeLe: true, supersedesObjectifId: true },
          })
        : Promise.resolve(null),
      deuxVoix
        ? prisma.ratificationObjectif.findMany({
            where: { idPatient },
            select: { id: true, sens: true, creeLe: true },
          })
        : Promise.resolve(null),
      deuxVoix
        ? prisma.amendementObjectif.findMany({ where: { idPatient }, select: { id: true, creeLe: true } })
        : Promise.resolve(null),
      deuxVoix
        ? prisma.demandeCorrectionObjectif.findMany({
            where: { idPatient },
            select: { id: true, creeLe: true },
          })
        : Promise.resolve(null),
      deuxVoix
        ? prisma.reponseJalonObjectif.findMany({
            where: { idPatient },
            select: { id: true, jalon: true, creeLe: true },
          })
        : Promise.resolve(null),
      ceQuiCompte
        ? prisma.entreeCeQuiCompte.findMany({ where: { idPatient }, select: { id: true, creeLe: true } })
        : Promise.resolve(null),
    ]);

    const evenements = construireJournalDossier({
      // L'ENTRÉE DANS L'ACCOMPAGNEMENT EST ELLE-MÊME UN ÉVÉNEMENT (arbitrage du
      // 2026-09-12) : le journal n'est donc jamais vide, et aucun état vide
      // n'est à écrire pour un dossier qui vient de s'ouvrir.
      entreeLe: patient.createdAt,
      assignations,
      bilansTransmis: bilansTransmis.map(b => ({ id: b.id, envoyeLe: b.dateEnvoi })),
      synthesesPubliees:
        synthesesPubliees?.map(s => ({ id: s.id, publieeLe: s.publieeLe as Date })) ?? null,
      objectifs,
      ratifications,
      amendements,
      demandesCorrection,
      reponsesJalon,
      entreesCeQuiCompte,
    });

    return withCorrelationHeader(
      NextResponse.json<PortailJournalResponse>({ ok: true, evenements }),
      requestContext,
    );
  } catch (err) {
    logger.error({
      event: EVENT_CODES.PORTAIL_JOURNAL_QUERY_FAILED,
      domain: 'PORTAIL_PATIENT',
      message: 'Lecture du journal du dossier impossible',
      context: finalizeLogContext(requestContext, { statusCode: 500, retryable: true }),
      error: err instanceof Error ? err : new Error(String(err)),
    });
    return withCorrelationHeader(
      NextResponse.json<PortailJournalResponse>(
        { ok: false, reason: 'exception', error: 'Erreur technique.' },
        { status: 500 },
      ),
      requestContext,
    );
  }
}
