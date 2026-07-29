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

function journee(episodeId: string, localDate: string) {
  return {
    journeeId: `j_${localDate}`,
    episodeId,
    localDate,
    typeJournee: 'repos',
    momentsObserves: [],
    marqueursPresents: [],
    schemaVersion: 'ja-domaine-v2',
    marqueursVersion: 'marqueurs-ja-v1',
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

  it('refuse un plan d’un autre épisode', async () => {
    await expect(saveJaObservationSnapshot(entree({
      plans: [{ eventId: 'pl1', episodeId: 'ja_autre', from: '2026-07-21', dureeJours: 3, activatedBy: 'patient', rationaleRequired: false }],
    }) as never)).rejects.toThrow(/plans/);
    expect(prisma.protocolDraft.create).not.toHaveBeenCalled();
  });

  it('refuse une solution d’un autre épisode', async () => {
    await expect(saveJaObservationSnapshot(entree({
      solutions: [{ solutionId: 's1', episodeId: 'ja_autre', labelPatient: 'Préparer la veille', contexte: 'Semaine' }],
    }) as never)).rejects.toThrow(/solutions/);
    expect(prisma.protocolDraft.create).not.toHaveBeenCalled();
  });

  // Le lot branche le premier client d'une route d'écriture jusqu'ici dormante :
  // le contenu vient d'un navigateur patient, et rien d'autre ne borne ce qui
  // entre dans `protocol_drafts.payload`.
  it('refuse une liste hors bornes de volume', async () => {
    const trop = Array.from({ length: 201 }, (_, i) => ({ ...trace(EPISODE.episodeId), traceId: `t${i}` }));
    await expect(saveJaObservationSnapshot(entree({ traces: trop }) as never))
      .rejects.toThrow(/hors bornes/);
    expect(prisma.protocolDraft.create).not.toHaveBeenCalled();
  });

  // Lot 3 — les journées repères héritent des deux gardes, et en ajoutent une :
  // une journée par date. Sans elle, deux descriptions du même mardi feraient
  // repasser la couverture par types pour un volume.
  it('refuse une journée relevant d’un autre épisode', async () => {
    await expect(saveJaObservationSnapshot(entree({
      journees: [journee('ja_autre', '2026-07-28')],
    }) as never)).rejects.toThrow(/journées/);
    expect(prisma.protocolDraft.create).not.toHaveBeenCalled();
  });

  it('refuse deux journées portant la même date', async () => {
    await expect(saveJaObservationSnapshot(entree({
      journees: [
        journee(EPISODE.episodeId, '2026-07-28'),
        journee(EPISODE.episodeId, '2026-07-28'),
      ],
    }) as never)).rejects.toThrow(/même date/);
    expect(prisma.protocolDraft.create).not.toHaveBeenCalled();
  });

  it('accepte deux journées de dates distinctes', async () => {
    await saveJaObservationSnapshot(entree({
      journees: [
        journee(EPISODE.episodeId, '2026-07-28'),
        journee(EPISODE.episodeId, '2026-07-29'),
      ],
    }) as never);
    expect(prisma.protocolDraft.create).toHaveBeenCalledTimes(1);
  });

  it('ne sur-rejette pas : une trace du cycle courant passe', async () => {
    const snapshot = await saveJaObservationSnapshot(entree({
      traces: [trace(EPISODE.episodeId)],
    }) as never);

    expect(prisma.protocolDraft.create).toHaveBeenCalledTimes(1);
    expect(snapshot.draftId).toBe('JA_DRAFT_1');
  });
});
