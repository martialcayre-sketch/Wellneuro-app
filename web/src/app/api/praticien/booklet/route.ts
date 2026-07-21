import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { type SyntheseSchema, maskEmail, sanitizeAuditError } from '@/lib/anthropic';
import { buildBookletHTML } from '@/lib/documents/bookletHtml';
import { emailPraticien, filtrePatientsDuPraticien } from '@/lib/praticien/appartenance';
import { logger } from '@/lib/observability/logger';
import { EVENT_CODES } from '@/lib/observability/eventCodes';
import { MESSAGE_DOSSIER_CLOS, RAISON_DOSSIER_CLOS, accepteNouvelEnvoi } from '@/lib/patient/cycleDeVie';
import {
  createRequestContext,
  finalizeLogContext,
  withCorrelationHeader,
} from '@/lib/observability/requestContext';

// GET /api/praticien/booklet?idSynthese=SYN...
// Génère et retourne le HTML du booklet (prévisualisation praticien)
export async function GET(req: Request) {
  const requestContext = createRequestContext(req);
  const session = await getServerSession(authOptions);
  if (!session) return withCorrelationHeader(NextResponse.json({ error: 'Non authentifié.' }, { status: 401 }), requestContext);

  const { searchParams } = new URL(req.url);
  const idSynthese = (searchParams.get('idSynthese') ?? '').trim();

  if (!idSynthese) return withCorrelationHeader(NextResponse.json({ error: 'idSynthese requis.' }, { status: 400 }), requestContext);

  try {
    const synthese = await prisma.syntheseIA.findUnique({
      where: { idSynthese },
      include: { bookletEnvois: { orderBy: { dateEnvoi: 'desc' }, take: 1 } },
    });

    if (!synthese) return withCorrelationHeader(NextResponse.json({ error: 'Synthèse introuvable.' }, { status: 404 }), requestContext);

    if (synthese.statut !== 'Validee_Praticien' && synthese.statut !== 'Corrigee_Praticien') {
      return withCorrelationHeader(NextResponse.json(
        { error: 'La synthèse doit être validée par le praticien avant de préparer le booklet.' },
        { status: 422 }
      ), requestContext);
    }

    const patient = await prisma.patient.findUnique({ where: { idPatient: synthese.idPatient } });
    const patientNom = patient ? `${patient.prenom} ${patient.nom}` : '';
    const dateDocument = (synthese.dateValidation ?? synthese.dateGeneration)
      .toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

    const syntheseData = synthese.syntheseJson as unknown as SyntheseSchema;
    const html = buildBookletHTML(patientNom, dateDocument, syntheseData, synthese.notesPraticien ?? '');

    const dernierEnvoi = synthese.bookletEnvois[0];

    return withCorrelationHeader(NextResponse.json({
      html,
      patientNom,
      patientEmail: synthese.emailPatient,
      idPatient: synthese.idPatient,
      dateDocument,
      dejaEnvoye: !!dernierEnvoi,
      dernierEnvoiDate: dernierEnvoi?.dateEnvoi?.toISOString() ?? null,
      dernierEnvoiEmailMasque: dernierEnvoi ? maskEmail(synthese.emailPatient) : null,
    }), requestContext);
  } catch (err) {
    logger.error({
      event: EVENT_CODES.BOOKLET_GET_EXCEPTION,
      domain: 'BOOKLET',
      message: 'Échec génération preview booklet',
      context: finalizeLogContext(requestContext, { statusCode: 500, retryable: true }),
      error: err,
    });
    return withCorrelationHeader(NextResponse.json({ error: 'Erreur technique.' }, { status: 500 }), requestContext);
  }
}

