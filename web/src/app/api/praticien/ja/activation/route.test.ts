import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma, getLatestActivation, activateSnapshot } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
  },
  getLatestActivation: vi.fn(),
  activateSnapshot: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/food-observation/persistence', () => ({
  getLatestJaActivation: getLatestActivation,
  activateJaObservationSnapshot: activateSnapshot,
}));

import { GET, POST } from './route';

function postRequest(body: unknown): Request {
  return new Request('http://localhost/api/praticien/ja/activation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const payload = {
  idPatient: 'PAT_TEST',
  draftId: 'JA_DRAFT_1',
  milestone: 'J7',
  deltaDecision: 'Delta de decision suffisamment detaille.',
  feedbackPatient: 'Retour patient suffisamment detaille.',
  chargePercue: 'moderee',
  budgetChargeGlobal: 9,
};

describe('api/praticien/ja/activation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET refuse sans session praticien', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET(new Request('http://localhost/api/praticien/ja/activation?idPatient=PAT_TEST'));
    expect(res.status).toBe(401);
  });

  it('GET retourne la derniere activation si patient autorise', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'praticien@wellneuro.fr' });
    getLatestActivation.mockResolvedValue({ draftId: 'JA_ACT_1' });

    const res = await GET(new Request('http://localhost/api/praticien/ja/activation?idPatient=PAT_TEST'));
    const json = (await res.json()) as { ok: boolean; activation: { draftId: string } };

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.activation.draftId).toBe('JA_ACT_1');
  });

  it('POST active un snapshot JA pour un patient autorise', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'praticien@wellneuro.fr' });
    activateSnapshot.mockResolvedValue({ draftId: 'JA_ACT_1' });

    const res = await POST(postRequest(payload));
    const json = (await res.json()) as { ok: boolean; activation: { draftId: string } };

    expect(res.status).toBe(201);
    expect(json.ok).toBe(true);
    expect(json.activation.draftId).toBe('JA_ACT_1');
    expect(activateSnapshot).toHaveBeenCalled();
  });

  it('POST refuse un patient hors perimetre praticien', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr' });

    const res = await POST(postRequest(payload));
    expect(res.status).toBe(403);
    expect(activateSnapshot).not.toHaveBeenCalled();
  });
});
