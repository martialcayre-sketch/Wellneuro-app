import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readPatientSession } from '@/lib/patient-session';
import { mapAssignationPatient, type AssignationPatient } from '@/lib/consultation/mapAssignation';

export type PortailAssignationsResponse =
  | {
      ok: true;
      patient: { prenom: string; nom: string };
      assignations: AssignationPatient[];
    }
  | { ok: false; reason: 'unauthorized' | 'exception'; error: string };

// GET /api/portail/assignations — toutes les assignations du patient de la
// session portail (cookie signé wn_portail). Alimente le hub « Mes questionnaires ».
export async function GET(req: Request): Promise<NextResponse<PortailAssignationsResponse>> {
  const session = readPatientSession(req);
  if (!session) {
    return NextResponse.json(
      { ok: false, reason: 'unauthorized', error: 'Session expirée. Reconnectez-vous depuis votre lien.' },
      { status: 401 },
    );
  }

  try {
    const patient = await prisma.patient.findUnique({
      where: { idPatient: session.idPatient },
      select: { prenom: true, nom: true, email: true, actif: true, accessTokenRevoked: true },
    });
    // Le patient doit toujours être actif et non révoqué, même avec un cookie valide.
    if (!patient || !patient.actif || patient.accessTokenRevoked || patient.email.toLowerCase() !== session.email) {
      return NextResponse.json(
        { ok: false, reason: 'unauthorized', error: 'Accès non reconnu ou révoqué.' },
        { status: 401 },
      );
    }

    // idPatient (issu de la session vérifiée) est la clé fiable ; on n'ajoute pas
    // de filtre email pour éviter les écarts de casse en base.
    const assignationsDb = await prisma.assignation.findMany({
      where: { idPatient: session.idPatient },
      orderBy: [{ dateAssignation: 'desc' }],
    });

    const assignations: AssignationPatient[] = assignationsDb.map(mapAssignationPatient);

    return NextResponse.json({
      ok: true,
      patient: { prenom: patient.prenom, nom: patient.nom },
      assignations,
    });
  } catch (err) {
    console.error('[portail/assignations GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}
