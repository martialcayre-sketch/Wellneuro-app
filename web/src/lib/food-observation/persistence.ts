import { canonicalSha256 } from '@/lib/clinical-engine/canonical';
import { prisma } from '@/lib/prisma';
import type {
  ActionCareer,
  FoodObservationEpisode,
  IntraEpisodeSolution,
  MinimalPlanEvent,
  PatientPauseEvent,
  TrialTrace,
} from '@/lib/food-observation/types';
import { readFoodObservationEpisode } from '@/lib/food-observation/episode';

export const JA_FOOD_OBSERVATION_CONTRACT_VERSION = 'ja-food-observation-v1' as const;
const JA_SELECTED_PRIORITY_ID = 'JA_FOOD_OBSERVATION';

export type JaObservationSnapshotInput = {
  idPatient: string;
  episode: FoodObservationEpisode;
  traces: TrialTrace[];
  pauses: PatientPauseEvent[];
  plans: MinimalPlanEvent[];
  solutions: IntraEpisodeSolution[];
  actionCareer: ActionCareer[];
  supersedesDraftId?: string;
  actor: 'praticien' | 'patient';
};

export type JaObservationSnapshot = {
  draftId: string;
  idPatient: string;
  episodeId: string;
  createdAt: string;
  supersedesDraftId: string | null;
  actor: 'praticien' | 'patient';
  tracesCount: number;
  pausesCount: number;
  plansCount: number;
  solutionsCount: number;
  careersCount: number;
};

export type JaMilestone = 'J7' | 'J14' | 'J21';
export type JaChargePercue = 'faible' | 'moderee' | 'elevee';

export type JaActivationInput = {
  idPatient: string;
  draftId: string;
  milestone: JaMilestone;
  deltaDecision: string;
  feedbackPatient: string;
  chargePercue: JaChargePercue;
  budgetChargeGlobal: number;
};

export type JaActivationSummary = {
  draftId: string;
  sourceDraftId: string;
  idPatient: string;
  episodeId: string;
  milestone: JaMilestone;
  deltaDecision: string;
  feedbackPatient: string;
  chargePercue: JaChargePercue;
  budgetChargeGlobal: number;
  reviewedAt: string;
};

function ensurePatientId(value: string): string {
  const trimmed = value.trim();
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(trimmed)) {
    throw new TypeError('Identifiant patient invalide.');
  }
  return trimmed;
}

function ensureDraftId(value: string): string {
  const trimmed = value.trim();
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(trimmed)) {
    throw new TypeError('Identifiant de version invalide.');
  }
  return trimmed;
}

function buildDecisionCardId(episodeId: string): string {
  return `JA_DECISION_${episodeId}`;
}

function buildDraftId(episodeId: string, atIso: string): string {
  const shortHash = canonicalSha256({ episodeId, atIso }).slice(0, 16);
  return `JA_DRAFT_${shortHash}`;
}

function isJaMilestone(value: string): value is JaMilestone {
  return value === 'J7' || value === 'J14' || value === 'J21';
}

function isChargePercue(value: string): value is JaChargePercue {
  return value === 'faible' || value === 'moderee' || value === 'elevee';
}

function buildActivationDraftId(episodeId: string, atIso: string): string {
  const shortHash = canonicalSha256({ episodeId, atIso, scope: 'activation' }).slice(0, 16);
  return `JA_ACT_${shortHash}`;
}

