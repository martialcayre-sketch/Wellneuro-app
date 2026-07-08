import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  isTokenValide,
  isEmailValide,
  resolvePortailPatient,
  consultationCourante,
  CONSENTEMENT_VERSION,
  FINALITE_CONSENTEMENT,
} from '@/lib/consultation/portail';

export type PortailConsentementResponse = { ok: true } | { ok: false; reason: string; error: string };

type Payload = { token?: string; email?: string };

// POST /api/portail/consentement — recueille le consentement au niveau de la
// consultation courante, avant toute saisie de fiche/anamnèse.
export async function POST(req: Request): Promise<NextResponse<PortailConsentementResponse>> {
  let payload: Payload;
  try {
    payload = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ ok: false, reason: 'invalid_payload', error: 'JSON invalide.' }, { status: 400 });
  }

  const token = (payload.token ?? '').trim();
  const email = (payload.email ?? '').trim().toLowerCase();
  if (!isTokenValide(token) || !isEmailValide(email)) {
    return NextResponse.json({ ok: false, reason: 'invalid_payload', error: 'Identifiants invalides.' }, { status: 400 });
  }

  try {
    const patient = await resolvePortailPatient(token, email);
    if (!patient) {
      return NextResponse.json({ ok: false, reason: 'forbidden', error: 'Accès non reconnu ou révoqué.' }, { status: 403 });
    }
    const consultation = await consultationCourante(patient.idPatient);
    if (!consultation) {
      return NextResponse.json({ ok: false, reason: 'no_consultation', error: 'Aucune consultation en cours.' }, { status: 404 });
    }
    if (consultation.consentement !== 'donne') {
      await prisma.consultation.update({
        where: { idConsultation: consultation.idConsultation },
        data: {
          consentement: 'donne',
          consentementHorodatage: new Date(),
          consentementVersion: CONSENTEMENT_VERSION,
          finaliteConsentement: FINALITE_CONSENTEMENT,
        },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[portail/consentement POST]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}
