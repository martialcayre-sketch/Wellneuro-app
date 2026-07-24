import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findMany: vi.fn() },
    questionnaireReponse: { findMany: vi.fn() },
    consultation: { groupBy: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { GET } from './route';

describe('GET /api/praticien/inbox-questionnaires', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.patient.findMany.mockResolvedValue([]);
    prisma.questionnaireReponse.findMany.mockResolvedValue([]);
    prisma.consultation.groupBy.mockResolvedValue([]);
  });

  it('sans session : 401 et `unavailable`', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    expect((await res.json()).unavailable).toBe(true);
    expect(prisma.patient.findMany).not.toHaveBeenCalled();
  });

  it('sans patient actif : inbox vide, sans lecture des réponses', async () => {
    const payload = await (await GET()).json();
    expect(payload.lignes).toEqual([]);
    expect(prisma.questionnaireReponse.findMany).not.toHaveBeenCalled();
  });

  it('groupe par patient et écarte ce qui précède la dernière consultation validée', async () => {
    prisma.patient.findMany.mockResolvedValue([{ idPatient: 'PAT_SEED_01', prenom: 'Sophie', nom: 'Nicola' }]);
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      { idPatient: 'PAT_SEED_01', titre: 'Ancien', dateReponse: new Date('2026-07-10T08:00:00.000Z') },
      { idPatient: 'PAT_SEED_01', titre: 'Récent', dateReponse: new Date('2026-07-15T08:00:00.000Z') },
    ]);
    prisma.consultation.groupBy.mockResolvedValue([
      { idPatient: 'PAT_SEED_01', _max: { dateValidation: new Date('2026-07-14T12:00:00.000Z') } },
    ]);
    const payload = await (await GET()).json();
    expect(payload.lignes).toHaveLength(1);
    expect(payload.lignes[0].nb).toBe(1);
    expect(payload.lignes[0].titres).toEqual(['Récent']);
  });

  it('borne la lecture des patients au praticien en session', async () => {
    await GET();
    const where = prisma.patient.findMany.mock.calls[0][0].where;
    expect(where.actif).toBe(true);
    expect(where.praticienEmail).toEqual({ equals: 'p@wellneuro.fr', mode: 'insensitive' });
  });
});
