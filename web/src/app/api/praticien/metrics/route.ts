import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emailPraticien, filtrePatientsDuPraticien } from '@/lib/praticien/appartenance';
import { logger } from '@/lib/observability/logger';
import { EVENT_CODES } from '@/lib/observability/eventCodes';
import {
  createRequestContext,
  finalizeLogContext,
  withCorrelationHeader,
} from '@/lib/observability/requestContext';

export type MetricsResponse = {
  patients: number | null;
  questionnairesEnCours: number | null;
  synthesiesIA: number | null;
  bookletsEnvoyes: number | null;
  unavailable?: boolean;
  reason?: 'unauthenticated' | 'exception';
};

export async function GET(req: Request): Promise<NextResponse> {
  const requestContext = createRequestContext(req);
  const session = await getServerSession(authOptions);
  if (!session) {
    logger.security({
      event: EVENT_CODES.METRICS_UNAUTHORIZED,
      domain: 'AUTH',
      message: 'Accès non authentifié aux métriques praticien',
      context: finalizeLogContext(requestContext, { statusCode: 401, retryable: false }),
    });
    return withCorrelationHeader(NextResponse.json(
      {
        patients: null,
        questionnairesEnCours: null,
        synthesiesIA: null,
        bookletsEnvoyes: null,
        unavailable: true,
        reason: 'unauthenticated',
      },
      { status: 401 }
    ), requestContext);
  }

  try {
    // Métriques bornées au praticien en session. Les tables filles n'ont pas de
    // `praticienEmail` : le scope passe par leur relation `patient`.
    const duPraticien = filtrePatientsDuPraticien(emailPraticien(session) ?? '');
    const [patients, questionnairesEnCours, synthesiesIA, bookletsEnvoyes] = await Promise.all([
      prisma.patient.count({ where: duPraticien }),
      prisma.assignation.count({ where: { statut: { not: 'Complété' }, patient: duPraticien } }),
      prisma.syntheseIA.count({ where: { patient: duPraticien } }),
      // `booklet_envois` n'a pas de relation directe au patient : on passe par
      // la synthèse dont il est issu.
      prisma.bookletEnvoi.count({ where: { synthese: { patient: duPraticien } } }),
    ]);

    return withCorrelationHeader(NextResponse.json({ patients, questionnairesEnCours, synthesiesIA, bookletsEnvoyes }), requestContext);
  } catch (err) {
    logger.error({
      event: EVENT_CODES.METRICS_QUERY_FAILED,
      domain: 'PRATICIEN',
      message: 'Échec de récupération des métriques praticien',
      context: finalizeLogContext(requestContext, { statusCode: 500, retryable: true }),
      error: err,
    });
    return withCorrelationHeader(NextResponse.json({
      patients: null,
      questionnairesEnCours: null,
      synthesiesIA: null,
      bookletsEnvoyes: null,
      unavailable: true,
      reason: 'exception',
    }), requestContext);
  }
}
