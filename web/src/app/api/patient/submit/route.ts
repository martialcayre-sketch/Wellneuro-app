import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateScore } from '@/lib/questions';
import { createPublicId } from '@/lib/ids';
import { isDeadlineExpired } from '@/lib/patient-access';
import { isSessionAuthorizedForAssignment, readPatientSession } from '@/lib/patient-session';
import nodemailer from 'nodemailer';
import { logger } from '@/lib/observability/logger';
import { EVENT_CODES } from '@/lib/observability/eventCodes';
import {
  createRequestContext,
  finalizeLogContext,
  withCorrelationHeader,
} from '@/lib/observability/requestContext';

export type PatientSubmitResponse =
  | { ok: true; scores: unknown; titre: string }
  | { ok: false; reason: string; error: string };

type SubmitPayload = {
  idAssignation?: string;
  idPatient?: string;
  email?: string;
  idQuestionnaire?: string;
  answers?: Record<string, unknown>;
};

// POST /api/patient/submit
export async function POST(req: Request): Promise<NextResponse> {
  const requestContext = createRequestContext(req);
  let payload: SubmitPayload;
  try {
    payload = (await req.json()) as SubmitPayload;
  } catch {
    logger.warn({
      event: EVENT_CODES.QUESTIONNAIRE_SUBMIT_INVALID_PAYLOAD,
      domain: 'QUESTIONNAIRE',
      message: 'Payload JSON invalide sur soumission patient',
      context: finalizeLogContext(requestContext, { statusCode: 400, retryable: false }),
    });
    return withCorrelationHeader(NextResponse.json({ ok: false, reason: 'invalid_payload', error: 'JSON invalide.' }, { status: 400 }), requestContext);
  }

  const { idAssignation, answers } = payload;
  // Identité : cookie de session portail en priorité, sinon email du corps (compat legacy).
  const patientSession = readPatientSession(req);
  const email = patientSession?.email ?? payload.email;

  if (!idAssignation || !answers || !email) {
    logger.warn({
      event: EVENT_CODES.QUESTIONNAIRE_SUBMIT_INVALID_PAYLOAD,
      domain: 'QUESTIONNAIRE',
      message: 'Données manquantes pour soumission patient',
      context: finalizeLogContext(requestContext, { statusCode: 400, retryable: false }),
    });
    return withCorrelationHeader(NextResponse.json({ ok: false, reason: 'invalid_payload', error: 'Données manquantes.' }, { status: 400 }), requestContext);
  }
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(idAssignation)) {
    return withCorrelationHeader(NextResponse.json({ ok: false, reason: 'invalid_payload', error: 'Identifiant invalide.' }, { status: 400 }), requestContext);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return withCorrelationHeader(NextResponse.json({ ok: false, reason: 'invalid_payload', error: 'Email invalide.' }, { status: 400 }), requestContext);
  }
  if (typeof answers !== 'object' || Array.isArray(answers)) {
    return withCorrelationHeader(NextResponse.json({ ok: false, reason: 'invalid_payload', error: 'Format réponses invalide.' }, { status: 400 }), requestContext);
  }
  const answerCount = Object.keys(answers).length;
  if (answerCount === 0 || answerCount > 500) {
    return withCorrelationHeader(NextResponse.json({ ok: false, reason: 'invalid_payload', error: 'Nombre de réponses invalide.' }, { status: 400 }), requestContext);
  }

  try {
    const ass = await prisma.assignation.findUnique({ where: { idAssignation } });
    const accessAllowed = ass && (patientSession
      ? await isSessionAuthorizedForAssignment(patientSession, ass)
      : ass.emailPatient.toLowerCase() === email.toLowerCase());
    if (!ass || !accessAllowed) {
      logger.security({
        event: EVENT_CODES.QUESTIONNAIRE_SUBMIT_FORBIDDEN,
        domain: 'SECURITY',
        message: 'Soumission questionnaire non reconnue',
        context: finalizeLogContext(requestContext, { statusCode: 403, retryable: false }),
      });
      return withCorrelationHeader(NextResponse.json({ ok: false, reason: 'forbidden', error: 'Assignation non reconnue.' }, { status: 403 }), requestContext);
    }
    if (ass.statutReponses === 'verrouille' || ass.statutReponses === 'modification_demandee') {
      logger.warn({
        event: EVENT_CODES.QUESTIONNAIRE_SUBMIT_ALREADY_DONE,
        domain: 'QUESTIONNAIRE',
        message: 'Soumission refusée car questionnaire déjà verrouillé',
        context: finalizeLogContext(requestContext, { statusCode: 409, retryable: false }),
      });
      return withCorrelationHeader(NextResponse.json({ ok: false, reason: 'already_done', error: 'Ce questionnaire a déjà été complété.' }, { status: 409 }), requestContext);
    }
    // Un déverrouillage explicite du praticien passe outre la date limite d'origine.
    if (ass.statutReponses !== 'deverrouille' && isDeadlineExpired(ass.dateLimite)) {
      logger.warn({
        event: EVENT_CODES.QUESTIONNAIRE_SUBMIT_EXPIRED,
        domain: 'QUESTIONNAIRE',
        message: 'Soumission refusée car date limite dépassée',
        context: finalizeLogContext(requestContext, { statusCode: 410, retryable: false }),
      });
      return withCorrelationHeader(NextResponse.json({ ok: false, reason: 'expired', error: 'Ce lien de questionnaire a expiré.' }, { status: 410 }), requestContext);
    }

    const idPatient = ass.idPatient;
    const emailPatient = ass.emailPatient.toLowerCase();
    const idQuestionnaire = ass.idQuestionnaire;
    const titre = ass.titre || idQuestionnaire;

    // Calculer le score
    const scores = calculateScore(idQuestionnaire, answers) as Record<string, unknown>;

    // Extraire interpretation principale
    let interpretation = '';
    if (scores.interpretation && typeof scores.interpretation === 'object') {
      interpretation = (scores.interpretation as Record<string, unknown>).label as string ?? '';
    }
    const scorePrincipal: number | null =
      typeof scores.total === 'number' ? scores.total :
      typeof scores.count === 'number' ? scores.count : null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scoresWithAnswers = { ...scores, rawAnswers: answers } as any;

    const idReponse = createPublicId('REP');
    const now = new Date();

    // Sauvegarder en PostgreSQL
    await prisma.questionnaireReponse.create({
      data: {
        idReponse,
        idPatient,
        emailPatient,
        idAssignation,
        idQuestionnaire,
        titre,
        dateReponse: now,
        scoresJson: scoresWithAnswers,
        scorePrincipal,
        interpretation: interpretation || null,
      },
    });

    // Mettre à jour le statut de l'assignation
    await prisma.assignation.update({
      where: { idAssignation },
      data: { statut: 'Complété', statutReponses: 'verrouille', dateDerniereModification: now },
    });

    // Accusé de réception email (best-effort, ne bloque pas)
    sendAck(emailPatient, titre).catch(e =>
      logger.error({
        event: EVENT_CODES.QUESTIONNAIRE_ACK_EMAIL_FAILED,
        domain: 'EMAIL',
        message: 'Échec envoi email accusé de réception patient',
        context: finalizeLogContext(requestContext, { retryable: true }),
        error: e,
      })
    );

    return withCorrelationHeader(NextResponse.json({ ok: true, scores, titre }), requestContext);
  } catch (err) {
    logger.error({
      event: EVENT_CODES.QUESTIONNAIRE_SUBMIT_EXCEPTION,
      domain: 'QUESTIONNAIRE',
      message: 'Erreur technique lors de la soumission patient',
      context: finalizeLogContext(requestContext, { statusCode: 500, retryable: true }),
      error: err,
    });
    return withCorrelationHeader(NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique lors de la soumission.' }, { status: 500 }), requestContext);
  }
}

async function sendAck(patientEmail: string, titreQuestionnaire: string) {
  const smtpUrl = process.env.SMTP_URL;
  if (!smtpUrl) return;
  const transport = nodemailer.createTransport(smtpUrl);
  await transport.sendMail({
    from: '"Wellneuro" <noreply@wellneuro.fr>',
    to: patientEmail,
    subject: 'Vos réponses ont bien été reçues — Wellneuro',
    text:
      `Bonjour,\n\n` +
      `Nous confirmons la bonne réception de vos réponses au questionnaire :\n` +
      `« ${titreQuestionnaire} »\n\n` +
      `Votre praticien Wellneuro en prendra connaissance prochainement.\n\n` +
      `L'équipe Wellneuro`,
  });
}
