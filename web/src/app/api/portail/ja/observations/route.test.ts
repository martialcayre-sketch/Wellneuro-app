import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, listSnapshots, saveSnapshot, readPatientSession, isPatientSessionBoundToToken } = vi.hoisted(() => ({
  prisma: {
    patient: { findUnique: vi.fn() },
  },
  listSnapshots: vi.fn(),
  saveSnapshot: vi.fn(),
  readPatientSession: vi.fn(),
  isPatientSessionBoundToToken: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/food-observation/persistence', () => ({
  listJaObservationSnapshots: listSnapshots,
  saveJaObservationSnapshot: saveSnapshot,
}));
vi.mock('@/lib/patient-session', () => ({
  readPatientSession,
  isPatientSessionBoundToToken,
}));

import { GET, POST } from './route';

const payload = {
  episode: {
    episodeId: 'ja_episode_1',
    patientId: 'PAT_TEST',
    startDate: '2026-07-17',
    endDate: '2026-07-24',
    statut: 'actif',
    content: {
      regime: 'essai',
      hypothese: 'Hypothèse',
      action: {
        actionId: 'action_1',
        labelPatient: 'Action test',
        idealPlan: 'Plan idéal',
        simplePlan: 'Plan simple',
      },
    },
    budget: { tracesParSemaine: 3 },
    schemaVersion: 'ja-domaine-v1',
    frictionsVersion: 'frictions-v1',
  },
  traces: [],
  pauses: [],
  plans: [],
  solutions: [],
  actionCareer: [],
};

describe('api/portail/ja/observations', () => {
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
    const res = await GET(new Request('http://localhost/api/portail/ja/observations'));
    expect(res.status).toBe(401);
  });

  it('GET liste les snapshots JA du patient connecté', async () => {
    listSnapshots.mockResolvedValue([{ draftId: 'JA_DRAFT_1' }]);
    const res = await GET(new Request('http://localhost/api/portail/ja/observations'));
    const json = (await res.json()) as { ok: boolean; snapshots: Array<{ draftId: string }> };

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.snapshots[0].draftId).toBe('JA_DRAFT_1');
  });

  it('POST persiste un snapshot JA pour la session portail valide', async () => {
    saveSnapshot.mockResolvedValue({ draftId: 'JA_DRAFT_2' });
    const res = await POST(
      new Request('http://localhost/api/portail/ja/observations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    );
    const json = (await res.json()) as { ok: boolean; snapshot: { draftId: string } };

    expect(res.status).toBe(201);
    expect(json.ok).toBe(true);
    expect(json.snapshot.draftId).toBe('JA_DRAFT_2');
    expect(saveSnapshot).toHaveBeenCalled();
  });

  it('POST refuse si la session n’est plus liée au token courant', async () => {
    isPatientSessionBoundToToken.mockReturnValue(false);
    const res = await POST(
      new Request('http://localhost/api/portail/ja/observations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    );

    expect(res.status).toBe(401);
    expect(saveSnapshot).not.toHaveBeenCalled();
  });
});
