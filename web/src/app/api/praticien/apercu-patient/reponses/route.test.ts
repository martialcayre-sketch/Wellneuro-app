import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    assignation: { findFirst: vi.fn() },
    questionnaireReponse: { findFirst: vi.fn() },
    journalAccesDossier: { create: vi.fn(), deleteMany: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { GET } from './route';

function request(query = 'id=ASS_1'): Request {
  return new Request(`http://localhost/api/praticien/apercu-patient/reponses?${query}`);
}

describe('GET /api/praticien/apercu-patient/reponses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.assignation.findFirst.mockResolvedValue({
      idAssignation: 'ASS_1',
      idPatient: 'PAT_1',
      statutReponses: 'Fait',
    });
    prisma.questionnaireReponse.findFirst.mockResolvedValue({
      titre: 'Sommeil',
      dateReponse: new Date('2026-07-01T00:00:00.000Z'),
    });
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
  });

  it('scope la résolution de l’assignation au praticien en session', async () => {
    await GET(request());
    expect(prisma.assignation.findFirst).toHaveBeenCalledWith({
      where: {
        idAssignation: 'ASS_1',
        patient: { praticienEmail: { equals: 'p@wellneuro.fr', mode: 'insensitive' } },
      },
    });
  });

  it('assignation inconnue ou d’un autre praticien : 404 unique, jamais journalisé', async () => {
    prisma.assignation.findFirst.mockResolvedValue(null);
    const res = await GET(request());
    expect(res.status).toBe(404);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe('Assignation non reconnue.');
    expect(prisma.questionnaireReponse.findFirst).not.toHaveBeenCalled();
    // Un refus ne se journalise jamais : la ligne nommerait un dossier non lu.
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('assignation résolue sans réponse : 404, mais la lecture est journalisée (le dossier a été résolu)', async () => {
    prisma.questionnaireReponse.findFirst.mockResolvedValue(null);
    const res = await GET(request());
    expect(res.status).toBe(404);
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledTimes(1);
  });

  it('200 → lecture journalisée au gabarit littéral, idPatient issu de l’assignation', async () => {
    const res = await GET(request());
    expect(res.status).toBe(200);
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledTimes(1);
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledWith({
      data: {
        idPatient: 'PAT_1',
        praticienEmail: 'p@wellneuro.fr',
        route: '/api/praticien/apercu-patient/reponses',
        methode: 'GET',
      },
    });
  });
});
