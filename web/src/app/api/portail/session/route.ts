import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  isTokenValide,
  isEmailValide,
  resolvePortailPatient,
  resolvePortailPatientFromSession,
  consultationCourante,
} from '@/lib/consultation/portail';
import {
  PORTAIL_COOKIE_NAME,
  PORTAIL_COOKIE_OPTIONS,
  signPatientSession,
  readPatientSession,
} from '@/lib/patient-session';
import { logger } from '@/lib/observability/logger';
import { EVENT_CODES } from '@/lib/observability/eventCodes';
import {
  createRequestContext,
  finalizeLogContext,
  withCorrelationHeader,
} from '@/lib/observability/requestContext';

export type PortailConsultationState = {
  idConsultation: string;
  statut: string;
  motif: string | null;
  consentementDonne: boolean;
  ficheRemplie: boolean;
  anamneseRemplie: boolean;
};

export type PortailSessionResponse =
  | {
      ok: true;
      patient: { prenom: string; nom: string; email: string };
      consultation: PortailConsultationState | null;
      premiereAssignation: string | null;
    }
  | { ok: false; reason: string; error: string };

type Payload = { token?: string; email?: string };

// POST /api/portail/session — « login » du portail patient.
export async function POST(req: Request): Promise<NextResponse> {
  const requestContext = createRequestContext(req);
  let payload: Payload;
  try {
    payload = (await req.json()) as Payload;
  } catch {
    logger.warn({
      event: EVENT_CODES.PORTAIL_SESSION_INVALID_PAYLOAD,
      domain: 'PORTAIL_PATIENT',
      message: 'Payload invalide sur ouverture de session portail',
      context: finalizeLogContext(requestContext, { statusCode: 400, retryable: false }),
    });
    return withCorrelationHeader(NextResponse.json({ ok: false, reason: 'invalid_payload', error: 'JSON invalide.' }, { status: 400 }), requestContext);
  }

  const token = (payload.token ?? '').trim();
  const email = (payload.email ?? '').trim().toLowerCase();

  if (!isTokenValide(token) || (email && !isEmailValide(email))) {
    logger.security({
      event: EVENT_CODES.PORTAIL_SESSION_INVALID_PAYLOAD,
      domain: 'SECURITY',
      message: 'Tentative portail avec identifiants invalides',
      context: finalizeLogContext(requestContext, { statusCode: 400, retryable: false }),
    });
    return withCorrelationHeader(NextResponse.json({ ok: false, reason: 'invalid_payload', error: 'Identifiants invalides.' }, { status: 400 }), requestContext);
  }

  try {
    const existingSession = readPatientSession(req);
    const patient = email
      ? await resolvePortailPatient(token, email)
      : existingSession
        ? await resolvePortailPatientFromSession(token, existingSession)
        : null;
    if (!patient) {
      logger.security({
        event: EVENT_CODES.PORTAIL_SESSION_FORBIDDEN,
        domain: 'SECURITY',
        message: 'Accès portail refusé',
        context: finalizeLogContext(requestContext, { statusCode: 403, retryable: false }),
      });
      return withCorrelationHeader(NextResponse.json({ ok: false, reason: 'forbidden', error: 'Accès non reconnu ou révoqué.' }, { status: 403 }), requestContext);
    }

    const consultation = await consultationCourante(patient.idPatient);

    // Première assignation en attente (pour enchaîner vers le flux questionnaire existant).
    const premiere = await prisma.assignation.findFirst({
      where: { idPatient: patient.idPatient, statut: { not: 'Complété' } },
      orderBy: { dateAssignation: 'asc' },
      select: { idAssignation: true },
    });

    const res = NextResponse.json<PortailSessionResponse>({
      ok: true,
      patient: { prenom: patient.prenom, nom: patient.nom, email: patient.email },
      consultation: consultation
        ? {
            idConsultation: consultation.idConsultation,
            statut: consultation.statut,
            motif: consultation.motif,
            consentementDonne: consultation.consentement === 'donne',
            ficheRemplie: consultation.ficheSignaletique != null,
            anamneseRemplie: consultation.anamnese != null,
          }
        : null,
      premiereAssignation: premiere?.idAssignation ?? null,
    });

    // Pose le cookie de session portail : l'email n'est saisi qu'ici, puis
    // porté par le cookie signé pour les appels suivants (hub, questionnaires).
    res.cookies.set(
      PORTAIL_COOKIE_NAME,
      signPatientSession({ idPatient: patient.idPatient, email: patient.email }),
      PORTAIL_COOKIE_OPTIONS,
    );

    return withCorrelationHeader(res, requestContext);
  } catch (err) {
    logger.error({
      event: EVENT_CODES.PORTAIL_SESSION_EXCEPTION,
      domain: 'PORTAIL_PATIENT',
      message: 'Échec ouverture session portail',
      context: finalizeLogContext(requestContext, { statusCode: 500, retryable: true }),
      error: err,
    });
    return withCorrelationHeader(NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 }), requestContext);
  }
}
