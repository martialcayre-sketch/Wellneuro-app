import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isSessionAuthorizedForAssignment, readPatientSession } from '@/lib/patient-session';

// Lecture patient minimale du protocole (C2A LOT-02). Prouve le chemin d'accès
// patient protégé et l'absence d'accès inter-patient, sans exposer le contenu
// de protocol_drafts (§8.3 : le patient ne lit jamais la table directement).
// Session portail OBLIGATOIRE : le chemin legacy email-gate est exclu (§8.4).
// Le contenu diffusable (vue patient dérivée) relève de LOT-03/LOT-05.

type PatientProtocoleResponse =
  | { ok: true; hasReviewedProtocol: boolean; status: string | null; reviewedAt: string | null }
  | { ok: false; reason: string; error: string };

// GET /api/patient/protocole?id=ASS...
export async function GET(req: Request): Promise<NextResponse<PatientProtocoleResponse>> {
  try {
    const { searchParams } = new URL(req.url);
    const idAssignation = (searchParams.get('id') ?? '').trim();

    if (!idAssignation || !/^[A-Za-z0-9_-]+$/.test(idAssignation) || idAssignation.length > 64) {
      return NextResponse.json(
        { ok: false, reason: 'invalid', error: 'Identifiant invalide.' },
        { status: 400 },
      );
    }

    // Session portail obligatoire — pas de repli email (§8.4).
    const patientSession = readPatientSession(req);
    if (!patientSession) {
      return NextResponse.json(
        { ok: false, reason: 'unauthenticated', error: 'Connexion au portail requise.' },
        { status: 401 },
      );
    }

    const ass = await prisma.assignation.findUnique({ where: { idAssignation } });
    if (!ass || !(await isSessionAuthorizedForAssignment(patientSession, ass))) {
      return NextResponse.json(
        { ok: false, reason: 'not_found', error: 'Assignation non reconnue.' },
        { status: 404 },
      );
    }

    // Scopé au patient de l'assignation vérifiée : aucun accès inter-patient.
    const draft = await prisma.protocolDraft.findFirst({
      where: { idPatient: ass.idPatient, status: 'practitioner_reviewed' },
      orderBy: { createdAt: 'desc' },
      select: { status: true, reviewedAt: true },
    });

    return NextResponse.json({
      ok: true,
      hasReviewedProtocol: draft !== null,
      status: draft?.status ?? null,
      reviewedAt: draft?.reviewedAt ? draft.reviewedAt.toISOString() : null,
    });
  } catch (err) {
    console.error('[patient/protocole GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { ok: false, reason: 'exception', error: 'Erreur technique.' },
      { status: 500 },
    );
  }
}
