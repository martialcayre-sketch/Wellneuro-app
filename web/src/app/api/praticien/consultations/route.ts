import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPublicId } from '@/lib/ids';
import { buildPortalUrl } from '@/lib/consultation/portal-access';
import { isMotifValide } from '@/lib/consultation/motifs';
import { sendPortailLinkEmail } from '@/lib/consultation/email';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';

export type Consultation = {
  idConsultation: string;
  idPatient: string;
  motif: string | null;
  statut: string;
  dateValidation: string | null;
  createdAt: string;
};

export type ConsultationsApiResponse = {
  consultations: Consultation[];
  unavailable?: boolean;
  reason?: 'unauthenticated' | 'invalid_payload' | 'exception';
};

export type CreateConsultationResponse = {
  success: boolean;
  idConsultation?: string;
  accessToken?: string;
  lien?: string;
  error?: string;
  reason?: 'unauthenticated' | 'invalid_payload' | 'patient_not_found' | 'forbidden' | 'exception';
};

type CreateConsultationPayload = {
  idPatient?: string;
  motif?: string;
};

// GET /api/praticien/consultations?idPatient=... — historique des consultations d'un patient.
export async function GET(req: Request): Promise<NextResponse<ConsultationsApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ consultations: [], unavailable: true, reason: 'unauthenticated' }, { status: 401 });
  }
  const idPatient = (new URL(req.url).searchParams.get('idPatient') ?? '').trim();
  if (!idPatient) {
    return NextResponse.json({ consultations: [], unavailable: true, reason: 'invalid_payload' }, { status: 400 });
  }
  const emailSession = emailPraticien(session);
  if (!emailSession) {
    return NextResponse.json({ consultations: [], unavailable: true, reason: 'unauthenticated' }, { status: 401 });
  }
  try {
    // Garde d'appartenance : `Consultation` n'a pas de relation Prisma vers
    // `Patient`, seulement la colonne `praticienEmail` écrite à la création
    // (POST ci-dessous) — on scope directement dessus.
    const rows = await prisma.consultation.findMany({
      where: { idPatient, praticienEmail: emailSession },
      orderBy: { createdAt: 'desc' },
    });
    const consultations: Consultation[] = rows.map(c => ({
      idConsultation: c.idConsultation,
      idPatient: c.idPatient,
      motif: c.motif,
      statut: c.statut,
      dateValidation: c.dateValidation ? c.dateValidation.toISOString() : null,
      createdAt: c.createdAt.toISOString(),
    }));
    return NextResponse.json({ consultations });
  } catch {
    return NextResponse.json({ consultations: [], unavailable: true, reason: 'exception' }, { status: 500 });
  }
}

// POST /api/praticien/consultations — crée une consultation pour un patient,
// s'assure qu'un token d'accès existe, et envoie le lien du portail.
export async function POST(req: Request): Promise<NextResponse<CreateConsultationResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ success: false, reason: 'unauthenticated', error: 'Session absente.' }, { status: 401 });
  }

  let payload: CreateConsultationPayload;
  try {
    payload = (await req.json()) as CreateConsultationPayload;
  } catch {
    return NextResponse.json({ success: false, reason: 'invalid_payload', error: 'JSON invalide.' }, { status: 400 });
  }

  const idPatient = (payload.idPatient ?? '').trim();
  const motifRaw = (payload.motif ?? '').trim();
  if (!idPatient) {
    return NextResponse.json({ success: false, reason: 'invalid_payload', error: 'Identifiant patient requis.' }, { status: 400 });
  }
  if (motifRaw && !isMotifValide(motifRaw)) {
    return NextResponse.json({ success: false, reason: 'invalid_payload', error: 'Motif de consultation invalide.' }, { status: 400 });
  }

  // Garde d'appartenance : sans elle, un praticien pouvait lever la révocation
  // d'accès et faire envoyer le lien du portail pour le patient d'un autre.
  const verdict = await verifierAppartenancePatient(idPatient, emailPraticien(session));
  if (verdict === 'introuvable') {
    return NextResponse.json(
      { success: false, reason: 'patient_not_found', error: 'Patient introuvable ou inactif.' },
      { status: 404 }
    );
  }
  if (verdict === 'autre_praticien') {
    return NextResponse.json(
      { success: false, reason: 'forbidden', error: 'Patient non accessible.' },
      { status: 403 }
    );
  }

  try {
    const patient = await prisma.patient.findUnique({ where: { idPatient } });
    if (!patient || !patient.actif) {
      return NextResponse.json(
        { success: false, reason: 'patient_not_found', error: 'Patient introuvable ou inactif.' },
        { status: 404 }
      );
    }

    // Assure un token d'accès permanent (création si absent, réactivation si révoqué).
    let accessToken = patient.accessToken ?? '';
    if (!accessToken || patient.accessTokenRevoked) {
      accessToken = accessToken || createPublicId('TOK');
      await prisma.patient.update({
        where: { idPatient },
        data: {
          accessToken,
          accessTokenRevoked: false,
          accessTokenCreatedAt: patient.accessTokenCreatedAt ?? new Date(),
        },
      });
    }

    const idConsultation = createPublicId('CONS');
    await prisma.consultation.create({
      data: {
        idConsultation,
        idPatient: patient.idPatient,
        emailPatient: patient.email,
        praticienEmail: (session.user?.email ?? '').toLowerCase(),
        statut: 'creee',
        motif: motifRaw || null,
      },
    });

    const lien = buildPortalUrl(accessToken);
    try {
      // En serverless, on attend explicitement la promesse pour eviter que
      // l'envoi best-effort soit interrompu juste apres la reponse HTTP.
      await sendPortailLinkEmail(patient.email, patient.prenom, lien, motifRaw || null);
    } catch (e) {
      console.error('[praticien/consultations POST] email:', (e as Error).message);
    }

    return NextResponse.json({ success: true, idConsultation, accessToken, lien });
  } catch {
    return NextResponse.json({ success: false, reason: 'exception', error: 'Erreur technique lors de la création de la consultation.' });
  }
}
