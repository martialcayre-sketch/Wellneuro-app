import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isSessionValideForPatient, readPatientSession } from '@/lib/patient-session';
import { getLatestJaActivation, type JaActivationSummary } from '@/lib/food-observation/persistence';

type ErrorResponse = { ok: false; reason: string; error: string };
type DecisionResponse = {
  ok: true;
  hasDecision: boolean;
  decision: {
    milestone: JaActivationSummary['milestone'];
    feedbackPatient: string;
    deltaDecision: string;
    chargePercue: JaActivationSummary['chargePercue'];
    budgetChargeGlobal: number;
    reviewedAt: string;
  } | null;
} | ErrorResponse;

async function resolveAuthorizedSession(req: Request): Promise<{ idPatient: string } | null> {
  const session = readPatientSession(req);
  if (!session) return null;

  const patient = await prisma.patient.findUnique({
    where: { idPatient: session.idPatient },
    select: {
      idPatient: true,
      actif: true,
      accessToken: true,
      accessTokenRevoked: true,
      email: true,
      sessionsInvalidesAvant: true,
    },
  });

  if (!patient || !isSessionValideForPatient(session, patient)) return null;

  return { idPatient: session.idPatient };
}

export async function GET(req: Request): Promise<NextResponse<DecisionResponse>> {
  try {
    const auth = await resolveAuthorizedSession(req);
    if (!auth) {
      return NextResponse.json(
        { ok: false, reason: 'unauthorized', error: 'Session portail invalide ou expirée.' },
        { status: 401 },
      );
    }

    const activation = await getLatestJaActivation(auth.idPatient);
    if (!activation) {
      return NextResponse.json({ ok: true, hasDecision: false, decision: null });
    }

    return NextResponse.json({
      ok: true,
      hasDecision: true,
      decision: {
        milestone: activation.milestone,
        feedbackPatient: activation.feedbackPatient,
        deltaDecision: activation.deltaDecision,
        chargePercue: activation.chargePercue,
        budgetChargeGlobal: activation.budgetChargeGlobal,
        reviewedAt: activation.reviewedAt,
      },
    });
  } catch (error) {
    console.error('[portail/ja/decision GET]', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { ok: false, reason: 'exception', error: 'Erreur technique.' },
      { status: 500 },
    );
  }
}
