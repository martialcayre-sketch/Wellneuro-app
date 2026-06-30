import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateScore } from '@/lib/questions';
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

  const { idAssignation, idPatient, email, idQuestionnaire, answers } = payload;

  if (!idQuestionnaire || !answers || !email || !idPatient) {
    return NextResponse.json({ ok: false, reason: 'invalid_payload', error: 'Données manquantes.' }, { status: 400 });
  }
  if (typeof answers !== 'object' || Array.isArray(answers)) {
    return NextResponse.json({ ok: false, reason: 'invalid_payload', error: 'Format réponses invalide.' }, { status: 400 });
  }
  const answerCount = Object.keys(answers).length;
  if (answerCount === 0 || answerCount > 500) {
    return NextResponse.json({ ok: false, reason: 'invalid_payload', error: 'Nombre de réponses invalide.' }, { status: 400 });
  }

  try {
    // Vérifier l'assignation appartient bien à ce patient/email
    if (idAssignation) {
      const ass = await prisma.assignation.findUnique({ where: { idAssignation } });
      if (!ass || ass.emailPatient.toLowerCase() !== email.toLowerCase()) {
        return NextResponse.json({ ok: false, reason: 'forbidden', error: 'Assignation non reconnue.' }, { status: 403 });
      }
    }

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

    // Titre depuis le catalogue (scores.titre peut être absent — on utilise idQuestionnaire comme fallback)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scoresWithAnswers = { ...scores, rawAnswers: answers } as any;

    const idReponse = `REP${Date.now()}`;
    const now = new Date();

    // Sauvegarder en PostgreSQL
    await prisma.questionnaireReponse.create({
      data: {
        idReponse,
        idPatient,
        emailPatient: email.toLowerCase(),
        idAssignation: idAssignation ?? null,
        idQuestionnaire,
        titre: (scores as Record<string, unknown>).titre as string ?? idQuestionnaire,
        dateReponse: now,
        scoresJson: scoresWithAnswers,
        scorePrincipal,
        interpretation: interpretation || null,
      },
    });

    // Mettre à jour le statut de l'assignation
    if (idAssignation) {
      await prisma.assignation.updateMany({
        where: { idAssignation },
        data: { statut: 'Complété' },
      });
    }

    // Accusé de réception email (best-effort, ne bloque pas)
    sendAck(email, idQuestionnaire).catch(e =>
      console.error('[patient/submit] ack email:', (e as Error).message)
    );

    return NextResponse.json({ ok: true, scores, titre: idQuestionnaire });
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
