import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateScore } from '@/lib/questions';
import { createPublicId } from '@/lib/ids';
import { isDeadlineExpired } from '@/lib/patient-access';
import nodemailer from 'nodemailer';

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
export async function POST(req: Request): Promise<NextResponse<PatientSubmitResponse>> {
  let payload: SubmitPayload;
  try {
    payload = (await req.json()) as SubmitPayload;
  } catch {
    return NextResponse.json({ ok: false, reason: 'invalid_payload', error: 'JSON invalide.' }, { status: 400 });
  }

  const { idAssignation, email, answers } = payload;

  if (!idAssignation || !answers || !email) {
    return NextResponse.json({ ok: false, reason: 'invalid_payload', error: 'Données manquantes.' }, { status: 400 });
  }
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(idAssignation)) {
    return NextResponse.json({ ok: false, reason: 'invalid_payload', error: 'Identifiant invalide.' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, reason: 'invalid_payload', error: 'Email invalide.' }, { status: 400 });
  }
  if (typeof answers !== 'object' || Array.isArray(answers)) {
    return NextResponse.json({ ok: false, reason: 'invalid_payload', error: 'Format réponses invalide.' }, { status: 400 });
  }
  const answerCount = Object.keys(answers).length;
  if (answerCount === 0 || answerCount > 500) {
    return NextResponse.json({ ok: false, reason: 'invalid_payload', error: 'Nombre de réponses invalide.' }, { status: 400 });
  }

  try {
    const ass = await prisma.assignation.findUnique({ where: { idAssignation } });
    if (!ass || ass.emailPatient.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ ok: false, reason: 'forbidden', error: 'Assignation non reconnue.' }, { status: 403 });
    }
    if (ass.statutReponses === 'verrouille' || ass.statutReponses === 'modification_demandee') {
      return NextResponse.json({ ok: false, reason: 'already_done', error: 'Ce questionnaire a déjà été complété.' }, { status: 409 });
    }
    // Un déverrouillage explicite du praticien passe outre la date limite d'origine.
    if (ass.statutReponses !== 'deverrouille' && isDeadlineExpired(ass.dateLimite)) {
      return NextResponse.json({ ok: false, reason: 'expired', error: 'Ce lien de questionnaire a expiré.' }, { status: 410 });
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
      console.error('[patient/submit] ack email:', (e as Error).message)
    );

    return NextResponse.json({ ok: true, scores, titre });
  } catch (err) {
    console.error('[patient/submit POST]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique lors de la soumission.' }, { status: 500 });
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
