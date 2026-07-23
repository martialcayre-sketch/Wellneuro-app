import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn(), findMany: vi.fn() },
    assessmentEpisode: { findMany: vi.fn() },
    questionnaireReponse: { findMany: vi.fn() },
    journalAccesDossier: { create: vi.fn(), deleteMany: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { GET } from './route';

function request(query = 'idPatient=PAT_1'): Request {
  return new Request(`http://localhost/api/praticien/cabinet-momentum?${query}`);
}

describe('GET /api/praticien/cabinet-momentum (A6-R2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ idPatient: 'PAT_1', praticienEmail: 'p@wellneuro.fr' });
    prisma.patient.findMany.mockResolvedValue([
      { idPatient: 'PAT_1', prenom: 'Sophie', nom: 'Nicola', email: 'sophie@example.test' },
      { idPatient: 'PAT_2', prenom: 'Michel', nom: 'Dogné', email: 'michel@example.test' },
    ]);
    prisma.assessmentEpisode.findMany.mockResolvedValue([]);
    prisma.questionnaireReponse.findMany.mockResolvedValue([]);
  });

  it('refuse sans session (401)', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET(request());
    expect(res.status).toBe(401);
    expect(prisma.patient.findMany).not.toHaveBeenCalled();
  });

  it('identifiant invalide → 400 ; patient inconnu → 404 ; autre praticien → 403 sans lecture cabinet', async () => {
    expect((await GET(request('idPatient=pas%20valide'))).status).toBe(400);

    prisma.patient.findUnique.mockResolvedValue(null);
    expect((await GET(request())).status).toBe(404);

    prisma.patient.findUnique.mockResolvedValue({ idPatient: 'PAT_1', praticienEmail: 'autre@wellneuro.fr' });
    const res = await GET(request());
    expect(res.status).toBe(403);
    expect(prisma.patient.findMany).not.toHaveBeenCalled();
  });

  it('sans cycle du patient lu : version de référence inconnue, repère masqué, n=0 (A8-3)', async () => {
    const res = await GET(request());
    const json = (await res.json()) as { ok: boolean; cabinet: { masque: boolean; nTotal: number; versionScoreReference: string | null } };
    expect(res.status).toBe(200);
    expect(json.cabinet.masque).toBe(true);
    expect(json.cabinet.versionScoreReference).toBeNull();
  });

  it('agrège en 3 requêtes plates — jamais une requête par patient', async () => {
    await GET(request());
    expect(prisma.patient.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.assessmentEpisode.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.questionnaireReponse.findMany).toHaveBeenCalledTimes(1);
    // Les épisodes sont lus pour l'ensemble des patients du praticien (in).
    const whereEpisodes = prisma.assessmentEpisode.findMany.mock.calls[0]?.[0]?.where;
    expect(whereEpisodes).toMatchObject({ idPatient: { in: ['PAT_1', 'PAT_2'] } });
  });

  it('la réponse n’expose que des agrégats : médianes et effectifs, aucune donnée individuelle', async () => {
    prisma.assessmentEpisode.findMany.mockResolvedValue([
      { id: 'e1', idPatient: 'PAT_1', milestone: 'T0', confirmedAt: new Date('2026-01-01T00:00:00.000Z'), cycleId: 'c1', versionScore: 'v1' },
    ]);
    const res = await GET(request());
    const json = (await res.json()) as Record<string, unknown>;
    expect(Object.keys(json).sort()).toEqual(['cabinet', 'ok']);
    expect(JSON.stringify(json)).not.toContain('PAT_2');
    expect(JSON.stringify(json)).not.toContain('Dogné');
  });
});
