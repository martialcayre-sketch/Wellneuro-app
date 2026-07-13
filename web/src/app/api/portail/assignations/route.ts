import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readPatientSession } from '@/lib/patient-session';
import { mapAssignationPatient, type AssignationPatient } from '@/lib/consultation/mapAssignation';
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
      patient: { prenom: string; nom: string };
      assignations: AssignationPatient[];
    }
  | { ok: false; reason: 'unauthorized' | 'exception'; error: string };

// GET /api/portail/assignations — toutes les assignations du patient de la
// session portail (cookie signé wn_portail). Alimente le hub « Mes questionnaires ».
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
      select: { prenom: true, nom: true, email: true, actif: true, accessTokenRevoked: true },
    });
    // Le patient doit toujours être actif et non révoqué, même avec un cookie valide.
    if (!patient || !patient.actif || patient.accessTokenRevoked || patient.email.toLowerCase() !== session.email) {
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

    return withCorrelationHeader(NextResponse.json({
      ok: true,
      patient: { prenom: patient.prenom, nom: patient.nom },
      assignations,
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
