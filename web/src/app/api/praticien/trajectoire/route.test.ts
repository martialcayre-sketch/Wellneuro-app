import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    assessmentEpisode: { findMany: vi.fn() },
    questionnaireReponse: { findMany: vi.fn() },
    journalAccesDossier: { create: vi.fn(), deleteMany: vi.fn() },
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
    prisma.patient.findUnique.mockResolvedValue({ idPatient: 'PAT_1', praticienEmail: 'p@wellneuro.fr' });
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
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('patient d’un autre praticien : 403, distinct du 404 « introuvable »', async () => {
    prisma.patient.findUnique.mockResolvedValue({ idPatient: 'PAT_1', praticienEmail: 'autre@wellneuro.fr' });
    const res = await GET(request());
    expect(res.status).toBe(403);
    // La trajectoire n'est jamais lue pour un patient qui n'est pas le sien.
    expect(prisma.assessmentEpisode.findMany).not.toHaveBeenCalled();
    // Un refus ne se journalise pas : la ligne nommerait un dossier non lu.
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('un GET accessible journalise l’accès au gabarit littéral (G-TRUST-04)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    const res = await GET(request());
    expect(res.status).toBe(200);
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledTimes(1);
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledWith({
      data: {
        idPatient: 'PAT_1',
        praticienEmail: 'p@wellneuro.fr',
        route: '/api/praticien/trajectoire',
        methode: 'GET',
      },
    });
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
      {
        id: 'ep_T0',
        milestone: 'T0',
        confirmedAt: new Date('2026-01-01T00:00:00.000Z'),
        cycleId: 'ep_T0',
        versionScore: 'v1',
      },
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

  // Gate G2 : la route LIT la version stockée, elle ne la déduit plus de la
  // constante courante. Une ligne héritée ressort donc « inconnue ».
  it('épisode hérité sans identité de cycle → version inconnue, cycle non deviné (200)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.assessmentEpisode.findMany.mockResolvedValue([
      {
        id: 'ep_legacy',
        milestone: 'T0',
        confirmedAt: new Date('2026-01-01T00:00:00.000Z'),
        cycleId: null,
        versionScore: null,
      },
    ]);

    const res = await GET(request());
    const json = (await res.json()) as {
      trajectoire: { index: { cycleId: string | null }[]; cycles: { cycleId: string; versionScore: string | null }[] };
    };
    expect(res.status).toBe(200);
    expect(json.trajectoire.cycles[0].versionScore).toBeNull();
    expect(json.trajectoire.cycles[0].cycleId).toBe('ep_legacy');
    expect(json.trajectoire.index[0].cycleId).toBeNull();
  });

  it('sélectionne bien l’identité de cycle stockée', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    await GET(request());
    const select = prisma.assessmentEpisode.findMany.mock.calls[0]?.[0]?.select;
    expect(select).toMatchObject({ cycleId: true, versionScore: true });
  });
});
