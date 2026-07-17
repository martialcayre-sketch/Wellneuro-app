import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, getLatestActivation, readPatientSession, isPatientSessionBoundToToken } = vi.hoisted(() => ({
  prisma: {
    patient: { findUnique: vi.fn() },
  },
  getLatestActivation: vi.fn(),
  readPatientSession: vi.fn(),
  isPatientSessionBoundToToken: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/food-observation/persistence', () => ({
  getLatestJaActivation: getLatestActivation,
}));
vi.mock('@/lib/patient-session', () => ({
  readPatientSession,
  isPatientSessionBoundToToken,
}));

import { GET } from './route';

describe('api/portail/ja/decision', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readPatientSession.mockReturnValue({ idPatient: 'PAT_TEST', email: 'sophie.nicola@example.test' });
    prisma.patient.findUnique.mockResolvedValue({
      actif: true,
      accessToken: 'TOK_TEST',
      accessTokenRevoked: false,
      email: 'sophie.nicola@example.test',
    });
    isPatientSessionBoundToToken.mockReturnValue(true);
  });

  it('GET refuse sans session portail', async () => {
    readPatientSession.mockReturnValue(null);
    const res = await GET(new Request('http://localhost/api/portail/ja/decision'));
    expect(res.status).toBe(401);
  });

  it('GET retourne hasDecision=false sans activation', async () => {
    getLatestActivation.mockResolvedValue(null);

    const res = await GET(new Request('http://localhost/api/portail/ja/decision'));
    const json = (await res.json()) as { ok: boolean; hasDecision: boolean; decision: unknown };

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.hasDecision).toBe(false);
    expect(json.decision).toBeNull();
  });

  it('GET retourne la decision active', async () => {
    getLatestActivation.mockResolvedValue({
      milestone: 'J14',
      feedbackPatient: 'Merci pour le retour.',
      deltaDecision: 'On simplifie la decision sur les collations.',
      chargePercue: 'moderee',
      budgetChargeGlobal: 11,
      reviewedAt: '2026-07-17T10:00:00.000Z',
    });

    const res = await GET(new Request('http://localhost/api/portail/ja/decision'));
    const json = (await res.json()) as {
      ok: boolean;
      hasDecision: boolean;
      decision: { milestone: string; chargePercue: string; budgetChargeGlobal: number };
    };

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.hasDecision).toBe(true);
    expect(json.decision.milestone).toBe('J14');
    expect(json.decision.chargePercue).toBe('moderee');
    expect(json.decision.budgetChargeGlobal).toBe(11);
  });

  it('GET refuse si la session n est plus liee au token courant', async () => {
    isPatientSessionBoundToToken.mockReturnValue(false);

    const res = await GET(new Request('http://localhost/api/portail/ja/decision'));
    expect(res.status).toBe(401);
  });
});
