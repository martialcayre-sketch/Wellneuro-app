import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPublicId } from '@/lib/ids';
import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';
import { resolvePackQuestionnaireIds } from '@/lib/consultation/packRegistry';
import nodemailer from 'nodemailer';
import { PortalAccessError, withActivePortalAccess } from '@/lib/consultation/portal-access';
import { emailPraticien, filtrePatientsDuPraticien } from '@/lib/praticien/appartenance';
import { logger } from '@/lib/observability/logger';
import { EVENT_CODES } from '@/lib/observability/eventCodes';
import {
  createRequestContext,
  finalizeLogContext,
  withCorrelationHeader,
} from '@/lib/observability/requestContext';

type AssignPackPayload = {
  idPack?: string;
  emailPatient?: string;
  dateLimite?: string;
  notes?: string;
};

export type AssignPackResponse = {
  success: boolean;
  count?: number;
  packNom?: string;
  error?: string;
  reason?: 'unauthenticated' | 'invalid_payload' | 'patient_not_found' | 'portal_revoked' | 'pack_not_found' | 'exception';
};

const catalogue = QUESTIONNAIRE_CATALOGUE as Record<string, { id: string; titre: string }>;

// POST /api/praticien/packs/assign — assigne tous les questionnaires d'un pack
// à un patient (N assignations), puis envoie un seul email récapitulatif.
export async function POST(req: Request): Promise<NextResponse> {
  const requestContext = createRequestContext(req);
  const session = await getServerSession(authOptions);
  if (!session) {
    logger.security({
      event: EVENT_CODES.AUTH_PRACTICIEN_UNAUTHORIZED,
      domain: 'AUTH',
      message: 'Session praticien absente sur assignation pack',
      context: finalizeLogContext(requestContext, { statusCode: 401, retryable: false }),
    });
    return withCorrelationHeader(NextResponse.json({ success: false, reason: 'unauthenticated', error: 'Session absente.' }, { status: 401 }), requestContext);
  }

  let payload: AssignPackPayload;
  try {
    payload = (await req.json()) as AssignPackPayload;
  } catch {
    logger.warn({
      event: EVENT_CODES.ASSIGNATION_PACK_INVALID_PAYLOAD,
      domain: 'ASSIGNATION',
      message: 'Payload invalide sur assignation de pack',
      context: finalizeLogContext(requestContext, { statusCode: 400, retryable: false }),
    });
    return withCorrelationHeader(NextResponse.json({ success: false, reason: 'invalid_payload', error: 'JSON invalide.' }, { status: 400 }), requestContext);
  }

  const idPack = (payload.idPack ?? '').trim();
  const emailPatient = (payload.emailPatient ?? '').trim().toLowerCase().slice(0, 254);
  const notes = (payload.notes ?? '').trim().slice(0, 500);
  const dateLimite = (payload.dateLimite ?? '').trim();

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailPatient);
  const isDateValid = !dateLimite || /^\d{4}-\d{2}-\d{2}$/.test(dateLimite);

  if (!idPack || !emailPatient || !isEmailValid || !isDateValid) {
    logger.warn({
      event: EVENT_CODES.ASSIGNATION_PACK_INVALID_PAYLOAD,
      domain: 'ASSIGNATION',
      message: 'Validation payload échouée pour assignation pack',
      context: finalizeLogContext(requestContext, { statusCode: 400, retryable: false }),
    });
    return withCorrelationHeader(NextResponse.json(
      {
        success: false,
        reason: 'invalid_payload',
        error: !idPack ? 'Pack requis.' : !isEmailValid ? 'Email patient invalide.' : 'Date limite invalide (AAAA-MM-JJ).',
      },
      { status: 400 }
    ), requestContext);
  }

  const emailSession = emailPraticien(session);
  if (!emailSession) {
    return withCorrelationHeader(NextResponse.json(
      { success: false, reason: 'unauthenticated', error: 'Non authentifié.' },
      { status: 401 }
    ), requestContext);
  }

  try {
    // Garde d'appartenance : assigner un pack déclenche un envoi d'e-mail au
    // patient. Un patient d'un autre praticien est « introuvable ».
    const patient = await prisma.patient.findFirst({
      where: { email: emailPatient, ...filtrePatientsDuPraticien(emailSession) },
    });
    if (!patient || !patient.actif) {
      return withCorrelationHeader(NextResponse.json(
        { success: false, reason: 'patient_not_found', error: 'Patient introuvable (email non présent/actif).' },
        { status: 404 }
      ), requestContext);
    }

    const pack = await prisma.pack.findUnique({ where: { idPack } });
    if (!pack || !pack.actif || pack.qids.length === 0) {
      logger.warn({
        event: EVENT_CODES.ASSIGNATION_PACK_RESOLUTION_FAILED,
        domain: 'ASSIGNATION',
        message: 'Pack introuvable, inactif ou vide',
        context: finalizeLogContext(requestContext, { statusCode: 404, retryable: false }),
      });
      return withCorrelationHeader(NextResponse.json(
        { success: false, reason: 'pack_not_found', error: 'Pack introuvable, inactif ou vide.' },
        { status: 404 }
      ), requestContext);
    }

    const notesPack = notes || `Pack ${pack.nom}`;
    const nowIso = new Date().toISOString();
    const { qids } = await resolvePackQuestionnaireIds({ idPack: pack.idPack, qids: pack.qids });
    const aCreer = qids.flatMap(idQuestionnaire => {
      const questionnaire = catalogue[idQuestionnaire];
      return questionnaire ? [{
        idAssignation: createPublicId('ASS'),
        idQuestionnaire,
        titre: questionnaire.titre || idQuestionnaire,
      }] : [];
    });

    if (aCreer.length === 0) {
      logger.warn({
        event: EVENT_CODES.ASSIGNATION_PACK_RESOLUTION_FAILED,
        domain: 'ASSIGNATION',
        message: 'Aucun questionnaire valide résolu dans le pack',
        context: finalizeLogContext(requestContext, { statusCode: 404, retryable: false }),
      });
      return withCorrelationHeader(NextResponse.json(
        { success: false, reason: 'pack_not_found', error: 'Aucun questionnaire valide dans ce pack.' },
        { status: 404 }
      ), requestContext);
    }

    let portalUrl: string;
    try {
      portalUrl = await withActivePortalAccess(patient.idPatient, async (tx, access) => {
        for (const item of aCreer) {
          await tx.assignation.create({
            data: {
              ...item,
              idPatient: patient.idPatient,
              emailPatient,
              dateAssignation: new Date(nowIso),
              dateLimite: dateLimite || null,
              statut: 'En attente',
              notes: notesPack,
            },
          });
        }
        return access.url;
      });
    } catch (error) {
      if (error instanceof PortalAccessError && error.reason === 'portal_revoked') {
        return withCorrelationHeader(NextResponse.json({
          success: false,
          reason: 'portal_revoked',
          error: 'L’accès portail de ce patient est révoqué. Réémettez-le explicitement avant de créer une assignation.',
        }, { status: 409 }), requestContext);
      }
      throw error;
    }

    // Un seul email récapitulatif (best-effort), lien vers le portail permanent.
    sendPackEmail(emailPatient, pack.nom, aCreer, dateLimite, notes, portalUrl).catch(
      e => logger.error({
        event: EVENT_CODES.ASSIGNATION_PACK_EMAIL_FAILED,
        domain: 'EMAIL',
        message: 'Échec envoi email assignation pack',
        context: finalizeLogContext(requestContext, { retryable: true }),
        error: e,
      })
    );

    return withCorrelationHeader(NextResponse.json({ success: true, count: aCreer.length, packNom: pack.nom }), requestContext);
  } catch (err) {
    logger.error({
      event: EVENT_CODES.ASSIGNATION_PACK_EXCEPTION,
      domain: 'ASSIGNATION',
      message: 'Erreur technique lors de l assignation du pack',
      context: finalizeLogContext(requestContext, { statusCode: 500, retryable: true }),
      error: err,
    });
    return withCorrelationHeader(NextResponse.json({ success: false, reason: 'exception', error: "Erreur technique lors de l'assignation du pack." }), requestContext);
  }
}

