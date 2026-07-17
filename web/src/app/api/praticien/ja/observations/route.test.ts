import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma, listSnapshots, saveSnapshot } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
  },
  listSnapshots: vi.fn(),
  saveSnapshot: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/food-observation/persistence', () => ({
  listJaObservationSnapshots: listSnapshots,
  saveJaObservationSnapshot: saveSnapshot,
}));

import { GET, POST } from './route';

function postRequest(body: unknown): Request {
  return new Request('http://localhost/api/praticien/ja/observations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const payload = {
  idPatient: 'PAT_TEST',
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

describe('api/praticien/ja/observations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET refuse sans session praticien', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET(new Request('http://localhost/api/praticien/ja/observations?idPatient=PAT_TEST'));
    expect(res.status).toBe(401);
  });

  it('GET liste les snapshots si patient autorisé', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'praticien@wellneuro.fr' });
    listSnapshots.mockResolvedValue([{ draftId: 'JA_DRAFT_1' }]);

    const res = await GET(new Request('http://localhost/api/praticien/ja/observations?idPatient=PAT_TEST'));
    const json = (await res.json()) as { ok: boolean; snapshots: Array<{ draftId: string }> };

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.snapshots[0].draftId).toBe('JA_DRAFT_1');
  });

  it('POST persiste un snapshot JA si patient autorisé', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'praticien@wellneuro.fr' });
    saveSnapshot.mockResolvedValue({ draftId: 'JA_DRAFT_1' });

    const res = await POST(postRequest(payload));
    const json = (await res.json()) as { ok: boolean; snapshot: { draftId: string } };

    expect(res.status).toBe(201);
    expect(json.ok).toBe(true);
    expect(json.snapshot.draftId).toBe('JA_DRAFT_1');
    expect(saveSnapshot).toHaveBeenCalled();
  });

  it('POST refuse un patient hors périmètre praticien', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr' });

    const res = await POST(postRequest(payload));
    expect(res.status).toBe(403);
    expect(saveSnapshot).not.toHaveBeenCalled();
  });
});
