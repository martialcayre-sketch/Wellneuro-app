import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { lireEquilibrePatient, type EquilibrePatient } from '@/lib/equilibre/lecturePatient';
import { isSessionAuthorizedForAssignment, readPatientSession } from '@/lib/patient-session';

// Données patient-safe uniquement : la composition vit dans `lireEquilibrePatient`,
// partagée avec l'aperçu praticien (dette t07b).
export type { BesoinPatient } from '@/lib/equilibre/lecturePatient';

export type PatientEquilibreResponse =
  | EquilibrePatient
  | { ok: false; reason: string; error: string };

// GET /api/patient/equilibre?id=ASS...
export async function GET(req: Request): Promise<NextResponse<PatientEquilibreResponse>> {
  try {
    const { searchParams } = new URL(req.url);
    const idAssignation = (searchParams.get('id') ?? '').trim();
    // Session portail OBLIGATOIRE — le repli email est retiré (LOT-04). La
    // navigation vers `/patient/[idAssignation]` est redirigée vers
    // `/portail/connexion` (next.config.mjs) : plus aucun appelant légitime
    // n'atteint cette route sans cookie.
    const patientSession = readPatientSession(req);

    if (!idAssignation || !/^[A-Za-z0-9_-]+$/.test(idAssignation) || idAssignation.length > 64) {
      return NextResponse.json({ ok: false, reason: 'invalid', error: 'Identifiant invalide.' }, { status: 400 });
    }
    if (!patientSession) {
      // 401, pas 404 : voir questionnaire/route.ts — une session expirée doit
      // rester récupérable côté client, pas se présenter comme un lien mort.
      return NextResponse.json({ ok: false, reason: 'unauthorized', error: 'Connexion au portail requise.' }, { status: 401 });
    }

    const ass = await prisma.assignation.findUnique({ where: { idAssignation } });
    if (!ass || !(await isSessionAuthorizedForAssignment(patientSession, ass))) {
      return NextResponse.json({ ok: false, reason: 'not_found', error: 'Assignation non reconnue.' }, { status: 404 });
    }

    return NextResponse.json(await lireEquilibrePatient(ass.idPatient));
  } catch (err) {
    console.error('[patient/equilibre GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}
