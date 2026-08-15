import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    protocolDraft: { findFirst: vi.fn(), findMany: vi.fn() },
    arbitrageBiologique: { findMany: vi.fn(), create: vi.fn() },
    journalAccesDossier: { create: vi.fn(), deleteMany: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { VERSION_PROTOCOL_DRAFT_V4, type ProtocolDraft } from '@/lib/clinical-engine/types';
import { recomputeDraftInputHash } from '@/lib/protocol/fromPrisma';
import { GET, POST } from './route';

const URL_BASE = 'http://localhost/api/praticien/biologie/arbitrage';

function getRequest(query = 'idPatient=PAT_TEST'): Request {
  return new Request(`${URL_BASE}?${query}`);
}

function postRequest(body: unknown): Request {
  return new Request(URL_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// Version V4 minimale, cohérente avec `reconstructProtocolDraft` (empreinte
// recalculée à l'identique) : une intention en attente de biologie, une libre.
const ISO = '2026-08-01T00:00:00.000Z';
const DRAFT_SANS_HASH: Omit<ProtocolDraft, 'inputHash'> = {
  protocolDraftId: 'proto_dc-test',
  decisionCardId: 'dc-test',
  decisionCardInputHash: 'hash-carte',
  selectedPriorityId: 'priority:PRIO-DIG-01',
  createdAt: ISO,
  updatedAt: ISO,
  version: VERSION_PROTOCOL_DRAFT_V4,
  status: 'practitioner_reviewed',
  purpose: 'Confort digestif',
  followUpCriterion: 'Ballonnements en baisse à J21',
  adviceSheetRef: null,
  actions: [
    {
      actionId: 'act-fer',
      type: 'biological_exploration',
      title: 'Explorer le statut martial',
      idealPlan: 'i',
      minimalPlan: 'm',
      rescuePlan: 'r',
      limitations: [],
      interventionStatus: 'conditionnelle_biologie',
      waitFor: { type: 'biologie', cible: 'ferritine' },
    },
    {
      actionId: 'act-libre',
      type: 'food',
      title: 'Assiette digestive',
      idealPlan: 'i',
      minimalPlan: 'm',
      rescuePlan: 'r',
      limitations: [],
      interventionStatus: 'active',
    },
  ],
  phases: [],
  therapeuticLoad: { level: 'moderate', source: 'practitioner', justification: null },
  review: {
    reviewedAt: '2026-08-01T01:00:00.000Z',
    reviewerRole: 'practitioner',
    confirmation: 'content_reviewed',
  },
  limitations: [],
};
const DRAFT: ProtocolDraft = {
  ...DRAFT_SANS_HASH,
  inputHash: recomputeDraftInputHash({ ...DRAFT_SANS_HASH, inputHash: '' } as ProtocolDraft),
};

const LIGNE_VERSION = {
  id: 'proto_dc-test#hash',
  decisionCardId: 'dc-test',
  inputHash: DRAFT.inputHash,
  payload: DRAFT,
};

const LIGNE_FIL = {
  id: LIGNE_VERSION.id,
  inputHash: DRAFT.inputHash,
  supersedesDraftId: null,
  createdAt: new Date(ISO),
};

const PATIENT_EN_SUIVI = {
  praticienEmail: 'praticien@wellneuro.fr',
  actif: true,
  suiviClotureLe: null,
};

const corps = (partiel: Record<string, unknown> = {}) => ({
  idPatient: 'PAT_TEST',
  protocolDraftId: LIGNE_VERSION.id,
  intentionId: 'act-fer',
  verdict: 'confirme',
  ...partiel,
});

describe('/api/praticien/biologie/arbitrage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WN_CB_ENABLED = 'true';
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue(PATIENT_EN_SUIVI);
    prisma.protocolDraft.findFirst.mockResolvedValue(LIGNE_VERSION);
    prisma.protocolDraft.findMany.mockResolvedValue([LIGNE_FIL]);
    prisma.arbitrageBiologique.findMany.mockResolvedValue([]);
    prisma.arbitrageBiologique.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'ARB_1',
        protocolDraftId: data.protocolDraftId,
        intentionId: data.intentionId,
        verdict: data.verdict,
        noteCourte: data.noteCourte ?? null,
        arbitreLe: new Date('2026-08-15T09:00:00.000Z'),
        arbitrePar: data.arbitrePar,
      }),
    );
  });

  afterEach(() => {
    delete process.env.WN_CB_ENABLED;
  });

  it('reste fail-closed sans le drapeau WN_CB_ENABLED', async () => {
    delete process.env.WN_CB_ENABLED;
    expect((await GET(getRequest())).status).toBe(503);
    expect((await POST(postRequest(corps()))).status).toBe(503);
    expect(prisma.arbitrageBiologique.create).not.toHaveBeenCalled();
  });

  it('exige une session', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await GET(getRequest())).status).toBe(401);
    expect((await POST(postRequest(corps()))).status).toBe(401);
    expect(prisma.arbitrageBiologique.create).not.toHaveBeenCalled();
  });

  it('enregistre un verdict : auteur = session, horodatage = base', async () => {
    const reponse = await POST(postRequest(corps()));
    expect(reponse.status).toBe(201);
    const json = await reponse.json();
    expect(json.arbitrage.verdict).toBe('confirme');
    const donnees = prisma.arbitrageBiologique.create.mock.calls[0][0].data;
    expect(donnees.arbitrePar).toBe('praticien@wellneuro.fr');
    expect('arbitreLe' in donnees).toBe(false);
    // Aucune valeur biologique ne transite : seuls verdict et note existent.
    expect(Object.keys(donnees).sort()).toEqual(
      ['arbitrePar', 'idPatient', 'intentionId', 'noteCourte', 'protocolDraftId', 'verdict'],
    );
  });

  it('un verdict « infirme » sans note est impossible à enregistrer (Lot F, critère 3)', async () => {
    const reponse = await POST(postRequest(corps({ verdict: 'infirme' })));
    expect(reponse.status).toBe(422);
    expect((await reponse.json()).reason).toBe('note_obligatoire_pour_infirme');
    expect(prisma.arbitrageBiologique.create).not.toHaveBeenCalled();
  });

  it('refuse un verdict hors énuméré et une intention qui n’attend pas de biologie', async () => {
    expect((await POST(postRequest(corps({ verdict: 'valide' })))).status).toBe(422);
    expect((await POST(postRequest(corps({ intentionId: 'act-libre' })))).status).toBe(422);
    expect(prisma.arbitrageBiologique.create).not.toHaveBeenCalled();
  });

  it('refuse d’arbitrer une version supplantée', async () => {
    prisma.protocolDraft.findMany.mockResolvedValue([
      LIGNE_FIL,
      {
        id: 'proto_dc-test#suivante',
        inputHash: 'autre',
        supersedesDraftId: LIGNE_FIL.id,
        createdAt: new Date('2026-08-02T00:00:00.000Z'),
      },
    ]);
    const reponse = await POST(postRequest(corps()));
    expect(reponse.status).toBe(409);
    expect((await reponse.json()).reason).toBe('version_stale');
  });

  it('unicité : un arbitrage par intention et par version', async () => {
    prisma.arbitrageBiologique.create.mockRejectedValue(
      Object.assign(new Error('unique'), { code: 'P2002' }),
    );
    const reponse = await POST(postRequest(corps()));
    expect(reponse.status).toBe(409);
    expect((await reponse.json()).reason).toBe('arbitrage_existant');
  });

  it('dossier clos : consignation refusée dans la route', async () => {
    prisma.patient.findUnique.mockResolvedValue({
      praticienEmail: 'praticien@wellneuro.fr',
      actif: true,
      suiviClotureLe: new Date('2026-08-01T00:00:00.000Z'),
    });
    expect((await POST(postRequest(corps()))).status).toBe(409);
    expect(prisma.arbitrageBiologique.create).not.toHaveBeenCalled();
  });

  it('liste les arbitrages du patient', async () => {
    prisma.arbitrageBiologique.findMany.mockResolvedValue([{
      id: 'ARB_1',
      protocolDraftId: LIGNE_VERSION.id,
      intentionId: 'act-fer',
      verdict: 'infirme',
      noteCourte: 'ferritine documentée normale',
      arbitreLe: new Date('2026-08-15T09:00:00.000Z'),
      arbitrePar: 'praticien@wellneuro.fr',
    }]);
    const reponse = await GET(getRequest());
    expect(reponse.status).toBe(200);
    const json = await reponse.json();
    expect(json.arbitrages).toHaveLength(1);
    expect(json.arbitrages[0].noteCourte).toBe('ferritine documentée normale');
  });
});
