import { NextResponse } from 'next/server';
import {
  listJaObservationSnapshots,
  saveJaObservationSnapshot,
  type JaObservationSnapshot,
  type JaObservationSnapshotInput,
} from '@/lib/food-observation/persistence';
import { isPatientSessionBoundToToken, readPatientSession } from '@/lib/patient-session';
import { prisma } from '@/lib/prisma';

type ErrorResponse = { ok: false; reason: string; error: string };
type ListResponse = { ok: true; snapshots: JaObservationSnapshot[] } | ErrorResponse;
type SaveResponse = { ok: true; snapshot: JaObservationSnapshot } | ErrorResponse;

function isPayload(value: unknown): value is Omit<JaObservationSnapshotInput, 'idPatient' | 'actor'> {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.episode === 'object'
    && Array.isArray(v.traces)
    && Array.isArray(v.pauses)
    && Array.isArray(v.plans)
    && Array.isArray(v.solutions)
    && Array.isArray(v.actionCareer)
  );
}

async function resolveAuthorizedSession(req: Request): Promise<{ idPatient: string } | null> {
  const session = readPatientSession(req);
  if (!session) return null;

  const patient = await prisma.patient.findUnique({
    where: { idPatient: session.idPatient },
    select: {
      actif: true,
      accessToken: true,
      accessTokenRevoked: true,
      email: true,
    },
  });

  if (!patient || !patient.actif || !patient.accessToken || patient.accessTokenRevoked) return null;
  if (patient.email.toLowerCase() !== session.email.toLowerCase()) return null;
  if (!isPatientSessionBoundToToken(session, patient.accessToken)) return null;

  return { idPatient: session.idPatient };
}

export async function GET(req: Request): Promise<NextResponse<ListResponse>> {
  try {
    const auth = await resolveAuthorizedSession(req);
    if (!auth) {
      return NextResponse.json(
        { ok: false, reason: 'unauthorized', error: 'Session portail invalide ou expirée.' },
        { status: 401 },
      );
    }

    const snapshots = await listJaObservationSnapshots(auth.idPatient);
    return NextResponse.json({ ok: true, snapshots });
  } catch (error) {
    console.error('[portail/ja/observations GET]', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { ok: false, reason: 'exception', error: 'Erreur technique.' },
      { status: 500 },
    );
  }
}

export async function POST(req: Request): Promise<NextResponse<SaveResponse>> {
  try {
    const auth = await resolveAuthorizedSession(req);
    if (!auth) {
      return NextResponse.json(
        { ok: false, reason: 'unauthorized', error: 'Session portail invalide ou expirée.' },
        { status: 401 },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { ok: false, reason: 'invalid_payload', error: 'JSON invalide.' },
        { status: 400 },
      );
    }

    if (!isPayload(body)) {
      return NextResponse.json(
        { ok: false, reason: 'invalid_payload', error: 'Corps de requête incomplet.' },
        { status: 400 },
      );
    }

    const snapshot = await saveJaObservationSnapshot({
      idPatient: auth.idPatient,
      episode: body.episode,
      traces: body.traces,
      pauses: body.pauses,
      plans: body.plans,
      solutions: body.solutions,
      actionCareer: body.actionCareer,
      supersedesDraftId: typeof body.supersedesDraftId === 'string' ? body.supersedesDraftId : undefined,
      actor: 'patient',
    });

    return NextResponse.json({ ok: true, snapshot }, { status: 201 });
  } catch (error) {
    if (error instanceof TypeError) {
      return NextResponse.json(
        { ok: false, reason: 'invalid_payload', error: error.message },
        { status: 400 },
      );
    }

    console.error('[portail/ja/observations POST]', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { ok: false, reason: 'exception', error: 'Erreur technique.' },
      { status: 500 },
    );
  }
}
