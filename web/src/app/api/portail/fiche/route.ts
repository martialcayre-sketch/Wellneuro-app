import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readPatientSession } from '@/lib/patient-session';
import {
  resolvePortailPatientFromSession,
  consultationCourante,
} from '@/lib/consultation/portail';
import { normaliserFiche, FICHE_CHAMPS_REQUIS } from '@/lib/consultation/fiche';
import { isMotifValide } from '@/lib/consultation/motifs';

export type PortailFicheResponse = { ok: true } | { ok: false; reason: string; error: string };

type Payload = { fiche?: unknown; motif?: string };

// POST /api/portail/fiche — enregistre la fiche signalétique + le motif. Auth par
// cookie de session (LOT-04) : l'identité vient du cookie, plus de jeton+email.
export async function POST(req: Request): Promise<NextResponse<PortailFicheResponse>> {
  const session = readPatientSession(req);
  if (!session) {
    return NextResponse.json({ ok: false, reason: 'unauthenticated', error: 'Session expirée. Reconnectez-vous.' }, { status: 401 });
  }

  let payload: Payload;
  try {
    payload = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ ok: false, reason: 'invalid_payload', error: 'JSON invalide.' }, { status: 400 });
  }

  const motif = (payload.motif ?? '').trim();
  if (motif && !isMotifValide(motif)) {
    return NextResponse.json({ ok: false, reason: 'invalid_payload', error: 'Motif de consultation invalide.' }, { status: 400 });
  }

  const fiche = normaliserFiche(payload.fiche);
  const champManquant = FICHE_CHAMPS_REQUIS.find(id => !fiche[id]);
  if (champManquant) {
    return NextResponse.json(
      { ok: false, reason: 'invalid_payload', error: 'Merci de renseigner au moins votre situation familiale et votre profession.' },
      { status: 400 }
    );
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
      return NextResponse.json({ ok: false, reason: 'consent_required', error: 'Consentement requis avant la saisie.' }, { status: 409 });
    }

    await prisma.consultation.update({
      where: { idConsultation: consultation.idConsultation },
      data: {
        ficheSignaletique: fiche,
        motif: motif || consultation.motif,
        statut: 'en_cours',
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[portail/fiche POST]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}
