import { prisma } from '@/lib/prisma';
import { buildPublishedJaFeasibility, type PublishedJaFeasibility } from './feasibility';
import { JA_FOOD_OBSERVATION_CONTRACT_VERSION } from './persistence';
import { canonicalSha256 } from '@/lib/clinical-engine/canonical';

const JA_SELECTED_PRIORITY_ID = 'JA_FOOD_OBSERVATION';

export async function getLatestPublishedJaFeasibility(
  idPatient: string,
): Promise<PublishedJaFeasibility | null> {
  const row = await prisma.protocolDraft.findFirst({
    where: {
      idPatient,
      contractVersion: JA_FOOD_OBSERVATION_CONTRACT_VERSION,
      selectedPriorityId: JA_SELECTED_PRIORITY_ID,
      status: 'practitioner_reviewed',
    },
    orderBy: { reviewedAt: 'desc' },
    select: { id: true, inputHash: true, reviewedAt: true, payload: true },
  });
  if (!row?.reviewedAt) return null;
  const payload = row.payload as {
    episode?: unknown;
    traces?: unknown[];
    activation?: { reviewedAt?: string };
  };
  if (!payload.episode || !Array.isArray(payload.traces) || !payload.activation?.reviewedAt) {
    return null;
  }
  if (canonicalSha256(payload) !== row.inputHash) return null;
  try {
    return buildPublishedJaFeasibility({
      sourceDraftId: row.id,
      sourceInputHash: row.inputHash,
      reviewedAt: row.reviewedAt.toISOString(),
      activationReviewedAt: payload.activation.reviewedAt,
      episode: payload.episode,
      traces: payload.traces,
    });
  } catch {
    return null;
  }
}
