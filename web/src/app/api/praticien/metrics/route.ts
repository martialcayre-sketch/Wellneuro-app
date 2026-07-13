import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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
    const [patients, questionnairesEnCours, synthesiesIA, bookletsEnvoyes] = await Promise.all([
      prisma.patient.count(),
      prisma.assignation.count({ where: { statut: { not: 'Complété' } } }),
      prisma.syntheseIA.count(),
      prisma.bookletEnvoi.count(),
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
