import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    assessmentEpisode: { upsert: vi.fn() },
    protocolDraft: { upsert: vi.fn(), findMany: vi.fn() },
    $transaction: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { buildProtocolDraft } from '@/lib/clinical-engine/protocolDraft';
import type { DecisionCard, ProtocolAction } from '@/lib/clinical-engine/types';
import { deriveProtocolDraftId, deriveVersionId } from '@/lib/protocol/versioning';
import { POST } from './route';

const episode = {
  assessmentEpisodeId: 'EPI_1',
  patientId: 'PAT_1',
  milestone: 'T0',
  targetAt: '2026-01-01T00:00:00.000Z',
  confirmedAt: '2026-01-02T00:00:00.000Z',
  status: 'confirmed',
};

const decisionCard = {
  decisionCardId: 'DEC_1',
  inputHash: 'HASH_DEC',
  snapshotInputHash: 'HASH_SNAP',
  reviewInputHash: 'HASH_REV',
  priorityCandidates: [{ candidateId: 'PRIO_1' }],
  selectedMainPriority: { candidateId: 'PRIO_1' },
  safetyFindingIds: [],
  abstention: { status: 'not_required' },
} as unknown as DecisionCard;

const action: ProtocolAction = {
  actionId: 'A1',
  type: 'food',
  title: 'Petit-déjeuner protéiné',
  idealPlan: 'Chaque matin',
  minimalPlan: 'Trois matins',
  rescuePlan: 'Un fruit',
  limitations: [],
};

const submission = {
  purpose: 'Stabiliser le matin',
  followUpCriterion: 'Réveils nocturnes < 2 par nuit à J21',
  actions: [action],
  therapeuticLoad: { level: 'light', source: 'practitioner', justification: null } as const,
};

// Version active préexistante, au MÊME contenu clinique que `submission`.
const activeDraft = buildProtocolDraft({
  protocolDraftId: deriveProtocolDraftId('DEC_1'),
  decisionCard,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  purpose: submission.purpose,
  followUpCriterion: submission.followUpCriterion,
  therapeuticLoad: submission.therapeuticLoad,
  actions: submission.actions,
  review: { reviewedAt: '2026-01-02T00:00:00.000Z', reviewerRole: 'practitioner', confirmation: 'content_reviewed' },
});
const activeRow = {
  id: deriveVersionId(deriveProtocolDraftId('DEC_1'), activeDraft.inputHash),
  inputHash: activeDraft.inputHash,
  supersedesDraftId: null,
  createdAt: new Date('2026-01-02T00:00:00.000Z'),
  payload: activeDraft,
};

function postRequest(body: unknown): Request {
  return new Request('http://localhost/api/praticien/protocoles/versions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/praticien/protocoles/versions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.$transaction.mockResolvedValue([]);
  });

  it('refuse un praticien non authentifié (401)', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await POST(postRequest({ episode, decisionCard, submission }));
    expect(res.status).toBe(401);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('crée la première version avec supersedes null', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.protocolDraft.findMany.mockResolvedValue([]);
    const res = await POST(postRequest({ episode, decisionCard, submission }));
    const json = (await res.json()) as { ok: boolean; unchanged: boolean; supersedesDraftId: string | null; versionId: string };
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.unchanged).toBe(false);
    expect(json.supersedesDraftId).toBeNull();
    expect(json.versionId.startsWith('proto_DEC_1#')).toBe(true);
    expect(prisma.protocolDraft.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: json.versionId },
        create: expect.objectContaining({ idPatient: 'PAT_1', supersedesDraftId: null, status: 'practitioner_reviewed' }),
      }),
    );
  });

  it('crée une nouvelle version chaînée sur changement clinique', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.protocolDraft.findMany.mockResolvedValue([activeRow]);
    const res = await POST(
      postRequest({
        episode,
        decisionCard,
        submission: { ...submission, purpose: 'Objectif révisé' },
      }),
    );
    const json = (await res.json()) as { unchanged: boolean; supersedesDraftId: string | null };
    expect(res.status).toBe(200);
    expect(json.unchanged).toBe(false);
    expect(json.supersedesDraftId).toBe(activeRow.id);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('est idempotent quand le contenu clinique est inchangé (no-op)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.protocolDraft.findMany.mockResolvedValue([activeRow]);
    const res = await POST(postRequest({ episode, decisionCard, submission }));
    const json = (await res.json()) as { unchanged: boolean; versionId: string };
    expect(res.status).toBe(200);
    expect(json.unchanged).toBe(true);
    expect(json.versionId).toBe(activeRow.id);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejette une version périmée (409 version_stale)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.protocolDraft.findMany.mockResolvedValue([activeRow]);
    const res = await POST(
      postRequest({ episode, decisionCard, submission, baseVersionId: 'une_autre_version' }),
    );
    const json = (await res.json()) as { reason: string };
    expect(res.status).toBe(409);
    expect(json.reason).toBe('version_stale');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejette un épisode non confirmé (400)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    const res = await POST(postRequest({ episode: { ...episode, status: 'proposed' }, decisionCard, submission }));
    const json = (await res.json()) as { reason: string };
    expect(res.status).toBe(400);
    expect(json.reason).toBe('not_confirmed');
  });

  it('rejette une soumission cliniquement invalide (400 draft_invalid)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.protocolDraft.findMany.mockResolvedValue([]);
    const res = await POST(
      postRequest({ episode, decisionCard, submission: { ...submission, actions: [] } }),
    );
    const json = (await res.json()) as { reason: string };
    expect(res.status).toBe(400);
    expect(json.reason).toBe('draft_invalid');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
