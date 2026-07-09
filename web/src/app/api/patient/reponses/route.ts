import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readPatientSession } from '@/lib/patient-session';

export type PatientReponsesResponse =
  | { ok: true; titre: string; dateReponse: string; scores: unknown; statutReponses: string }
  | { ok: false; reason: string; error: string };

// GET /api/patient/reponses?id=ASS...&email=...
export async function GET(req: Request): Promise<NextResponse<PatientReponsesResponse>> {
  try {
    const { searchParams } = new URL(req.url);
    const idAssignation = (searchParams.get('id') ?? '').trim();
    // Identité : cookie de session portail en priorité, sinon email en query (compat legacy).
    const emailRaw = (readPatientSession(req)?.email ?? searchParams.get('email') ?? '').trim().toLowerCase();

    if (!idAssignation || !/^[A-Za-z0-9_-]+$/.test(idAssignation) || idAssignation.length > 64) {
      return NextResponse.json({ ok: false, reason: 'invalid', error: 'Identifiant invalide.' }, { status: 400 });
    }
    if (!emailRaw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
      return NextResponse.json({ ok: false, reason: 'invalid', error: 'Email invalide.' }, { status: 400 });
    }

    const ass = await prisma.assignation.findUnique({ where: { idAssignation } });
    if (!ass || ass.emailPatient.toLowerCase() !== emailRaw) {
      return NextResponse.json({ ok: false, reason: 'not_found', error: 'Assignation non reconnue.' }, { status: 404 });
    }

    const reponse = await prisma.questionnaireReponse.findFirst({
      where: { idAssignation },
      orderBy: { dateReponse: 'desc' },
    });
    if (!reponse) {
      return NextResponse.json({ ok: false, reason: 'not_found', error: 'Aucune réponse enregistrée pour ce questionnaire.' }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      titre: reponse.titre,
      dateReponse: reponse.dateReponse.toISOString(),
      scores: reponse.scoresJson,
      statutReponses: ass.statutReponses,
    });
  } catch (err) {
    console.error('[patient/reponses GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}
