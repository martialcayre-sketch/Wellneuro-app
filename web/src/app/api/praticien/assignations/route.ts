import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPublicId } from '@/lib/ids';
import nodemailer from 'nodemailer';

const DATA_START = 3;

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
    | 'no_sheet_id'
    | 'no_access_token'
    | 'invalid_payload'
    | 'patient_not_found'
    | 'questionnaire_not_found'
    | 'sheets_400'
    | 'sheets_401'
    | 'sheets_403'
    | 'sheets_404'
    | 'exception';
};

function mapSheetsReason(status: number): CreateAssignationResponse['reason'] {
  if (status === 400) return 'sheets_400';
  if (status === 401) return 'sheets_401';
  if (status === 403) return 'sheets_403';
  if (status === 404) return 'sheets_404';
  return 'exception';
}

export async function POST(req: Request): Promise<NextResponse<CreateAssignationResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { success: false, reason: 'unauthenticated', error: 'Session absente.' },
      { status: 401 }
    );
  }

  const sheetId = process.env.SHEET_ID;
  const accessToken = session.accessToken;
  if (!sheetId || !accessToken) {
    return NextResponse.json({
      success: false,
      reason: !sheetId ? 'no_sheet_id' : 'no_access_token',
      error: 'Configuration incomplète.',
    });
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
    const readRanges = ['Patients!A:J', 'Questionnaires!A:F'];
    const readQs = readRanges.map(r => `ranges=${encodeURIComponent(r)}`).join('&');
    const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchGet?${readQs}`;

    const readResp = await fetch(readUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });

    if (!readResp.ok) {
      return NextResponse.json({
        success: false,
        reason: mapSheetsReason(readResp.status),
        error: 'Impossible de lire les données Patients/Questionnaires.',
      });
    }

    const readData = await readResp.json();
    const patientRows: string[][] = (readData.valueRanges?.[0]?.values ?? []).slice(DATA_START);
    const questionnaireRows: string[][] = (readData.valueRanges?.[1]?.values ?? []).slice(DATA_START);

    const patientRow = patientRows.find(row => {
      const rowId = row[0] ?? '';
      const rowEmail = (row[1] ?? '').trim().toLowerCase();
      const rowRole = row[2] ?? '';
      const rowActif = row[9] ?? '';
      return Boolean(rowId) && rowEmail === emailPatient && rowRole === 'Patient' && rowActif === 'OUI';
    });

    if (!patientRow) {
      return NextResponse.json(
        {
          success: false,
          reason: 'patient_not_found',
          error: 'Patient introuvable (email non présent/actif dans la feuille Patients).',
        },
        { status: 404 }
      );
    }

    const questionnaireRow = questionnaireRows.find(row => {
      const rowId = row[0] ?? '';
      const rowActif = row[5] ?? '';
      return rowId === idQuestionnaire && rowActif === 'OUI';
    });

    if (!questionnaireRow) {
      return NextResponse.json(
        {
          success: false,
          reason: 'questionnaire_not_found',
          error: 'Questionnaire introuvable ou inactif.',
        },
        { status: 404 }
      );
    }

    const idAssignation = createPublicId('ASS');
    const idPatient = patientRow[0] ?? '';
    const titre = titrePayload || (questionnaireRow[1] ?? idQuestionnaire);
    const nowIso = new Date().toISOString();

    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent('Assignations!A:I')}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
    const appendResp = await fetch(appendUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [[
          idAssignation,
          idPatient,
          emailPatient,
          idQuestionnaire,
          titre,
          nowIso,
          dateLimite,
          'En attente',
          notes,
        ]],
      }),
    });

    if (!appendResp.ok) {
      return NextResponse.json({
        success: false,
        reason: mapSheetsReason(appendResp.status),
        error: "Impossible de créer l'assignation dans Google Sheets.",
      });
    }

    // Sync best-effort → PostgreSQL
    prisma.assignation.upsert({
      where: { idAssignation },
      update: {},
      create: {
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
    }).catch(e => console.error('[assignations POST] sync PG:', (e as Error).message));

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
