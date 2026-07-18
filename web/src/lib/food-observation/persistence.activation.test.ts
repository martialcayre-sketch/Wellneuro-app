import { beforeEach, describe, expect, it, vi } from 'vitest';

const { canonicalSha256, prisma } = vi.hoisted(() => ({
  canonicalSha256: vi.fn(() => 'hash_test_1234567890'),
  prisma: {
    protocolDraft: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/clinical-engine/canonical', () => ({ canonicalSha256 }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { activateJaObservationSnapshot } from './persistence';

const payloadBase = {
  idPatient: 'PAT_TEST',
  draftId: 'JA_DRAFT_123456',
  milestone: 'J7' as const,
  deltaDecision: 'Delta de decision valide et detaille.',
  feedbackPatient: 'Feedback patient valide et detaille.',
  chargePercue: 'moderee' as const,
  budgetChargeGlobal: 8,
};

describe('activateJaObservationSnapshot — garde actor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refuse une source patient (actor=patient) sans créer de draft', async () => {
    prisma.protocolDraft.findFirst.mockResolvedValue({
      id: 'JA_DRAFT_123456',
      idPatient: 'PAT_TEST',
      payload: {
        actor: 'patient',
        episode: { episodeId: 'ja_episode_1' },
      },
    });

    await expect(activateJaObservationSnapshot(payloadBase)).rejects.toThrow(
      'Activation JA réservée aux snapshots praticien.',
    );
    expect(prisma.protocolDraft.create).not.toHaveBeenCalled();
  });

  it('refuse aussi une source sans actor déclaré', async () => {
    prisma.protocolDraft.findFirst.mockResolvedValue({
      id: 'JA_DRAFT_123456',
      idPatient: 'PAT_TEST',
      payload: {
        episode: { episodeId: 'ja_episode_1' },
      },
    });

    await expect(activateJaObservationSnapshot(payloadBase)).rejects.toThrow(
      'Activation JA réservée aux snapshots praticien.',
    );
    expect(prisma.protocolDraft.create).not.toHaveBeenCalled();
  });

  it('laisse passer une source praticien (la garde ne sur-rejette pas)', async () => {
    prisma.protocolDraft.findFirst.mockResolvedValue({
      id: 'JA_DRAFT_123456',
      idPatient: 'PAT_TEST',
      payload: {
        actor: 'praticien',
        episode: { episodeId: 'ja_episode_1' },
      },
    });
    prisma.protocolDraft.create.mockResolvedValue({
      id: 'JA_ACT_1',
      idPatient: 'PAT_TEST',
      payload: {
        actor: 'praticien',
        episode: { episodeId: 'ja_episode_1' },
        activation: {
          milestone: 'J7',
          reviewedAt: '2026-07-18T00:00:00.000Z',
          deltaDecision: 'Delta de decision valide et detaille.',
          feedbackPatient: 'Feedback patient valide et detaille.',
          chargePercue: 'moderee',
          budgetChargeGlobal: 8,
        },
      },
      reviewedAt: new Date('2026-07-18T00:00:00.000Z'),
    });

    const result = await activateJaObservationSnapshot(payloadBase);

    expect(prisma.protocolDraft.create).toHaveBeenCalledTimes(1);
    expect(result.episodeId).toBe('ja_episode_1');
    expect(result.milestone).toBe('J7');
  });
});
