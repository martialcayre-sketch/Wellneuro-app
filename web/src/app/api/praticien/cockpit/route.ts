import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailPraticien, filtrePatientsDuPraticien } from '@/lib/praticien/appartenance';
import { journaliserAccesDossier } from '@/lib/praticien/journalAcces';
import { construireReperes, resoudreAsOf, tronquerA } from '@/lib/praticien/lectureAsOf';
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
      // Instant de lecture quand la fiche est relue à une date passée (SP-TT).
      // `null` ou absent = état présent, comportement historique.
      asOf?: string | null;
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

// Gabarit littéral pour le journal des accès (G-TRUST-04) — jamais l'URL reçue.
const ROUTE_JOURNAL = '/api/praticien/cockpit';

function unavailable(reason: CockpitUnavailableReason, error: string, status: number) {
  return NextResponse.json<CockpitRuntimeApiResponse>({ status: 'unavailable', reason, error }, { status });
}

// `emailPraticien` scope la lecture au praticien connecté : un patient d'un
// autre praticien est traité comme introuvable, ce qui évite d'en révéler
// l'existence. Point de passage unique du GET comme du POST.
// `asOfBrut` : lecture d'un état passé (SP-TT). Absent ⇒ présent, comportement
// strictement inchangé. Présent ⇒ doit correspondre à un repère réel du patient,
// sinon la lecture est refusée — jamais silencieusement ramenée au présent.
async function loadRuntimeInputs(idPatient: string, emailPraticien: string, asOfBrut?: string | null) {
  const patient = await prisma.patient.findFirst({
    where: { idPatient, ...filtrePatientsDuPraticien(emailPraticien) },
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

  const episodes = asOfBrut
    ? await prisma.assessmentEpisode.findMany({
        where: { idPatient },
        select: { milestone: true, confirmedAt: true },
      })
    : [];
  const resolution = resoudreAsOf(asOfBrut, construireReperes({ episodes, reponses: responses }));
  if (resolution.mode === 'refus') return { refus: resolution.raison } as const;

  const asOf = resolution.mode === 'passe' ? resolution.date : null;
  // Le passé est RECALCULÉ depuis les données brutes tronquées, jamais relu
  // depuis un snapshot : aucune donnée postérieure ne peut fuir dans la lecture.
  return {
    ...adaptRuntimeInputs(patient, tronquerA(responses, asOf), consultation),
    asOf: asOf ? asOf.toISOString() : null,
  };
}

// GET /api/praticien/cockpit?idPatient=PAT001&milestone=T0
export async function GET(req: Request): Promise<NextResponse<CockpitRuntimeApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) return unavailable('unauthenticated', 'Non authentifié.', 401);

  const searchParams = new URL(req.url).searchParams;
  const idPatient = (searchParams.get('idPatient') ?? '').trim();
  const milestoneRaw = searchParams.get('milestone') ?? 'T0';
  const asOfBrut = searchParams.get('asOf');
  if (!idPatient || !isRuntimeMilestone(milestoneRaw)) {
    return unavailable('invalid_payload', 'Patient ou jalon invalide.', 400);
  }

  try {
    const email = emailPraticien(session) ?? '';
    const inputs = await loadRuntimeInputs(idPatient, email, asOfBrut);
    if (!inputs) return unavailable('patient_not_found', 'Patient introuvable.', 404);
    if ('refus' in inputs) {
      // Une date hors repères n'est jamais ramenée au présent en silence : la
      // lecture serait alors présentée comme passée tout en étant actuelle.
      return unavailable('invalid_payload', 'Date de lecture inconnue pour ce patient.', 400);
    }
    // Journalisé ICI et non dans loadRuntimeInputs : le helper sert aussi le
    // POST, qui laisse déjà une trace datée et attribuée (GD-1).
    await journaliserAccesDossier({ idPatient, praticienEmail: email, route: ROUTE_JOURNAL, methode: 'GET' });
    const { proposal, proposalHash } = proposeRuntimeEpisode(inputs, milestoneRaw);
    return NextResponse.json({ status: 'proposal_required', proposal, proposalHash, asOf: inputs.asOf });
  } catch (error) {
    console.error('[cockpit GET]', error instanceof Error ? error.message : String(error));
    return unavailable('exception', 'Erreur technique.', 500);
  }
}

// POST /api/praticien/cockpit — confirme en mémoire puis calcule la chaîne C1.
export async function POST(req: Request): Promise<NextResponse<CockpitRuntimeApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) return unavailable('unauthenticated', 'Non authentifié.', 401);

  // Le mode passé est strictement en lecture : on ne confirme jamais un épisode
  // depuis un état qui n'est plus celui du patient (SP-TT).
  if (new URL(req.url).searchParams.get('asOf')) {
    return unavailable('invalid_payload', 'Aucune écriture possible en lecture d’un état passé.', 400);
  }

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
    const inputs = await loadRuntimeInputs(idPatient, emailPraticien(session) ?? '');
    if (!inputs) return unavailable('patient_not_found', 'Patient introuvable.', 404);
    if ('refus' in inputs) return unavailable('invalid_payload', 'Date de lecture inconnue pour ce patient.', 400);
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
