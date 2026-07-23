import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findMany: vi.fn() },
    assessmentEpisode: { findMany: vi.fn() },
    questionnaireReponse: { findMany: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { GET } from './route';

describe('GET /api/praticien/trajectoires (SP-TRAJ LOT-04)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.patient.findMany.mockResolvedValue([
      { idPatient: 'PAT_1', prenom: 'Sophie', nom: 'Nicola', email: 'sophie@example.test' },
      { idPatient: 'PAT_2', prenom: 'Michel', nom: 'Dogné', email: 'michel@example.test' },
    ]);
    prisma.assessmentEpisode.findMany.mockResolvedValue([]);
    prisma.questionnaireReponse.findMany.mockResolvedValue([]);
  });

  it('refuse sans session (401)', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(prisma.patient.findMany).not.toHaveBeenCalled();
  });

  it('une ligne par patient du praticien, trajectoire construite — 3 requêtes plates', async () => {
    const res = await GET();
    const json = (await res.json()) as { ok: boolean; lignes: { idPatient: string; trajectoire: { cycles: unknown[] } }[] };
    expect(res.status).toBe(200);
    expect(json.lignes.map((l) => l.idPatient)).toEqual(['PAT_1', 'PAT_2']);
    expect(json.lignes[0].trajectoire.cycles).toEqual([]);
    expect(prisma.patient.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.assessmentEpisode.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.questionnaireReponse.findMany).toHaveBeenCalledTimes(1);
  });

  it('cabinet vide : liste vide sans lecture des épisodes', async () => {
    prisma.patient.findMany.mockResolvedValue([]);
    const res = await GET();
    const json = (await res.json()) as { lignes: unknown[] };
    expect(json.lignes).toEqual([]);
    expect(prisma.assessmentEpisode.findMany).not.toHaveBeenCalled();
  });
});
