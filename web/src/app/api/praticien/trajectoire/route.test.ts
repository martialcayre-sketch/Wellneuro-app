import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    assessmentEpisode: { findMany: vi.fn() },
    questionnaireReponse: { findMany: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { GET } from './route';

const RAW = { P1: '2', P2: '2', P3: '1', P4: '1', P5: '1', P6: '1', P7: '1', P8: '1' };

function request(query = 'idPatient=PAT_1'): Request {
  return new Request(`http://localhost/api/praticien/trajectoire?${query}`);
}

describe('GET /api/praticien/trajectoire', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.patient.findUnique.mockResolvedValue({ idPatient: 'PAT_1' });
    prisma.assessmentEpisode.findMany.mockResolvedValue([]);
    prisma.questionnaireReponse.findMany.mockResolvedValue([]);
  });

  it('refuse sans session (401)', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET(request());
    expect(res.status).toBe(401);
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
  });

  it('rejette un identifiant patient invalide (400)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    const res = await GET(request('idPatient=pas%20valide'));
    expect(res.status).toBe(400);
  });

  it('patient inconnu → 404', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue(null);
    const res = await GET(request());
    expect(res.status).toBe(404);
  });

  it('sans épisode → trajectoire vide, comparaison indisponible (200)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    const res = await GET(request());
    const json = (await res.json()) as { ok: boolean; trajectoire: { cycles: unknown[]; comparaison: { raison: string } } };
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.trajectoire.cycles).toHaveLength(0);
    expect(json.trajectoire.comparaison.raison).toBe('aucun_cycle');
  });

  it('un épisode T0 mesuré → un cycle avec jalons datés (200)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.assessmentEpisode.findMany.mockResolvedValue([
      { id: 'ep_T0', milestone: 'T0', confirmedAt: new Date('2026-01-01T00:00:00.000Z') },
    ]);
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      { idQuestionnaire: 'Q_SOM_06', dateReponse: new Date('2026-01-01T00:00:00.000Z'), scoresJson: { rawAnswers: RAW } },
    ]);

    const res = await GET(request());
    const json = (await res.json()) as { trajectoire: { cycles: { cycleId: string; versionScore: string }[]; comparaison: { raison: string } } };
    expect(res.status).toBe(200);
    expect(json.trajectoire.cycles).toHaveLength(1);
    expect(json.trajectoire.cycles[0].cycleId).toBe('ep_T0');
    expect(json.trajectoire.cycles[0].versionScore).toBe('v1');
    expect(json.trajectoire.comparaison.raison).toBe('un_seul_cycle');
  });
});
