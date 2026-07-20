import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    ciqualNutrientValue: { findMany: vi.fn() },
    assessmentEpisode: { upsert: vi.fn(), findMany: vi.fn() },
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
import { GET, POST } from './route';
import { canonicalSha256 } from '@/lib/clinical-engine/canonical';
import type { FoodCompassActionRef } from '@/lib/food-compass';
import { buildPractitionerFoodCompassReference } from '@/lib/food-compass/practitionerReference';

const VALUES: Record<string, number> = {
  '25000': 23.3, '31000': 0.31, '32000': 0, '34100': 0,
  '40302': 3.06, '40303': 5.31, '40304': 5.1, '41833': 0.18,
  '42053': 0.67, '42263': 1, '10004': 0.88, '10110': 300,
  '10120': 38.5, '10150': 306, '10190': 368, '10200': 333,
};
const MG_CODES = new Set(['10110', '10120', '10150', '10190', '10200']);

function ciqualRows() {
  return Object.entries(VALUES).map(([nutrientCode, value]) => ({
    id: `row-${nutrientCode}`,
    ciqualCode: '26034', nutrientCode, value, valueStatus: 'exact' as const,
    unit: (MG_CODES.has(nutrientCode) ? 'mg/100 g' : 'g/100 g') as 'mg/100 g' | 'g/100 g',
    datasetVersion: 'ciqual-2025-v1',
    sourceRef: 'doi:10.57745/RDMHWY#compo_2025_11_03.xml',
    sourceHash: '2da725585946434df320d8041631998b',
    createdAt: new Date('2026-07-18T00:00:00.000Z'),
  }));
}

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

function c5Ref(): FoodCompassActionRef {
  const reference = buildPractitionerFoodCompassReference({
    ciqualCode: '26034',
    foodLabel: 'Sardine',
    rows: ciqualRows(),
    activeProtocol: activeDraft,
  }).actionRef;
  if (!reference) throw new Error('Fixture C5 calculable attendue.');
  return reference;
}

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
    prisma.assessmentEpisode.findMany.mockResolvedValue([]);
    process.env.WN_C5_ENABLED = 'false';
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'praticien@wellneuro.fr' });
    prisma.ciqualNutrientValue.findMany.mockResolvedValue(ciqualRows());
  });

  it('refuse un praticien non authentifié (401)', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await POST(postRequest({ episode, decisionCard, submission }));
    expect(res.status).toBe(401);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('refuse l’écriture sur le patient d’un autre praticien (403)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr' });
    const res = await POST(postRequest({ episode, decisionCard, submission }));
    expect(res.status).toBe(403);
    expect(prisma.protocolDraft.findMany).not.toHaveBeenCalled();
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

  it('insère manuellement une référence C5 dans une nouvelle version V2', async () => {
    process.env.WN_C5_ENABLED = 'true';
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.protocolDraft.findMany.mockResolvedValue([activeRow]);
    const res = await POST(postRequest({
      episode, decisionCard,
      submission: {
        ...submission,
        actions: [{ ...action, title: 'Sardine', foodCompassRef: c5Ref() }],
      },
      baseVersionId: activeRow.id,
    }));
    expect(res.status).toBe(200);
    expect(prisma.protocolDraft.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        contractVersion: 'c1-protocol-draft-v2',
        payload: expect.objectContaining({
          version: 'c1-protocol-draft-v2',
          actions: [expect.objectContaining({ foodCompassRef: expect.objectContaining({ foodRef: 'ciqual-2025-v1:26034' }) })],
        }),
      }),
    }));
  });

  it('refuse une référence C5 sémantiquement forgée même si son hash public est cohérent', async () => {
    process.env.WN_C5_ENABLED = 'true';
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.protocolDraft.findMany.mockResolvedValue([activeRow]);
    const validRef = c5Ref();
    const forgedInput = { ...validRef, intrinsicProfileHash: 'profil-forgé' };
    const { refHash: _oldHash, ...forgedHashInput } = forgedInput;
    const forgedRef = { ...forgedInput, refHash: canonicalSha256(forgedHashInput) };
    const res = await POST(postRequest({
      episode, decisionCard,
      submission: { ...submission, actions: [{ ...action, foodCompassRef: forgedRef }] },
      baseVersionId: activeRow.id,
    }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ reason: 'draft_invalid' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('échoue en 503 sans écrire si le référentiel C5 est incomplet', async () => {
    process.env.WN_C5_ENABLED = 'true';
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.protocolDraft.findMany.mockResolvedValue([activeRow]);
    prisma.ciqualNutrientValue.findMany.mockResolvedValue(ciqualRows().slice(0, 15));
    const res = await POST(postRequest({
      episode, decisionCard,
      submission: { ...submission, actions: [{ ...action, foodCompassRef: c5Ref() }] },
      baseVersionId: activeRow.id,
    }));
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ reason: 'reference_incomplete' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('refuse une référence C5 si la priorité cible diffère de la source', async () => {
    process.env.WN_C5_ENABLED = 'true';
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.protocolDraft.findMany.mockResolvedValue([activeRow]);
    const changedPriorityCard = {
      ...decisionCard,
      selectedMainPriority: { candidateId: 'PRIO_2' },
      priorityCandidates: [{ candidateId: 'PRIO_2' }],
    } as unknown as DecisionCard;
    const res = await POST(postRequest({
      episode, decisionCard: changedPriorityCard,
      submission: { ...submission, actions: [{ ...action, foodCompassRef: c5Ref() }] },
      baseVersionId: activeRow.id,
    }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ reason: 'draft_invalid' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('refuse une insertion C5 si le flag est désactivé', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.protocolDraft.findMany.mockResolvedValue([activeRow]);
    const res = await POST(postRequest({
      episode, decisionCard,
      submission: { ...submission, actions: [{ ...action, foodCompassRef: c5Ref() }] },
      baseVersionId: activeRow.id,
    }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ reason: 'draft_invalid' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('GET /api/praticien/protocoles/versions', () => {
  it('refuse la lecture du patient d’un autre praticien (403)', async () => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr' });
    const req = new Request('http://localhost/api/praticien/protocoles/versions?idPatient=PAT_1&decisionCardId=DEC_1');
    const res = await GET(req);
    expect(res.status).toBe(403);
    expect(prisma.protocolDraft.findMany).not.toHaveBeenCalled();
  });
});
