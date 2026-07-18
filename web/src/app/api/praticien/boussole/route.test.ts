import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, getLatestPublishedJaFeasibility, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  getLatestPublishedJaFeasibility: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    ciqualNutrientValue: { findMany: vi.fn() },
    protocolDraft: { findMany: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/food-observation/feasibilityRepository', () => ({ getLatestPublishedJaFeasibility }));

import { GET } from './route';
import { buildProtocolDraft } from '@/lib/clinical-engine/protocolDraft';
import type { DecisionCard } from '@/lib/clinical-engine/types';

const VALUES: Record<string, number> = {
  '25000': 23.3, '31000': 0.31, '32000': 0, '34100': 0,
  '40302': 3.06, '40303': 5.31, '40304': 5.1, '41833': 0.18,
  '42053': 0.67, '42263': 1, '10004': 0.88, '10110': 300,
  '10120': 38.5, '10150': 306, '10190': 368, '10200': 333,
};
const MG_CODES = new Set(['10110', '10120', '10150', '10190', '10200']);

function rows() {
  return Object.entries(VALUES).map(([nutrientCode, value]) => ({
    id: `row-${nutrientCode}`,
    ciqualCode: '26034', nutrientCode, value, valueStatus: 'exact',
    unit: MG_CODES.has(nutrientCode) ? 'mg/100 g' : 'g/100 g',
    datasetVersion: 'ciqual-2025-v1',
    sourceRef: 'doi:10.57745/RDMHWY#compo_2025_11_03.xml',
    sourceHash: '2da725585946434df320d8041631998b',
    createdAt: new Date('2026-07-18T00:00:00.000Z'),
  }));
}

function request(foodRef = '26034') {
  return new Request(`http://localhost/api/praticien/boussole?idPatient=PAT_TEST&decisionCardId=DEC_C5&foodRef=${foodRef}`);
}

function activeProtocol() {
  const decisionCard = {
    decisionCardId: 'DEC_C5', inputHash: 'decision-hash', snapshotInputHash: 'snapshot-hash',
    reviewInputHash: 'review-hash', priorityCandidates: [{ candidateId: 'priority-c5' }],
    selectedMainPriority: { candidateId: 'priority-c5' }, safetyFindingIds: [],
    abstention: { status: 'not_required' },
  } as unknown as DecisionCard;
  const payload = buildProtocolDraft({
    protocolDraftId: 'proto_DEC_C5', decisionCard,
    createdAt: '2026-07-18T09:00:00.000Z', updatedAt: '2026-07-18T09:00:00.000Z',
    purpose: 'Essai alimentaire.', followUpCriterion: 'Retour à J21.',
    actions: [{ actionId: 'food-1', type: 'food', title: 'Essai', idealPlan: 'Idéal', minimalPlan: 'Minimal', rescuePlan: 'Secours', limitations: [] }],
    therapeuticLoad: { level: 'light', source: 'practitioner', justification: null },
    review: { reviewedAt: '2026-07-18T09:00:00.000Z', reviewerRole: 'practitioner', confirmation: 'content_reviewed' },
  });
  return { id: `version#${payload.inputHash}`, inputHash: payload.inputHash, payload, supersedesDraftId: null, createdAt: new Date(payload.createdAt) };
}

describe('GET /api/praticien/boussole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WN_C5_ENABLED = 'true';
    getServerSession.mockResolvedValue({ user: { email: 'martial@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'martial@wellneuro.fr' });
    prisma.ciqualNutrientValue.findMany.mockResolvedValue(rows());
    prisma.protocolDraft.findMany.mockResolvedValue([]);
    getLatestPublishedJaFeasibility.mockResolvedValue(null);
  });

  it('reste invisible lorsque C5 est désactivée', async () => {
    process.env.WN_C5_ENABLED = 'false';
    const response = await GET(request());
    expect(response.status).toBe(404);
    expect(getServerSession).not.toHaveBeenCalled();
  });

  it('refuse une requête sans session', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await GET(request())).status).toBe(401);
  });

  it('refuse un patient appartenant à un autre praticien', async () => {
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr' });
    expect((await GET(request())).status).toBe(403);
    expect(prisma.ciqualNutrientValue.findMany).not.toHaveBeenCalled();
    expect(getLatestPublishedJaFeasibility).not.toHaveBeenCalled();
  });

  it('retourne 404 pour un aliment hors manifeste ou absent', async () => {
    expect((await GET(request('99999'))).status).toBe(404);
    prisma.ciqualNutrientValue.findMany.mockResolvedValue([]);
    expect((await GET(request())).status).toBe(404);
  });

  it('refuse fail-closed un import incomplet', async () => {
    prisma.ciqualNutrientValue.findMany.mockResolvedValue(rows().slice(0, 15));
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ reason: 'reference_incomplete' });
  });

  it('refuse fail-closed une provenance incohérente', async () => {
    prisma.ciqualNutrientValue.findMany.mockResolvedValue(
      rows().map(row => ({ ...row, sourceHash: 'hash-invalide' })),
    );
    expect((await GET(request())).status).toBe(503);
  });

  it('retourne le profil sourcé sans autoriser une insertion sans protocole actif', async () => {
    const response = await GET(request());
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      profile: {
        ciqualCode: '26034', status: 'complete', aggregateScore: 61.734453,
        datasetVersion: 'ciqual-2025-v1', mappingVersion: 'c5a-b1-mapping-v1',
      },
      reading: null, actionRef: null, insertionAllowed: false,
      plateCatalog: { version: 'c5b-plate-catalog-v1' },
      jaFeasibility: null,
    });
  });

  it('expose séparément une faisabilité JA publiée sans altérer le profil', async () => {
    const feasibility = {
      contractVersion: 'ja-action-feasibility-v1', publicationStatus: 'published',
      episodeId: 'EP_1', actionId: 'ACTION_1', recommendedPlateRef: null,
      facts: {
        tracesRecorded: 3, opportunitiesObserved: 2, feasibleDeclarations: 1,
        adaptedDeclarations: 1, blockedDeclarations: 1, noOpportunityDeclarations: 1,
      },
      limitations: ['Constats déclaratifs.'], validatedBy: 'practitioner',
      validatedAt: '2026-07-18T12:00:00.000Z', sourceDraftId: 'JA_ACT_1',
      sourceInputHash: 'a'.repeat(64), inputHash: 'b'.repeat(64),
    };
    getLatestPublishedJaFeasibility.mockResolvedValue(feasibility);
    const response = await GET(request());
    const payload = await response.json();
    expect(payload.jaFeasibility).toEqual(feasibility);
    expect(payload.profile.aggregateScore).toBe(61.734453);
    expect(payload.alternatives).toEqual([]);
  });

  it('ancre l’insertion proposée sur le protocole actif exact', async () => {
    const protocol = activeProtocol();
    prisma.protocolDraft.findMany.mockResolvedValue([protocol]);
    const response = await GET(request());
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      insertionAllowed: true,
      actionRef: {
        sourceProtocolDraftId: protocol.payload.protocolDraftId,
        sourceProtocolInputHash: protocol.payload.inputHash,
        selectedPriorityId: protocol.payload.selectedPriorityId,
      },
    });
    expect(prisma.protocolDraft.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { idPatient: 'PAT_TEST', decisionCardId: 'DEC_C5', status: 'practitioner_reviewed' },
    }));
  });

  it('exige le fil de protocole affiché par le builder', async () => {
    const response = await GET(new Request('http://localhost/api/praticien/boussole?idPatient=PAT_TEST&foodRef=26034'));
    expect(response.status).toBe(400);
    expect(prisma.protocolDraft.findMany).not.toHaveBeenCalled();
  });

  it('signale une version protocole caduque sans produire de référence', async () => {
    const protocol = activeProtocol();
    prisma.protocolDraft.findMany.mockResolvedValue([{ ...protocol, inputHash: 'hash-altéré' }]);
    const response = await GET(request());
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ reason: 'protocol_stale' });
  });
});