export async function saveJaObservationSnapshot(input: JaObservationSnapshotInput): Promise<JaObservationSnapshot> {
  const idPatient = ensurePatientId(input.idPatient);
  const episode = readFoodObservationEpisode(input.episode);
  if (episode.patientId !== idPatient) {
    throw new TypeError('L’épisode JA n’appartient pas au patient demandé.');
  }
  const capturedAt = new Date().toISOString();
  const payload = {
    actor: input.actor,
    capturedAt,
    episode,
    traces: input.traces,
    pauses: input.pauses,
    plans: input.plans,
    solutions: input.solutions,
    actionCareer: input.actionCareer,
  };

  const draftId = buildDraftId(episode.episodeId, capturedAt);
  const payloadHash = canonicalSha256(payload);
  const supersedesDraftId = input.supersedesDraftId ? ensureDraftId(input.supersedesDraftId) : null;

  const row = await prisma.protocolDraft.create({
    data: {
      id: draftId,
      idPatient,
      assessmentEpisodeId: null,
      decisionCardId: buildDecisionCardId(input.episode.episodeId),
      decisionCardInputHash: payloadHash,
      snapshotInputHash: payloadHash,
      reviewInputHash: payloadHash,
      selectedPriorityId: JA_SELECTED_PRIORITY_ID,
      status: 'draft',
      payload: payload as unknown as object,
      inputHash: payloadHash,
      contractVersion: JA_FOOD_OBSERVATION_CONTRACT_VERSION,
      supersedesDraftId,
      reviewedAt: null,
    },
    select: {
      id: true,
      idPatient: true,
      supersedesDraftId: true,
      createdAt: true,
      payload: true,
    },
  });

  const data = row.payload as {
    actor: 'praticien' | 'patient';
    episode?: { episodeId?: string };
    traces?: unknown[];
    pauses?: unknown[];
    plans?: unknown[];
    solutions?: unknown[];
    actionCareer?: unknown[];
  };

  return {
    draftId: row.id,
    idPatient: row.idPatient,
    episodeId: data.episode?.episodeId ?? episode.episodeId,
    createdAt: row.createdAt.toISOString(),
    supersedesDraftId: row.supersedesDraftId,
    actor: data.actor,
    tracesCount: Array.isArray(data.traces) ? data.traces.length : 0,
    pausesCount: Array.isArray(data.pauses) ? data.pauses.length : 0,
    plansCount: Array.isArray(data.plans) ? data.plans.length : 0,
    solutionsCount: Array.isArray(data.solutions) ? data.solutions.length : 0,
    careersCount: Array.isArray(data.actionCareer) ? data.actionCareer.length : 0,
  };
}

export async function listJaObservationSnapshots(idPatientRaw: string, limit = 10): Promise<JaObservationSnapshot[]> {
  const idPatient = ensurePatientId(idPatientRaw);
  const max = Number.isInteger(limit) ? Math.min(Math.max(limit, 1), 50) : 10;

  const rows = await prisma.protocolDraft.findMany({
    where: {
      idPatient,
      contractVersion: JA_FOOD_OBSERVATION_CONTRACT_VERSION,
      selectedPriorityId: JA_SELECTED_PRIORITY_ID,
    },
    orderBy: { createdAt: 'desc' },
    take: max,
    select: {
      id: true,
      idPatient: true,
      supersedesDraftId: true,
      createdAt: true,
      payload: true,
    },
  });

  return rows.map((row: { id: string; idPatient: string; supersedesDraftId: string | null; createdAt: Date; payload: unknown }) => {
    const data = row.payload as {
      actor?: 'praticien' | 'patient';
      episode?: { episodeId?: string };
      traces?: unknown[];
      pauses?: unknown[];
      plans?: unknown[];
      solutions?: unknown[];
      actionCareer?: unknown[];
    };

    return {
      draftId: row.id,
      idPatient: row.idPatient,
      episodeId: data.episode?.episodeId ?? 'episode_inconnu',
      createdAt: row.createdAt.toISOString(),
      supersedesDraftId: row.supersedesDraftId,
      actor: data.actor === 'patient' ? 'patient' : 'praticien',
      tracesCount: Array.isArray(data.traces) ? data.traces.length : 0,
      pausesCount: Array.isArray(data.pauses) ? data.pauses.length : 0,
      plansCount: Array.isArray(data.plans) ? data.plans.length : 0,
      solutionsCount: Array.isArray(data.solutions) ? data.solutions.length : 0,
      careersCount: Array.isArray(data.actionCareer) ? data.actionCareer.length : 0,
    };
  });
}

