import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isSessionValideForPatient, readPatientSession } from '@/lib/patient-session';
import { mapAssignationPatient, type AssignationPatient } from '@/lib/consultation/mapAssignation';
import { consultationCourante } from '@/lib/consultation/portail';
import { logger } from '@/lib/observability/logger';
import { EVENT_CODES } from '@/lib/observability/eventCodes';
import {
  createRequestContext,
  finalizeLogContext,
  withCorrelationHeader,
} from '@/lib/observability/requestContext';

export type PortailAssignationsResponse =
  | {
      ok: true;
      // `idPatient` : même usage que sur `/api/portail/session` — nommer les
      // traces locales du hub sans y recopier le jeton d'accès.
      patient: { idPatient: string; prenom: string; nom: string };
      assignations: AssignationPatient[];
      // Date de la dernière réponse transmise (ISO), `null` si le patient n'a
      // jamais répondu. Alimente l'accueil de reprise (SP-SPI / LOT-01) et
      // reprend **la même horloge que le Fil praticien** — `max(dateReponse)`,
      // pas la dernière connexion. Aucune donnée de score n'accompagne cette
      // date : seule sa position dans le temps est racontée au patient.
      derniereReponseLe: string | null;
      // Signaux du parcours synchronisé (SP-CONV LOT-04, D11) : uniquement des
      // statuts dérivés de données que le portail sert déjà par ailleurs — le
      // statut de la consultation (déjà sur `/api/portail/session`) et le fait
      // qu'un booklet a été envoyé au patient (il l'a reçu par e-mail). Jamais
      // de score, de discordance ni de donnée réservée au praticien.
      parcours: { consultationStatut: string | null; bookletEnvoye: boolean };
    }
  | { ok: false; reason: 'unauthorized' | 'exception'; error: string };

// GET /api/portail/assignations — toutes les assignations du patient de la
// session portail (cookie signé wn_portail). Alimente l'accueil « Mon parcours » (SP-SPI).
export async function GET(req: Request): Promise<NextResponse> {
  const requestContext = createRequestContext(req);
  const session = readPatientSession(req);
  if (!session) {
    logger.security({
      event: EVENT_CODES.PORTAIL_ASSIGNATIONS_UNAUTHORIZED,
      domain: 'SECURITY',
      message: 'Session portail absente ou expirée',
      context: finalizeLogContext(requestContext, { statusCode: 401, retryable: false }),
    });
    return withCorrelationHeader(NextResponse.json(
      { ok: false, reason: 'unauthorized', error: 'Session expirée. Reconnectez-vous depuis votre lien.' },
      { status: 401 },
    ), requestContext);
  }

  try {
    const patient = await prisma.patient.findUnique({
      where: { idPatient: session.idPatient },
      select: {
        idPatient: true,
        prenom: true,
        nom: true,
        email: true,
        actif: true,
        accessToken: true,
        accessTokenRevoked: true,
        sessionsInvalidesAvant: true,
      },
    });
    // Le patient doit toujours être actif et non révoqué, même avec un cookie valide.
    if (!patient || !isSessionValideForPatient(session, patient)) {
      logger.security({
        event: EVENT_CODES.PORTAIL_ASSIGNATIONS_UNAUTHORIZED,
        domain: 'SECURITY',
        message: 'Accès portail révoqué ou incohérent',
        context: finalizeLogContext(requestContext, { statusCode: 401, retryable: false }),
      });
      return withCorrelationHeader(NextResponse.json(
        { ok: false, reason: 'unauthorized', error: 'Accès non reconnu ou révoqué.' },
        { status: 401 },
      ), requestContext);
    }

    // idPatient (issu de la session vérifiée) est la clé fiable ; on n'ajoute pas
    // de filtre email pour éviter les écarts de casse en base.
    // Tri secondaire sur `createdAt` : les questionnaires d'un même pack
    // partagent une `dateAssignation` identique (assignBasePack.ts fige un
    // seul `new Date()` avant la boucle), mais `createdAt` croît dans l'ordre
    // exact de la boucle sur `qids` — ce qui départage les égalités en
    // respectant l'ordre du pack, sans changer le tri des assignations
    // individuelles (dateAssignation distincte, quasi jamais à égalité).
    const assignationsDb = await prisma.assignation.findMany({
      where: { idPatient: session.idPatient },
      orderBy: [{ dateAssignation: 'desc' }, { createdAt: 'asc' }],
    });

    const assignations: AssignationPatient[] = assignationsDb.map(mapAssignationPatient);

    // Horloge de la reprise : dernière réponse **transmise**, comme le Fil
    // praticien (`api/praticien/fil/route.ts`, `_max.dateReponse`). Se
    // connecter n'est pas participer — on ne date pas la reprise sur la visite.
    // Sélection minimale : la date seule, jamais les scores de la réponse.
    const derniereReponse = await prisma.questionnaireReponse.aggregate({
      where: { idPatient: session.idPatient },
      _max: { dateReponse: true },
    });

    // Parcours synchronisé (SP-CONV LOT-04) : deux signaux existants, lus en
    // sélection minimale. `Envoye` est le seul statut de succès du booklet
    // (`api/praticien/booklet`, logBookletEnvoi) — un échec d'envoi ne fait
    // jamais avancer le parcours du patient.
    const [consultation, bookletEnvoye] = await Promise.all([
      consultationCourante(session.idPatient),
      prisma.bookletEnvoi.findFirst({
        where: { idPatient: session.idPatient, statut: 'Envoye' },
        select: { id: true },
      }),
    ]);

    return withCorrelationHeader(NextResponse.json({
      ok: true,
      patient: { idPatient: session.idPatient, prenom: patient.prenom, nom: patient.nom },
      assignations,
      derniereReponseLe: derniereReponse._max.dateReponse?.toISOString() ?? null,
      parcours: {
        consultationStatut: consultation?.statut ?? null,
        bookletEnvoye: bookletEnvoye !== null,
      },
    }), requestContext);
  } catch (err) {
    logger.error({
      event: EVENT_CODES.PORTAIL_ASSIGNATIONS_QUERY_FAILED,
      domain: 'PORTAIL_PATIENT',
      message: 'Échec récupération assignations portail',
      context: finalizeLogContext(requestContext, { statusCode: 500, retryable: true }),
      error: err,
    });
    return withCorrelationHeader(NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 }), requestContext);
  }
}
