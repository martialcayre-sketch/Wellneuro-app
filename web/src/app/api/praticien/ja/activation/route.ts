import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  activateJaObservationSnapshot,
  getLatestJaActivation,
  type JaActivationSummary,
} from '@/lib/food-observation/persistence';
import { verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import type { GabaritAcces } from '@/lib/praticien/journalAcces';

// Gabarit littéral pour le journal des accès (G-TRUST-04) — jamais l'URL reçue.
const ROUTE_JOURNAL = '/api/praticien/ja/activation';

type ErrorResponse = { ok: false; reason: string; error: string };
type GetResponse = { ok: true; activation: JaActivationSummary | null } | ErrorResponse;
type PostResponse = { ok: true; activation: JaActivationSummary } | ErrorResponse;

type ActivationPayload = {
  idPatient: string;
  draftId: string;
  milestone: 'J7' | 'J14' | 'J21';
  deltaDecision: string;
  feedbackPatient: string;
  chargePercue: 'faible' | 'moderee' | 'elevee';
  budgetChargeGlobal: number;
};

function sanitizePatientId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(trimmed)) return null;
  return trimmed;
}

function isActivationPayload(value: unknown): value is ActivationPayload {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.idPatient === 'string'
    && typeof v.draftId === 'string'
    && typeof v.milestone === 'string'
    && typeof v.deltaDecision === 'string'
    && typeof v.feedbackPatient === 'string'
    && typeof v.chargePercue === 'string'
    && typeof v.budgetChargeGlobal === 'number'
  );
}

// Adaptateur de la garde factorisée : conserve le contrat booléen historique
// de cette route (patient inexistant et patient d'un autre praticien rendent
// le même 403). `acces` n'est transmis que par le GET (G-TRUST-04) ; la garde
// attend un e-mail minuscule, d'où le `.toLowerCase()`.
async function ensurePractitionerScope(
  idPatient: string,
  practitionerEmail: string,
  acces?: GabaritAcces,
): Promise<boolean> {
  const verdict = await verifierAppartenancePatient(idPatient, practitionerEmail.toLowerCase(), acces);
  return verdict === 'accessible';
}

export async function GET(req: Request): Promise<NextResponse<GetResponse>> {
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

    const allowed = await ensurePractitionerScope(idPatient, session.user.email, {
      route: ROUTE_JOURNAL,
      methode: 'GET',
    });
    if (!allowed) {
      return NextResponse.json(
        { ok: false, reason: 'forbidden', error: 'Patient non accessible pour ce praticien.' },
        { status: 403 },
      );
    }

    const activation = await getLatestJaActivation(idPatient);
    return NextResponse.json({ ok: true, activation });
  } catch (error) {
    console.error('[praticien/ja/activation GET]', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { ok: false, reason: 'exception', error: 'Erreur technique.' },
      { status: 500 },
    );
  }
}

export async function POST(req: Request): Promise<NextResponse<PostResponse>> {
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

    if (!isActivationPayload(body)) {
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

    const allowed = await ensurePractitionerScope(idPatient, session.user.email);
    if (!allowed) {
      return NextResponse.json(
        { ok: false, reason: 'forbidden', error: 'Patient non accessible pour ce praticien.' },
        { status: 403 },
      );
    }

    const activation = await activateJaObservationSnapshot({
      idPatient,
      draftId: body.draftId,
      milestone: body.milestone,
      deltaDecision: body.deltaDecision,
      feedbackPatient: body.feedbackPatient,
      chargePercue: body.chargePercue,
      budgetChargeGlobal: body.budgetChargeGlobal,
    });

    return NextResponse.json({ ok: true, activation }, { status: 201 });
  } catch (error) {
    if (error instanceof TypeError) {
      return NextResponse.json(
        { ok: false, reason: 'invalid_payload', error: error.message },
        { status: 400 },
      );
    }

    console.error('[praticien/ja/activation POST]', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { ok: false, reason: 'exception', error: 'Erreur technique.' },
      { status: 500 },
    );
  }
}
