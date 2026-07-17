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

export async function saveJaObservationSnapshot(input: JaObservationSnapshotInput): Promise<JaObservationSnapshot> {
  const idPatient = ensurePatientId(input.idPatient);
  const capturedAt = new Date().toISOString();
  const payload = {
    actor: input.actor,
    capturedAt,
    episode: input.episode,
    traces: input.traces,
    pauses: input.pauses,
    plans: input.plans,
    solutions: input.solutions,
    actionCareer: input.actionCareer,
  };

  const draftId = buildDraftId(input.episode.episodeId, capturedAt);
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
    episodeId: data.episode?.episodeId ?? input.episode.episodeId,
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

  return rows.map((row) => {
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
