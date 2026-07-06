import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPublicId } from '@/lib/ids';
import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';
import nodemailer from 'nodemailer';

type CreateAssignationPayload = {
  emailPatient?: string;
  idQuestionnaire?: string;
  titre?: string;
  dateLimite?: string;
  notes?: string;
};

export type CreateAssignationResponse = {
  success: boolean;
  idAssignation?: string;
  error?: string;
  reason?:
    | 'unauthenticated'
    | 'invalid_payload'
    | 'patient_not_found'
    | 'questionnaire_not_found'
    | 'exception';
};

export async function POST(req: Request): Promise<NextResponse<CreateAssignationResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { success: false, reason: 'unauthenticated', error: 'Session absente.' },
      { status: 401 }
    );
  }

  let payload: CreateAssignationPayload;
  try {
    payload = (await req.json()) as CreateAssignationPayload;
  } catch {
    return NextResponse.json(
      { success: false, reason: 'invalid_payload', error: 'JSON invalide.' },
      { status: 400 }
    );
  }

  const emailPatient = (payload.emailPatient ?? '').trim().toLowerCase().slice(0, 254);
  const idQuestionnaire = (payload.idQuestionnaire ?? '').trim().slice(0, 50);
  const titrePayload = (payload.titre ?? '').trim().slice(0, 200);
  const notes = (payload.notes ?? '').trim().slice(0, 500);
  const dateLimite = (payload.dateLimite ?? '').trim();

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailPatient);
  const isDateValid = !dateLimite || /^\d{4}-\d{2}-\d{2}$/.test(dateLimite);

  if (!emailPatient || !idQuestionnaire || !isEmailValid || !isDateValid) {
    return NextResponse.json(
      {
        success: false,
        reason: 'invalid_payload',
        error: !emailPatient || !isEmailValid
          ? 'Email patient invalide.'
          : !idQuestionnaire
            ? 'Questionnaire requis.'
            : 'Date limite invalide (format attendu : AAAA-MM-JJ).',
      },
      { status: 400 }
    );
  }

  try {
    const patient = await prisma.patient.findUnique({ where: { email: emailPatient } });

    if (!patient || !patient.actif) {
      return NextResponse.json(
        {
          success: false,
          reason: 'patient_not_found',
          error: 'Patient introuvable (email non présent/actif).',
        },
        { status: 404 }
      );
    }

    // NB : le champ "actif" du catalogue (désactivation dynamique d'un questionnaire)
    // n'est pas encore porté en base/code — seule l'existence de l'ID est vérifiée ici.
    const questionnaire = (QUESTIONNAIRE_CATALOGUE as Record<string, { id: string; titre: string }>)[idQuestionnaire];

    if (!questionnaire) {
      return NextResponse.json(
        {
          success: false,
          reason: 'questionnaire_not_found',
          error: 'Questionnaire introuvable.',
        },
        { status: 404 }
      );
    }

    const idAssignation = createPublicId('ASS');
    const idPatient = patient.idPatient;
    const titre = titrePayload || questionnaire.titre || idQuestionnaire;
    const nowIso = new Date().toISOString();

    await prisma.assignation.create({
      data: {
        idAssignation,
        idPatient,
        emailPatient,
        idQuestionnaire,
        titre,
        dateAssignation: new Date(nowIso),
        dateLimite: dateLimite || null,
        statut: 'En attente',
        notes: notes || null,
      },
    });

    // Email patient avec lien questionnaire (best-effort)
    sendAssignmentEmail(emailPatient, titre, dateLimite, notes, idAssignation).catch(
      e => console.error('[assignations POST] email patient:', (e as Error).message)
    );

    return NextResponse.json({ success: true, idAssignation });
  } catch {
    return NextResponse.json({
      success: false,
      reason: 'exception',
      error: "Erreur technique lors de la création de l'assignation.",
    });
  }
}

export type PatchAssignationResponse = {
  success: boolean;
  error?: string;
  reason?: 'unauthenticated' | 'invalid_payload' | 'not_found' | 'exception';
};

// PATCH /api/praticien/assignations — déverrouillage manuel des réponses (R8-lite)
export async function PATCH(req: Request): Promise<NextResponse<PatchAssignationResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { success: false, reason: 'unauthenticated', error: 'Session absente.' },
      { status: 401 }
    );
  }

  let payload: { idAssignation?: string };
  try {
    payload = (await req.json()) as { idAssignation?: string };
  } catch {
    return NextResponse.json({ success: false, reason: 'invalid_payload', error: 'JSON invalide.' }, { status: 400 });
  }

  const idAssignation = (payload.idAssignation ?? '').trim();
  if (!idAssignation) {
    return NextResponse.json({ success: false, reason: 'invalid_payload', error: 'Identifiant requis.' }, { status: 400 });
  }

  try {
    const ass = await prisma.assignation.findUnique({ where: { idAssignation } });
    if (!ass) {
      return NextResponse.json({ success: false, reason: 'not_found', error: 'Assignation introuvable.' }, { status: 404 });
    }
    await prisma.assignation.update({
      where: { idAssignation },
      data: { statutReponses: 'deverrouille' },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({
      success: false,
      reason: 'exception',
      error: 'Erreur technique lors du déverrouillage.',
    });
  }
}

async function sendAssignmentEmail(
  patientEmail: string,
  titreQuestionnaire: string,
  dateLimite: string,
  notes: string,
  idAssignation: string
) {
  const smtpUrl = process.env.SMTP_URL;
  if (!smtpUrl) return;
  const baseUrl = (process.env.NEXTAUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  const link = `${baseUrl}/patient/${idAssignation}`;
  const transport = nodemailer.createTransport(smtpUrl);
  const dateInfo = dateLimite ? `\nÀ compléter avant le : ${dateLimite}` : '';
  const noteInfo = notes ? `\nNote de votre praticien : ${notes}` : '';
  await transport.sendMail({
    from: '"Wellneuro" <noreply@wellneuro.fr>',
    to: patientEmail,
    subject: 'Questionnaire à compléter avant votre consultation — Wellneuro',
    text:
      `Bonjour,\n\n` +
      `Votre praticien vous invite à compléter le questionnaire suivant avant votre consultation :\n` +
      `« ${titreQuestionnaire} »${dateInfo}${noteInfo}\n\n` +
      `Accédez à votre questionnaire ici :\n${link}\n\n` +
      `L'équipe Wellneuro`,
  });
}