async function sendPackEmail(
  patientEmail: string,
  packNom: string,
  assignations: { idAssignation: string; titre: string }[],
  dateLimite: string,
  notes: string,
  portalUrl: string,
) {
  const smtpUrl = process.env.SMTP_URL;
  if (!smtpUrl) return;
  const liste = assignations.map(a => `• ${a.titre}`).join('\n');
  const dateInfo = dateLimite ? `\nÀ compléter avant le : ${dateLimite}` : '';
  const noteInfo = notes ? `\nNote de votre praticien : ${notes}` : '';
  const transport = nodemailer.createTransport(smtpUrl);
  await transport.sendMail({
    from: '"Wellneuro" <noreply@wellneuro.fr>',
    to: patientEmail,
    subject: `Questionnaires à compléter avant votre consultation — Wellneuro`,
    text:
      `Bonjour,\n\n` +
      `Votre praticien vous invite à compléter les questionnaires du pack « ${packNom} » avant votre consultation :\n` +
      `${liste}${dateInfo}${noteInfo}\n\n` +
      `Un seul lien suffit : après confirmation de votre email, vous pourrez accéder à tous les questionnaires en attente du pack et les remplir dans l'ordre de votre choix.\n\n` +
      `Accéder à vos questionnaires :\n${portalUrl}\n\n` +
      `L'équipe Wellneuro`,
  });
}
