import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    assessmentEpisode: { upsert: vi.fn(), findMany: vi.fn() },
    protocolDraft: { upsert: vi.fn(), findMany: vi.fn() },
    $transaction: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { GET, POST } from './route';

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
  snapshotInputHash: 'HASH_SNAP',
  reviewInputHash: 'HASH_REV',
  inputHash: 'HASH_DEC',
};

const draft = {
  protocolDraftId: 'DRA_1',
  decisionCardId: 'DEC_1',
  decisionCardInputHash: 'HASH_DEC',
  selectedPriorityId: 'PRIO_1',
  status: 'practitioner_reviewed',
  version: 'c1-protocol-draft-v1',
  inputHash: 'HASH_DRAFT',
  updatedAt: '2026-01-03T00:00:00.000Z',
};

function postRequest(body: unknown): Request {
  return new Request('http://localhost/api/praticien/protocoles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/praticien/protocoles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.$transaction.mockResolvedValue([]);
    prisma.assessmentEpisode.findMany.mockResolvedValue([]);
  });

  it('refuse un praticien non authentifié (401)', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await POST(postRequest({ episode, decisionCard, draft }));
    expect(res.status).toBe(401);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('persiste épisode confirmé + protocole relu (idempotent par id de contrat)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    const res = await POST(postRequest({ episode, decisionCard, draft }));
    const json = (await res.json()) as { ok: boolean; protocolDraftId?: string };
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.protocolDraftId).toBe('DRA_1');
    expect(prisma.assessmentEpisode.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'EPI_1' } }),
    );
    expect(prisma.protocolDraft.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'DRA_1' },
        create: expect.objectContaining({
          idPatient: 'PAT_1',
          snapshotInputHash: 'HASH_SNAP',
          reviewInputHash: 'HASH_REV',
          contractVersion: 'c1-protocol-draft-v1',
        }),
      }),
    );
  });

  // Gate G2 — identité de cycle estampillée à l'écriture.
  it('un T0 ouvre son propre cycle, sans interroger la base', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    await POST(postRequest({ episode, decisionCard, draft }));
    expect(prisma.assessmentEpisode.findMany).not.toHaveBeenCalled();
    expect(prisma.assessmentEpisode.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ cycleId: 'EPI_1', versionScore: 'v1' }),
      }),
    );
  });

  it('un jalon postérieur rejoint le dernier T0 antérieur du patient', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.assessmentEpisode.findMany.mockResolvedValue([
      { id: 'EPI_T0_A', cycleId: 'EPI_T0_A', confirmedAt: new Date('2025-11-01T00:00:00.000Z') },
      { id: 'EPI_T0_B', cycleId: 'EPI_T0_B', confirmedAt: new Date('2026-01-01T00:00:00.000Z') },
      // T0 postérieur au jalon : ne doit jamais l'absorber.
      { id: 'EPI_T0_C', cycleId: 'EPI_T0_C', confirmedAt: new Date('2026-06-01T00:00:00.000Z') },
    ]);
    await POST(
      postRequest({
        episode: { ...episode, assessmentEpisodeId: 'EPI_J21', milestone: 'J21' },
        decisionCard,
        draft,
      }),
    );
    expect(prisma.assessmentEpisode.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ cycleId: 'EPI_T0_B' }) }),
    );
  });

  it('un jalon sans aucun T0 antérieur reste non rattaché (cycleId null)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.assessmentEpisode.findMany.mockResolvedValue([
      { id: 'EPI_T0_C', cycleId: 'EPI_T0_C', confirmedAt: new Date('2026-06-01T00:00:00.000Z') },
    ]);
    await POST(
      postRequest({
        episode: { ...episode, assessmentEpisodeId: 'EPI_J21', milestone: 'J21' },
        decisionCard,
        draft,
      }),
    );
    expect(prisma.assessmentEpisode.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ cycleId: null }) }),
    );
  });

  it('rejette une chaîne de provenance incohérente (400)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    const res = await POST(
      postRequest({ episode, decisionCard, draft: { ...draft, decisionCardInputHash: 'AUTRE' } }),
    );
    const json = (await res.json()) as { reason?: string };
    expect(res.status).toBe(400);
    expect(json.reason).toBe('provenance_mismatch');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejette un protocole non relu (400)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    const res = await POST(postRequest({ episode, decisionCard, draft: { ...draft, status: 'draft' } }));
    const json = (await res.json()) as { reason?: string };
    expect(res.status).toBe(400);
    expect(json.reason).toBe('not_reviewed');
  });

  it('rejette un épisode non confirmé (400)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    const res = await POST(postRequest({ episode: { ...episode, status: 'proposed' }, decisionCard, draft }));
    const json = (await res.json()) as { reason?: string };
    expect(res.status).toBe(400);
    expect(json.reason).toBe('not_confirmed');
  });
});

describe('GET /api/praticien/protocoles', () => {
  beforeEach(() => vi.clearAllMocks());

  it('refuse un praticien non authentifié (401)', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET(new Request('http://localhost/api/praticien/protocoles?idPatient=PAT_1'));
    expect(res.status).toBe(401);
  });

  it('liste les protocoles persistés, bornés à l’idPatient demandé', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.protocolDraft.findMany.mockResolvedValue([
      {
        id: 'DRA_1',
        decisionCardId: 'DEC_1',
        status: 'practitioner_reviewed',
        createdAt: new Date('2026-01-03T00:00:00.000Z'),
        reviewedAt: new Date('2026-01-03T00:00:00.000Z'),
        episode: { milestone: 'T0' },
      },
    ]);
    const res = await GET(new Request('http://localhost/api/praticien/protocoles?idPatient=PAT_1'));
    const json = (await res.json()) as {
      ok: boolean;
      protocoles: Array<{ versionId: string; protocolDraftId: string; milestone: string }>;
    };
    expect(res.status).toBe(200);
    expect(json.protocoles[0]).toMatchObject({
      versionId: 'DRA_1',
      protocolDraftId: 'proto_DEC_1',
      milestone: 'T0',
    });
    expect(prisma.protocolDraft.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { idPatient: 'PAT_1' } }),
    );
  });
});
