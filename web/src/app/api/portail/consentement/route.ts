import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readPatientSession } from '@/lib/patient-session';
import {
  resolvePortailPatientFromSession,
  consultationCourante,
  CONSENTEMENT_VERSION,
  FINALITE_CONSENTEMENT,
} from '@/lib/consultation/portail';

export type PortailConsentementResponse = { ok: true } | { ok: false; reason: string; error: string };

// POST /api/portail/consentement — recueille le consentement au niveau de la
// consultation courante, avant toute saisie de fiche/anamnèse. Auth par cookie
// de session (LOT-04) : plus de couple jeton+email ; l'identité vient du cookie.
export async function POST(req: Request): Promise<NextResponse<PortailConsentementResponse>> {
  const session = readPatientSession(req);
  if (!session) {
    return NextResponse.json({ ok: false, reason: 'unauthenticated', error: 'Session expirée. Reconnectez-vous.' }, { status: 401 });
  }

  try {
    const patient = await resolvePortailPatientFromSession(session);
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
