import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma, lireEquilibrePatient } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    assignation: { findFirst: vi.fn() },
    journalAccesDossier: { create: vi.fn(), deleteMany: vi.fn() },
  },
  lireEquilibrePatient: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/equilibre/lecturePatient', () => ({ lireEquilibrePatient }));

import { GET } from './route';

function request(query = 'id=ASS_1'): Request {
  return new Request(`http://localhost/api/praticien/apercu-patient/equilibre?${query}`);
}

const EQUILIBRE = {
  indiceGlobal: 62,
  momentum: null,
  trajectoire: [{ date: '2026-07-01T00:00:00.000Z' }],
  besoins: [{ id: 1, libellePatient: 'Sommeil', strate: 'S1', couverture: 60 }],
};

describe('GET /api/praticien/apercu-patient/equilibre', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.assignation.findFirst.mockResolvedValue({ idPatient: 'PAT_1' });
    lireEquilibrePatient.mockResolvedValue(EQUILIBRE);
  });

  it('refuse sans session (401)', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET(request());
    expect(res.status).toBe(401);
    expect(prisma.assignation.findFirst).not.toHaveBeenCalled();
  });

  it('rejette un identifiant invalide (400)', async () => {
    const res = await GET(request('id=!!'));
    expect(res.status).toBe(400);
    expect(prisma.assignation.findFirst).not.toHaveBeenCalled();
  });

  it('scope la résolution de l’assignation au praticien en session', async () => {
    await GET(request());
    expect(prisma.assignation.findFirst).toHaveBeenCalledWith({
      where: {
        idAssignation: 'ASS_1',
        patient: { praticienEmail: { equals: 'p@wellneuro.fr', mode: 'insensitive' } },
      },
      select: { idPatient: true },
    });
  });

  it('assignation inconnue ou d’un autre praticien : 404 unique, ni lecture ni journal', async () => {
    prisma.assignation.findFirst.mockResolvedValue(null);
    const res = await GET(request());
    expect(res.status).toBe(404);
    expect(((await res.json()) as { error: string }).error).toBe('Assignation non reconnue.');
    expect(lireEquilibrePatient).not.toHaveBeenCalled();
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('sert la composition du PORTAIL telle quelle, pour le dossier de l’assignation', async () => {
    const res = await GET(request());
    expect(res.status).toBe(200);
    expect(lireEquilibrePatient).toHaveBeenCalledWith('PAT_1');
    // Rien d'ajouté : ni niveau de preuve, ni identité.
    expect(await res.json()).toEqual(EQUILIBRE);
  });

  it('200 → lecture journalisée au gabarit littéral, idPatient issu de l’assignation', async () => {
    await GET(request());
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledTimes(1);
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledWith({
      data: {
        idPatient: 'PAT_1',
        praticienEmail: 'p@wellneuro.fr',
        route: '/api/praticien/apercu-patient/equilibre',
        methode: 'GET',
      },
    });
  });
});
