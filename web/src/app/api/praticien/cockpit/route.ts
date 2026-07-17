import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { confirmAssessmentEpisode } from '@/lib/clinical-engine/assessmentEpisode';
import { buildClinicalReview } from '@/lib/clinical-engine/clinicalReview';
import { buildClinicalSnapshot } from '@/lib/clinical-engine/clinicalSnapshot';
import { buildDecisionCard } from '@/lib/clinical-engine/decisionCard';
import {
  adaptRuntimeInputs,
  isRuntimeMilestone,
  proposeRuntimeEpisode,
} from '@/lib/clinical-engine/runtimeFromPrisma';
import type {
  ClinicalReview,
  ClinicalSnapshot,
  DecisionCard,
  ProposedAssessmentEpisode,
} from '@/lib/clinical-engine/types';
import type { JalonMomentum } from '@/lib/equilibre/types';

type CockpitUnavailableReason =
  | 'unauthenticated'
  | 'invalid_payload'
  | 'patient_not_found'
  | 'proposal_stale'
  | 'exception';

export type CockpitRuntimeApiResponse =
  | {
      status: 'proposal_required';
      proposal: ProposedAssessmentEpisode;
      proposalHash: string;
    }
  | {
      status: 'ready';
      snapshot: ClinicalSnapshot;
      review: ClinicalReview;
      decisionCard: DecisionCard;
    }
  | {
      status: 'unavailable';
      reason: CockpitUnavailableReason;
      error: string;
    };

export type ConfirmCockpitEpisodePayload = {
  idPatient?: string;
  milestone?: JalonMomentum;
  includedResponseIds?: string[];
  proposalHash?: string;
};

function unavailable(reason: CockpitUnavailableReason, error: string, status: number) {
  return NextResponse.json<CockpitRuntimeApiResponse>({ status: 'unavailable', reason, error }, { status });
}

async function loadRuntimeInputs(idPatient: string) {
  const patient = await prisma.patient.findUnique({
    where: { idPatient },
    select: { idPatient: true, createdAt: true },
  });
  if (!patient) return null;

  const [responses, consultation] = await Promise.all([
    prisma.questionnaireReponse.findMany({
      where: { idPatient },
      select: { idReponse: true, idQuestionnaire: true, dateReponse: true, scoresJson: true },
      orderBy: [{ dateReponse: 'asc' }, { idReponse: 'asc' }],
    }),
    prisma.consultation.findFirst({
      where: { idPatient, statut: 'validee' },
      select: { anamnese: true },
      orderBy: [{ dateValidation: 'desc' }, { createdAt: 'desc' }],
    }),
  ]);
  return adaptRuntimeInputs(patient, responses, consultation);
}

// GET /api/praticien/cockpit?idPatient=PAT001&milestone=T0
export async function GET(req: Request): Promise<NextResponse<CockpitRuntimeApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) return unavailable('unauthenticated', 'Non authentifié.', 401);

  const searchParams = new URL(req.url).searchParams;
  const idPatient = (searchParams.get('idPatient') ?? '').trim();
  const milestoneRaw = searchParams.get('milestone') ?? 'T0';
  if (!idPatient || !isRuntimeMilestone(milestoneRaw)) {
    return unavailable('invalid_payload', 'Patient ou jalon invalide.', 400);
  }

  try {
    const inputs = await loadRuntimeInputs(idPatient);
    if (!inputs) return unavailable('patient_not_found', 'Patient introuvable.', 404);
    const { proposal, proposalHash } = proposeRuntimeEpisode(inputs, milestoneRaw);
    return NextResponse.json({ status: 'proposal_required', proposal, proposalHash });
  } catch (error) {
    console.error('[cockpit GET]', error instanceof Error ? error.message : String(error));
    return unavailable('exception', 'Erreur technique.', 500);
  }
}

// POST /api/praticien/cockpit — confirme en mémoire puis calcule la chaîne C1.
export async function POST(req: Request): Promise<NextResponse<CockpitRuntimeApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) return unavailable('unauthenticated', 'Non authentifié.', 401);

  let payload: ConfirmCockpitEpisodePayload;
  try {
    payload = await req.json() as ConfirmCockpitEpisodePayload;
  } catch {
    return unavailable('invalid_payload', 'JSON invalide.', 400);
  }
  const idPatient = (payload.idPatient ?? '').trim();
  const includedResponseIds = payload.includedResponseIds;
  const proposalHash = (payload.proposalHash ?? '').trim();
  if (
    !idPatient
    || !isRuntimeMilestone(payload.milestone)
    || !Array.isArray(includedResponseIds)
    || includedResponseIds.some(id => typeof id !== 'string' || !id.trim())
    || !proposalHash
  ) {
    return unavailable('invalid_payload', 'Confirmation d’épisode invalide.', 400);
  }

  try {
    const inputs = await loadRuntimeInputs(idPatient);
    if (!inputs) return unavailable('patient_not_found', 'Patient introuvable.', 404);
    const current = proposeRuntimeEpisode(inputs, payload.milestone);
    if (current.proposalHash !== proposalHash) {
      return unavailable('proposal_stale', 'Les réponses ont changé. Rechargez la proposition.', 409);
    }

    const now = new Date().toISOString();
    const episode = confirmAssessmentEpisode(current.proposal, includedResponseIds, now);
    const idSuffix = `${payload.milestone}-${proposalHash.slice(0, 16)}`;
    const snapshot = buildClinicalSnapshot({
      snapshotId: `runtime-snapshot-${idSuffix}`,
      patientId: idPatient,
      asOf: now,
      assessmentEpisode: episode,
      patientContext: inputs.patientContext,
      responses: inputs.responses,
    });
    const review = buildClinicalReview({
      reviewId: `runtime-review-${idSuffix}`,
      createdAt: now,
      snapshot,
    });
    const decisionCard = buildDecisionCard({
      decisionCardId: `runtime-decision-${idSuffix}`,
      createdAt: now,
      snapshot,
      review,
    });
    return NextResponse.json({ status: 'ready', snapshot, review, decisionCard });
  } catch (error) {
    if (error instanceof TypeError) {
      return unavailable('invalid_payload', error.message, 400);
    }
    console.error('[cockpit POST]', error instanceof Error ? error.message : String(error));
    return unavailable('exception', 'Erreur technique.', 500);
  }
}