// POST /api/praticien/booklet/send
// Envoie le booklet par email au patient (confirmation relecture obligatoire)
export async function POST(req: Request) {
  const requestContext = createRequestContext(req);
  const session = await getServerSession(authOptions);
  if (!session) return withCorrelationHeader(NextResponse.json({ error: 'Non authentifié.' }, { status: 401 }), requestContext);

  type SendBody = { idSynthese?: string; relectureConfirmee?: boolean; forceSend?: boolean };
  let body: SendBody;
  try {
    body = (await req.json()) as SendBody;
  } catch {
    return withCorrelationHeader(NextResponse.json({ error: 'JSON invalide.' }, { status: 400 }), requestContext);
  }

  const idSynthese = (body.idSynthese ?? '').trim();
  const relectureConfirmee = body.relectureConfirmee === true;
  const forceSend = body.forceSend === true;

  if (!idSynthese) return withCorrelationHeader(NextResponse.json({ error: 'idSynthese requis.' }, { status: 400 }), requestContext);

  if (!relectureConfirmee) {
    await logBookletEnvoi(idSynthese, '', '', 'Erreur', 'Blocage_Relecture', false,
      'Relecture praticien non confirmée.');
    return withCorrelationHeader(NextResponse.json(
      { error: 'La relecture praticien doit être confirmée avant l\'envoi patient.' },
      { status: 422 }
    ), requestContext);
  }

  const emailSession = emailPraticien(session);
  if (!emailSession) return withCorrelationHeader(NextResponse.json({ error: 'Non authentifié.' }, { status: 401 }), requestContext);

  try {
    // Garde d'appartenance AVANT tout envoi : c'est la route qui expédie
    // réellement un document au patient. Sans elle, un praticien pourrait
    // envoyer le booklet d'un patient qui n'est pas le sien.
    const synthese = await prisma.syntheseIA.findFirst({
      where: { idSynthese, patient: filtrePatientsDuPraticien(emailSession) },
      include: { bookletEnvois: { orderBy: { dateEnvoi: 'desc' }, take: 1 } },
    });

    if (!synthese) return withCorrelationHeader(NextResponse.json({ error: 'Synthèse introuvable.' }, { status: 404 }), requestContext);

    if (synthese.statut !== 'Validee_Praticien' && synthese.statut !== 'Corrigee_Praticien') {
      await logBookletEnvoi(idSynthese, synthese.idPatient, synthese.emailPatient,
        'Erreur', 'Preparation', relectureConfirmee, 'Synthèse non validée.');
      return withCorrelationHeader(NextResponse.json(
        { error: 'La synthèse doit être validée avant l\'envoi.' },
        { status: 422 }
      ), requestContext);
    }

    if (!forceSend && synthese.bookletEnvois.length > 0) {
      await logBookletEnvoi(idSynthese, synthese.idPatient, synthese.emailPatient,
        'Confirmation_Requise', 'Renvoi', relectureConfirmee, 'Booklet déjà envoyé.');
      return withCorrelationHeader(NextResponse.json({
        needsConfirmation: true,
        warning: 'Ce booklet a déjà été envoyé. Ajoutez forceSend: true pour confirmer le renvoi.',
        emailMasque: maskEmail(synthese.emailPatient),
      }), requestContext);
    }

    const patient = await prisma.patient.findUnique({ where: { idPatient: synthese.idPatient } });
    const patientNom = patient ? `${patient.prenom} ${patient.nom}` : '';
    const dateDocument = (synthese.dateValidation ?? synthese.dateGeneration)
      .toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

    const syntheseData = synthese.syntheseJson as unknown as SyntheseSchema;
    const html = buildBookletHTML(patientNom, dateDocument, syntheseData, synthese.notesPraticien ?? '');

    // Dossier au suivi clôturé : plus aucun document ne part. La garde porte
    // sur l'ENVOI, pas sur l'aperçu — consulter le document d'un dossier clos
    // reste légitime. Elle est dans la route et non dans l'écran, sinon un
    // appel direct la contournerait.
    if (patient && !accepteNouvelEnvoi(patient)) {
      return withCorrelationHeader(NextResponse.json(
        { success: false, reason: RAISON_DOSSIER_CLOS, error: MESSAGE_DOSSIER_CLOS },
        { status: 409 }
      ), requestContext);
    }

    // Envoi email via nodemailer (SMTP via compte noreply@wellneuro.fr)
    const smtpUrl = process.env.SMTP_URL;
    if (!smtpUrl) {
      await logBookletEnvoi(idSynthese, synthese.idPatient, synthese.emailPatient,
        'Erreur', forceSend ? 'Renvoi' : 'Envoi', relectureConfirmee, 'SMTP_URL non configurée.');
      return withCorrelationHeader(NextResponse.json(
        { error: 'SMTP_URL absente dans .env.local. Configurez l\'envoi email avant d\'envoyer le booklet.' },
        { status: 503 }
      ), requestContext);
    }

    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport(smtpUrl);

    await transporter.sendMail({
      from: '"Wellneuro" <noreply@wellneuro.fr>',
      to: synthese.emailPatient,
      subject: 'Votre bilan neuronutritionnel validé — Wellneuro',
      text: 'Bonjour,\n\nVotre praticien vous transmet votre bilan neuronutritionnel Wellneuro.\nCe document a été préparé après validation humaine et ne constitue pas un diagnostic médical.\n\nBien cordialement,\nL\'équipe Wellneuro',
      html,
    });

    await logBookletEnvoi(idSynthese, synthese.idPatient, synthese.emailPatient,
      'Envoye', forceSend ? 'Renvoi' : 'Envoi', relectureConfirmee, '');

    return withCorrelationHeader(NextResponse.json({ success: true, emailMasque: maskEmail(synthese.emailPatient) }), requestContext);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({
      event: EVENT_CODES.BOOKLET_SEND_EXCEPTION,
      domain: 'BOOKLET',
      message: 'Échec envoi booklet patient',
      context: finalizeLogContext(requestContext, { statusCode: 500, retryable: true }),
      error: sanitizeAuditError(msg),
    });
    return withCorrelationHeader(NextResponse.json({ error: 'Erreur lors de l\'envoi. Vérifiez le terminal Next.js.' }, { status: 500 }), requestContext);
  }
}

async function logBookletEnvoi(
  idSynthese: string, idPatient: string, emailPatient: string,
  statut: string, operation: string, relectureConfirmee: boolean, erreur: string
) {
  try {
    await prisma.bookletEnvoi.create({
      data: {
        idSynthese,
        idPatient,
        emailPatientMasque: emailPatient ? maskEmail(emailPatient) : '[inconnu]',
        statut,
        operation,
        relectureConfirmee,
        erreurCourte: erreur ? sanitizeAuditError(erreur) : undefined,
      },
    });
  } catch { /* audit non bloquant */ }
}
