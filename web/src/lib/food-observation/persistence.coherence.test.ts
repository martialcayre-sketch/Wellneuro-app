import { beforeEach, describe, expect, it, vi } from 'vitest';

const { canonicalSha256, prisma } = vi.hoisted(() => ({
  canonicalSha256: vi.fn(() => 'hash_test_1234567890'),
  prisma: {
    protocolDraft: { findFirst: vi.fn(), create: vi.fn() },
  },
}));

vi.mock('@/lib/clinical-engine/canonical', () => ({ canonicalSha256 }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { saveJaObservationSnapshot } from './persistence';

const EPISODE = {
  episodeId: 'ja_PAT_TEST_cycle1',
  patientId: 'PAT_TEST',
  startDate: '2026-07-20',
  endDate: '2026-08-09',
  statut: 'prepare',
  content: {
    regime: 'essai',
    hypothese: 'Hypothèse du protocole diffusé.',
    action: { actionId: 'a1', labelPatient: 'Action', simplePlan: 'Plan minimal' },
  },
  budget: { tracesParSemaine: 3 },
  schemaVersion: 'ja-domaine-v1',
  frictionsVersion: 'frictions-v1',
};

function trace(episodeId: string) {
  return {
    traceId: 't1',
    episodeId,
    localDate: '2026-07-21',
    occasionPresentee: true,
    faisable: true,
    issue: 'fait',
    frictionsVersion: 'frictions-v1',
  };
}

function entree(overrides: Record<string, unknown> = {}) {
  return {
    idPatient: 'PAT_TEST',
    episode: EPISODE,
    traces: [],
    pauses: [],
    plans: [],
    solutions: [],
    actionCareer: [],
    actor: 'patient' as const,
    ...overrides,
  };
}

// Une trace d'un autre épisode — cycle précédent restauré du brouillon local,
// ou saisie faite avant que le cycle soit résolu — serait persistée sous le
// cycle courant, puis rejetée en silence à la lecture : `buildPublishedJaFeasibility`
// lève, `getLatestPublishedJaFeasibility` avale l'exception, et la faisabilité
// JA disparaît de la boussole praticien sans message.
describe('saveJaObservationSnapshot — cohérence trace ↔ épisode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.protocolDraft.create.mockResolvedValue({
      id: 'JA_DRAFT_1',
      idPatient: 'PAT_TEST',
      supersedesDraftId: null,
      createdAt: new Date('2026-07-28T09:00:00.000Z'),
      payload: { episode: EPISODE, actor: 'patient' },
    });
  });

  it('refuse une trace relevant d’un autre épisode, sans rien écrire', async () => {
    await expect(saveJaObservationSnapshot(entree({
      traces: [trace('ja_PAT_TEST_cycle_precedent')],
    }) as never)).rejects.toThrow(/relèvent d’un autre épisode/);
    expect(prisma.protocolDraft.create).not.toHaveBeenCalled();
  });

  it('refuse aussi une trace « hors cycle » saisie avant résolution du cycle', async () => {
    await expect(saveJaObservationSnapshot(entree({
      traces: [trace('ja_PAT_TEST_hors_cycle')],
    }) as never)).rejects.toThrow(TypeError);
    expect(prisma.protocolDraft.create).not.toHaveBeenCalled();
  });

  it('refuse une pause d’un autre épisode', async () => {
    await expect(saveJaObservationSnapshot(entree({
      pauses: [{ eventId: 'p1', episodeId: 'ja_autre', semaineDu: '2026-07-20' }],
    }) as never)).rejects.toThrow(/pauses/);
    expect(prisma.protocolDraft.create).not.toHaveBeenCalled();
  });

  it('ne sur-rejette pas : une trace du cycle courant passe', async () => {
    const snapshot = await saveJaObservationSnapshot(entree({
      traces: [trace(EPISODE.episodeId)],
    }) as never);

    expect(prisma.protocolDraft.create).toHaveBeenCalledTimes(1);
    expect(snapshot.draftId).toBe('JA_DRAFT_1');
  });
});
