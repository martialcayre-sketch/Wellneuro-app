import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    protocolDraft: { findMany: vi.fn() },
    protocolCheckin: { findMany: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { GET } from './route';

const reponses = { contractVersion: 'c2a-checkin-v1', adhesion: 'plupart_des_jours', tolerance: 'bien', energie: 'stable', sommeil: 'mieux' };

function request(query = 'idPatient=PAT_1&decisionCardId=DEC_1'): Request {
  return new Request(`http://localhost/api/praticien/protocoles/checkins?${query}`);
}

describe('GET /api/praticien/protocoles/checkins', () => {
  beforeEach(() => vi.clearAllMocks());

  it('refuse sans session (401)', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET(request());
    expect(res.status).toBe(401);
    expect(prisma.protocolDraft.findMany).not.toHaveBeenCalled();
  });

  it('rejette un identifiant patient invalide (400)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    const res = await GET(request('idPatient=pas%20valide&decisionCardId=DEC_1'));
    expect(res.status).toBe(400);
  });

  it('borne les check-ins au fil et calcule le résumé (200)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.protocolDraft.findMany.mockResolvedValue([{ id: 'proto_DEC_1#h' }]);
    prisma.protocolCheckin.findMany.mockResolvedValue([
      {
        id: 'ck_1', idPatient: 'PAT_1', idAssignation: 'ASS_1', protocolDraftId: 'proto_DEC_1#h',
        pointEtape: 'J7', reponses, canal: 'portail', supersedesCheckinId: null, soumisLe: new Date('2026-01-08T00:00:00.000Z'),
      },
      // Check-in d'un AUTRE protocole logique — doit être filtré.
      {
        id: 'ck_x', idPatient: 'PAT_1', idAssignation: 'ASS_1', protocolDraftId: 'proto_AUTRE#h',
        pointEtape: 'J14', reponses, canal: 'portail', supersedesCheckinId: null, soumisLe: new Date('2026-01-15T00:00:00.000Z'),
      },
    ]);

    const res = await GET(request());
    const json = (await res.json()) as { ok: boolean; checkins: unknown[]; resume: { score: unknown; pointsRenseignes: number } };
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.checkins).toHaveLength(1);
    expect(json.resume.score).toBeNull();
    expect(json.resume.pointsRenseignes).toBe(1);
  });
});
