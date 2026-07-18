import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: { protocolDraft: { findFirst: vi.fn() } },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { canonicalSha256 } from '@/lib/clinical-engine/canonical';
import { createEpisode } from './episode';
import { getLatestPublishedJaFeasibility } from './feasibilityRepository';

const reviewedAt = new Date('2026-07-18T12:00:00.000Z');

function payload() {
  return {
    actor: 'praticien',
    capturedAt: '2026-07-18T11:00:00.000Z',
    episode: createEpisode({
      episodeId: 'EP_JENNIFER', patientId: 'PAT_JENNIFER',
      startDate: '2026-07-18', endDate: '2026-07-25',
      content: {
        regime: 'essai', hypothese: 'Observer la praticabilité.',
        action: {
          actionId: 'ACTION_1', labelPatient: 'Essai de la semaine',
          idealPlan: 'Version idéale.', simplePlan: 'Version simple.',
        },
      },
    }),
    traces: [], pauses: [], plans: [], solutions: [], actionCareer: [],
    activation: {
      milestone: 'J7', reviewedAt: reviewedAt.toISOString(),
      deltaDecision: 'Décision factuelle relue.', feedbackPatient: 'Retour patient validé.',
      chargePercue: 'moderee', budgetChargeGlobal: 7,
    },
  };
}

describe('getLatestPublishedJaFeasibility', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ne lit que la publication praticien et vérifie son intégrité', async () => {
    const value = payload();
    prisma.protocolDraft.findFirst.mockResolvedValue({
      id: 'JA_ACT_JENNIFER', inputHash: canonicalSha256(value), reviewedAt, payload: value,
    });
    const result = await getLatestPublishedJaFeasibility('PAT_JENNIFER');
    expect(result).toMatchObject({ publicationStatus: 'published', validatedBy: 'practitioner' });
    expect(prisma.protocolDraft.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        idPatient: 'PAT_JENNIFER', status: 'practitioner_reviewed',
        contractVersion: 'ja-food-observation-v1',
      }),
    }));
  });

  it('masque une observation non publiée, altérée ou incomplète', async () => {
    prisma.protocolDraft.findFirst.mockResolvedValue(null);
    await expect(getLatestPublishedJaFeasibility('PAT_JENNIFER')).resolves.toBeNull();

    const value = payload();
    prisma.protocolDraft.findFirst.mockResolvedValue({
      id: 'JA_ACT_JENNIFER', inputHash: 'a'.repeat(64), reviewedAt, payload: value,
    });
    await expect(getLatestPublishedJaFeasibility('PAT_JENNIFER')).resolves.toBeNull();

    prisma.protocolDraft.findFirst.mockResolvedValue({
      id: 'JA_ACT_JENNIFER', inputHash: canonicalSha256({}), reviewedAt, payload: {},
    });
    await expect(getLatestPublishedJaFeasibility('PAT_JENNIFER')).resolves.toBeNull();
  });
});
