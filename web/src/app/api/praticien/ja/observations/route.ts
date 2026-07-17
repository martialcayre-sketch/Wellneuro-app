import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  listJaObservationSnapshots,
  saveJaObservationSnapshot,
  type JaObservationSnapshot,
  type JaObservationSnapshotInput,
} from '@/lib/food-observation/persistence';

type ErrorResponse = { ok: false; reason: string; error: string };
type ListResponse = { ok: true; snapshots: JaObservationSnapshot[] } | ErrorResponse;
type SaveResponse = { ok: true; snapshot: JaObservationSnapshot } | ErrorResponse;

function sanitizePatientId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(trimmed)) return null;
  return trimmed;
}

function isPayload(value: unknown): value is Omit<JaObservationSnapshotInput, 'actor'> {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.idPatient === 'string'
    && typeof v.episode === 'object'
    && Array.isArray(v.traces)
    && Array.isArray(v.pauses)
    && Array.isArray(v.plans)
    && Array.isArray(v.solutions)
    && Array.isArray(v.actionCareer)
  );
}

export async function GET(req: Request): Promise<NextResponse<ListResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { ok: false, reason: 'unauthenticated', error: 'Authentification praticien requise.' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const idPatient = sanitizePatientId(searchParams.get('idPatient'));
    if (!idPatient) {
      return NextResponse.json(
        { ok: false, reason: 'invalid_payload', error: 'Identifiant patient invalide.' },
        { status: 400 },
      );
    }

    const patient = await prisma.patient.findUnique({
      where: { idPatient },
      select: { praticienEmail: true },
    });
    if (!patient || patient.praticienEmail.toLowerCase() !== session.user.email.toLowerCase()) {
      return NextResponse.json(
        { ok: false, reason: 'forbidden', error: 'Patient non accessible pour ce praticien.' },
        { status: 403 },
      );
    }

    const snapshots = await listJaObservationSnapshots(idPatient);
    return NextResponse.json({ ok: true, snapshots });
  } catch (error) {
    console.error('[praticien/ja/observations GET]', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { ok: false, reason: 'exception', error: 'Erreur technique.' },
      { status: 500 },
    );
  }
}

export async function POST(req: Request): Promise<NextResponse<SaveResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { ok: false, reason: 'unauthenticated', error: 'Authentification praticien requise.' },
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

    const idPatient = sanitizePatientId(body.idPatient);
    if (!idPatient) {
      return NextResponse.json(
        { ok: false, reason: 'invalid_payload', error: 'Identifiant patient invalide.' },
        { status: 400 },
      );
    }

    const patient = await prisma.patient.findUnique({
      where: { idPatient },
      select: { praticienEmail: true },
    });
    if (!patient || patient.praticienEmail.toLowerCase() !== session.user.email.toLowerCase()) {
      return NextResponse.json(
        { ok: false, reason: 'forbidden', error: 'Patient non accessible pour ce praticien.' },
        { status: 403 },
      );
    }

    const snapshot = await saveJaObservationSnapshot({
      idPatient,
      episode: body.episode,
      traces: body.traces,
      pauses: body.pauses,
      plans: body.plans,
      solutions: body.solutions,
      actionCareer: body.actionCareer,
      supersedesDraftId: typeof body.supersedesDraftId === 'string' ? body.supersedesDraftId : undefined,
      actor: 'praticien',
    });

    return NextResponse.json({ ok: true, snapshot }, { status: 201 });
  } catch (error) {
    if (error instanceof TypeError) {
      return NextResponse.json(
        { ok: false, reason: 'invalid_payload', error: error.message },
        { status: 400 },
      );
    }
    console.error('[praticien/ja/observations POST]', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { ok: false, reason: 'exception', error: 'Erreur technique.' },
      { status: 500 },
    );
  }
}
