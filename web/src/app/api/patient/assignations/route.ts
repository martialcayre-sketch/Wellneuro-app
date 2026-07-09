import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readPatientSession } from '@/lib/patient-session';
import { mapAssignationPatient, type AssignationPatient } from '@/lib/consultation/mapAssignation';

export type PatientAssignationsResponse =
  | { ok: true; assignations: AssignationPatient[] }
  | { ok: false; reason: 'not_found' | 'invalid' | 'exception'; error: string };

// GET /api/patient/assignations?id=ASS...&email=...
export async function GET(req: Request): Promise<NextResponse<PatientAssignationsResponse>> {
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
      return NextResponse.json(
        { ok: false, reason: 'not_found', error: 'Assignation introuvable pour cet email.' },
        { status: 404 }
      );
    }

    const assignationsDb = await prisma.assignation.findMany({
      where: {
        idPatient: ass.idPatient,
        emailPatient: ass.emailPatient,
      },
      orderBy: [{ dateAssignation: 'desc' }],
    });

    const assignations: AssignationPatient[] = assignationsDb.map(mapAssignationPatient);

    return NextResponse.json({ ok: true, assignations });
  } catch (err) {
    console.error('[patient/assignations GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}