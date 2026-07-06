import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isDeadlineExpired } from '@/lib/patient-access';

const CONSENTEMENT_VERSION = 'v1';

export type PatientConsentementResponse =
  | { ok: true }
  | { ok: false; reason: string; error: string };

type ConsentementPayload = {
  idAssignation?: string;
  email?: string;
  action?: 'donner' | 'demander_modification';
};

// POST /api/patient/consentement
export async function POST(req: Request): Promise<NextResponse<PatientConsentementResponse>> {
  let payload: ConsentementPayload;
  try {
    payload = (await req.json()) as ConsentementPayload;
  } catch {
    return NextResponse.json({ ok: false, reason: 'invalid_payload', error: 'JSON invalide.' }, { status: 400 });
  }

  const { idAssignation, email } = payload;
  const action = payload.action ?? 'donner';

  if (!idAssignation || !email) {
    return NextResponse.json({ ok: false, reason: 'invalid_payload', error: 'Données manquantes.' }, { status: 400 });
  }
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(idAssignation)) {
    return NextResponse.json({ ok: false, reason: 'invalid_payload', error: 'Identifiant invalide.' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, reason: 'invalid_payload', error: 'Email invalide.' }, { status: 400 });
  }
  if (action !== 'donner' && action !== 'demander_modification') {
    return NextResponse.json({ ok: false, reason: 'invalid_payload', error: 'Action invalide.' }, { status: 400 });
  }

  try {
    const ass = await prisma.assignation.findUnique({ where: { idAssignation } });
    if (!ass || ass.emailPatient.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ ok: false, reason: 'forbidden', error: 'Assignation non reconnue.' }, { status: 403 });
    }
    if (isDeadlineExpired(ass.dateLimite)) {
      return NextResponse.json({ ok: false, reason: 'expired', error: 'Ce lien a expiré.' }, { status: 410 });
    }

    if (action === 'donner') {
      if (ass.consentement === 'donne') {
        return NextResponse.json({ ok: true });
      }
      await prisma.assignation.update({
        where: { idAssignation },
        data: {
          consentement: 'donne',
          consentementHorodatage: new Date(),
          consentementVersion: CONSENTEMENT_VERSION,
        },
      });
      return NextResponse.json({ ok: true });
    }

    // demander_modification : uniquement pertinent si les réponses sont verrouillées
    if (ass.statutReponses !== 'verrouille') {
      return NextResponse.json({ ok: false, reason: 'invalid_state', error: 'Demande non applicable dans l\'état actuel.' }, { status: 409 });
    }
    await prisma.assignation.update({
      where: { idAssignation },
      data: { statutReponses: 'modification_demandee' },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[patient/consentement POST]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}
