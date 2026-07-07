import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPublicId } from '@/lib/ids';
import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';
import nodemailer from 'nodemailer';

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
  reason?: 'unauthenticated' | 'invalid_payload' | 'patient_not_found' | 'pack_not_found' | 'exception';
};

const catalogue = QUESTIONNAIRE_CATALOGUE as Record<string, { id: string; titre: string }>;

// POST /api/praticien/packs/assign — assigne tous les questionnaires d'un pack
// à un patient (N assignations), puis envoie un seul email récapitulatif.
export async function POST(req: Request): Promise<NextResponse<AssignPackResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ success: false, reason: 'unauthenticated', error: 'Session absente.' }, { status: 401 });
  }

  let payload: AssignPackPayload;
  try {
    payload = (await req.json()) as AssignPackPayload;
  } catch {
    return NextResponse.json({ success: false, reason: 'invalid_payload', error: 'JSON invalide.' }, { status: 400 });
  }

  const idPack = (payload.idPack ?? '').trim();
  const emailPatient = (payload.emailPatient ?? '').trim().toLowerCase().slice(0, 254);
  const notes = (payload.notes ?? '').trim().slice(0, 500);
  const dateLimite = (payload.dateLimite ?? '').trim();

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailPatient);
  const isDateValid = !dateLimite || /^\d{4}-\d{2}-\d{2}$/.test(dateLimite);

  if (!idPack || !emailPatient || !isEmailValid || !isDateValid) {
    return NextResponse.json(
      {
        success: false,
        reason: 'invalid_payload',
        error: !idPack ? 'Pack requis.' : !isEmailValid ? 'Email patient invalide.' : 'Date limite invalide (AAAA-MM-JJ).',
      },
      { status: 400 }
    );
  }

  try {
    const patient = await prisma.patient.findUnique({ where: { email: emailPatient } });
    if (!patient || !patient.actif) {
      return NextResponse.json(
        { success: false, reason: 'patient_not_found', error: 'Patient introuvable (email non présent/actif).' },
        { status: 404 }
      );
    }

    const pack = await prisma.pack.findUnique({ where: { idPack } });
    if (!pack || !pack.actif || pack.qids.length === 0) {
      return NextResponse.json(
        { success: false, reason: 'pack_not_found', error: 'Pack introuvable, inactif ou vide.' },
        { status: 404 }
      );
    }

    const notesPack = notes || `Pack ${pack.nom}`;
    const nowIso = new Date().toISOString();
    const cree: { idAssignation: string; titre: string }[] = [];

    // Une assignation par questionnaire du pack (ids inexistants ignorés).
    for (const idQuestionnaire of pack.qids) {
      const questionnaire = catalogue[idQuestionnaire];
      if (!questionnaire) continue;
      const idAssignation = createPublicId('ASS');
      const titre = questionnaire.titre || idQuestionnaire;
      await prisma.assignation.create({
        data: {
          idAssignation,
          idPatient: patient.idPatient,
          emailPatient,
          idQuestionnaire,
          titre,
          dateAssignation: new Date(nowIso),
          dateLimite: dateLimite || null,
          statut: 'En attente',
          notes: notesPack,
        },
      });
      cree.push({ idAssignation, titre });
    }

    if (cree.length === 0) {
      return NextResponse.json(
        { success: false, reason: 'pack_not_found', error: 'Aucun questionnaire valide dans ce pack.' },
        { status: 404 }
      );
    }

    // Un seul email récapitulatif (best-effort), lien vers la première assignation.
    sendPackEmail(emailPatient, pack.nom, cree, dateLimite, notes).catch(
      e => console.error('[packs/assign POST] email patient:', (e as Error).message)
    );

    return NextResponse.json({ success: true, count: cree.length, packNom: pack.nom });
  } catch {
    return NextResponse.json({ success: false, reason: 'exception', error: "Erreur technique lors de l'assignation du pack." });
  }
}

async function sendPackEmail(
  patientEmail: string,
  packNom: string,
  assignations: { idAssignation: string; titre: string }[],
  dateLimite: string,
  notes: string
) {
  const smtpUrl = process.env.SMTP_URL;
  if (!smtpUrl) return;
  const baseUrl = (process.env.NEXTAUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  const link = `${baseUrl}/patient/${assignations[0].idAssignation}`;
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
      `Accéder à vos questionnaires :\n${link}\n\n` +
      `L'équipe Wellneuro`,
  });
}