export async function activateJaObservationSnapshot(input: JaActivationInput): Promise<JaActivationSummary> {
  const idPatient = ensurePatientId(input.idPatient);
  const sourceDraftId = ensureDraftId(input.draftId);
  const deltaDecision = input.deltaDecision.trim();
  const feedbackPatient = input.feedbackPatient.trim();
  const budgetChargeGlobal = Number(input.budgetChargeGlobal);

  if (!isJaMilestone(input.milestone)) {
    throw new TypeError('Jalon invalide. Valeurs attendues: J7, J14, J21.');
  }
  if (!isChargePercue(input.chargePercue)) {
    throw new TypeError('Charge perçue invalide. Valeurs attendues: faible, moderee, elevee.');
  }
  if (deltaDecision.length < 10) {
    throw new TypeError('Le delta de décision doit contenir au moins 10 caractères.');
  }
  if (feedbackPatient.length < 10) {
    throw new TypeError('Le retour patient doit contenir au moins 10 caractères.');
  }
  if (!Number.isFinite(budgetChargeGlobal) || budgetChargeGlobal < 1 || budgetChargeGlobal > 21) {
    throw new TypeError('Le budget de charge global doit être compris entre 1 et 21.');
  }

  const source = await prisma.protocolDraft.findFirst({
    where: {
      id: sourceDraftId,
      idPatient,
      contractVersion: JA_FOOD_OBSERVATION_CONTRACT_VERSION,
      selectedPriorityId: JA_SELECTED_PRIORITY_ID,
    },
    select: {
      id: true,
      idPatient: true,
      payload: true,
    },
  });

  if (!source) {
    throw new TypeError('Snapshot JA introuvable pour ce patient.');
  }

  const sourcePayload = source.payload as {
    episode?: { episodeId?: string };
    actor?: 'praticien' | 'patient';
    traces?: unknown[];
    pauses?: unknown[];
    plans?: unknown[];
    solutions?: unknown[];
    actionCareer?: unknown[];
    activation?: unknown;
  };
  const episodeId = sourcePayload.episode?.episodeId;
  if (!episodeId) {
    throw new TypeError('Snapshot JA invalide: épisode manquant.');
  }

  const reviewedAt = new Date().toISOString();
  const nextPayload = {
    ...sourcePayload,
    activation: {
      milestone: input.milestone,
      reviewedAt,
      deltaDecision,
      feedbackPatient,
      chargePercue: input.chargePercue,
      budgetChargeGlobal,
    },
  };

  const nextHash = canonicalSha256(nextPayload);
  const nextDraftId = buildActivationDraftId(episodeId, reviewedAt);

  const created = await prisma.protocolDraft.create({
    data: {
      id: nextDraftId,
      idPatient,
      assessmentEpisodeId: null,
      decisionCardId: buildDecisionCardId(episodeId),
      decisionCardInputHash: nextHash,
      snapshotInputHash: nextHash,
      reviewInputHash: nextHash,
      selectedPriorityId: JA_SELECTED_PRIORITY_ID,
      status: 'practitioner_reviewed',
      payload: nextPayload as unknown as object,
      inputHash: nextHash,
      contractVersion: JA_FOOD_OBSERVATION_CONTRACT_VERSION,
      supersedesDraftId: sourceDraftId,
      reviewedAt: new Date(reviewedAt),
    },
    select: {
      id: true,
      idPatient: true,
      payload: true,
      reviewedAt: true,
    },
  });

  const activation = (created.payload as { activation?: JaActivationSummary }).activation;
  if (!activation || !created.reviewedAt) {
    throw new TypeError('Activation JA invalide après persistance.');
  }

  return {
    draftId: created.id,
    sourceDraftId,
    idPatient: created.idPatient,
    episodeId,
    milestone: activation.milestone,
    deltaDecision: activation.deltaDecision,
    feedbackPatient: activation.feedbackPatient,
    chargePercue: activation.chargePercue,
    budgetChargeGlobal: activation.budgetChargeGlobal,
    reviewedAt: created.reviewedAt.toISOString(),
  };
}

export async function getLatestJaActivation(idPatientRaw: string): Promise<JaActivationSummary | null> {
  const idPatient = ensurePatientId(idPatientRaw);

  const row = await prisma.protocolDraft.findFirst({
    where: {
      idPatient,
      contractVersion: JA_FOOD_OBSERVATION_CONTRACT_VERSION,
      selectedPriorityId: JA_SELECTED_PRIORITY_ID,
      status: 'practitioner_reviewed',
    },
    orderBy: { reviewedAt: 'desc' },
    select: {
      id: true,
      idPatient: true,
      supersedesDraftId: true,
      reviewedAt: true,
      payload: true,
    },
  });

  if (!row) return null;
  const payload = row.payload as {
    episode?: { episodeId?: string };
    activation?: {
      milestone?: string;
      deltaDecision?: string;
      feedbackPatient?: string;
      chargePercue?: string;
      budgetChargeGlobal?: number;
    };
  };

  const episodeId = payload.episode?.episodeId;
  const activation = payload.activation;
  if (!episodeId || !activation || !row.reviewedAt) return null;
  if (!activation.milestone || !activation.deltaDecision || !activation.feedbackPatient || !activation.chargePercue) {
    return null;
  }
  if (!isJaMilestone(activation.milestone) || !isChargePercue(activation.chargePercue)) {
    return null;
  }

  return {
    draftId: row.id,
    sourceDraftId: row.supersedesDraftId ?? row.id,
    idPatient: row.idPatient,
    episodeId,
    milestone: activation.milestone,
    deltaDecision: activation.deltaDecision,
    feedbackPatient: activation.feedbackPatient,
    chargePercue: activation.chargePercue,
    budgetChargeGlobal: Number(activation.budgetChargeGlobal ?? 0),
    reviewedAt: row.reviewedAt.toISOString(),
  };
}
