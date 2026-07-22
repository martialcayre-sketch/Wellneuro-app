import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma, getLatestActivation, activateSnapshot } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    journalAccesDossier: { create: vi.fn(), deleteMany: vi.fn() },
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
    // Le GET accessible journalise la lecture au gabarit littéral (G-TRUST-04).
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledTimes(1);
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledWith({
      data: {
        idPatient: 'PAT_TEST',
        praticienEmail: 'praticien@wellneuro.fr',
        route: '/api/praticien/ja/activation',
        methode: 'GET',
      },
    });
  });

  it('GET refuse hors périmètre : 403 à l’octet, jamais journalisé', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr' });

    const res = await GET(new Request('http://localhost/api/praticien/ja/activation?idPatient=PAT_TEST'));
    expect(res.status).toBe(403);
    // Corps 403 historique préservé à l'octet malgré le ralliement à la garde.
    expect(await res.json()).toEqual({
      ok: false,
      reason: 'forbidden',
      error: 'Patient non accessible pour ce praticien.',
    });
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
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
    // Une écriture laisse déjà sa propre trace datée et attribuée (GD-1).
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('POST refuse un patient hors perimetre praticien', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr' });

    const res = await POST(postRequest(payload));
    expect(res.status).toBe(403);
    // Corps 403 historique préservé à l'octet malgré le ralliement à la garde.
    expect(await res.json()).toEqual({
      ok: false,
      reason: 'forbidden',
      error: 'Patient non accessible pour ce praticien.',
    });
    expect(activateSnapshot).not.toHaveBeenCalled();
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });
});
