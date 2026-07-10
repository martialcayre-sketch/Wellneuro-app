import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  isTokenValide,
  isEmailValide,
  resolvePortailPatient,
  consultationCourante,
} from '@/lib/consultation/portail';
import {
  PORTAIL_COOKIE_NAME,
  PORTAIL_COOKIE_OPTIONS,
  signPatientSession,
} from '@/lib/patient-session';

export type PortailConsultationState = {
  idConsultation: string;
  statut: string;
  motif: string | null;
  consentementDonne: boolean;
  ficheRemplie: boolean;
  anamneseRemplie: boolean;
};

export type PortailSessionResponse =
  | {
      ok: true;
      patient: { prenom: string; nom: string; email: string };
      consultation: PortailConsultationState | null;
      premiereAssignation: string | null;
    }
  | { ok: false; reason: string; error: string };

type Payload = { token?: string; email?: string };

// POST /api/portail/session — « login » du portail patient.
export async function POST(req: Request): Promise<NextResponse<PortailSessionResponse>> {
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

    // Première assignation en attente (pour enchaîner vers le flux questionnaire existant).
    const premiere = await prisma.assignation.findFirst({
      where: { idPatient: patient.idPatient, statut: { not: 'Complété' } },
      orderBy: { dateAssignation: 'asc' },
      select: { idAssignation: true },
    });

    const res = NextResponse.json<PortailSessionResponse>({
      ok: true,
      patient: { prenom: patient.prenom, nom: patient.nom, email: patient.email },
      consultation: consultation
        ? {
            idConsultation: consultation.idConsultation,
            statut: consultation.statut,
            motif: consultation.motif,
            consentementDonne: consultation.consentement === 'donne',
            ficheRemplie: consultation.ficheSignaletique != null,
            anamneseRemplie: consultation.anamnese != null,
          }
        : null,
      premiereAssignation: premiere?.idAssignation ?? null,
    });

    // Pose le cookie de session portail : l'email n'est saisi qu'ici, puis
    // porté par le cookie signé pour les appels suivants (hub, questionnaires).
    res.cookies.set(
      PORTAIL_COOKIE_NAME,
      signPatientSession({ idPatient: patient.idPatient, email: patient.email }),
      PORTAIL_COOKIE_OPTIONS,
    );

    return res;
  } catch (err) {
    console.error('[portail/session GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}
