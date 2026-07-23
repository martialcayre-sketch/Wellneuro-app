import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findFirst: vi.fn() },
    questionnaireReponse: { findMany: vi.fn() },
    journalAccesDossier: { create: vi.fn(), deleteMany: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { GET } from './route';

function request(query = 'idPatient=PAT_1'): Request {
  return new Request(`http://localhost/api/praticien/equilibre?${query}`);
}

describe('GET /api/praticien/equilibre', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.patient.findFirst.mockResolvedValue({
      idPatient: 'PAT_1',
      prenom: 'Sophie',
      nom: 'Nicola',
      email: 'sophie.nicola@fictif.wellneuro.fr',
    });
    prisma.questionnaireReponse.findMany.mockResolvedValue([]);
  });

  it('refuse sans session (401)', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET(request());
    expect(res.status).toBe(401);
    expect(prisma.patient.findFirst).not.toHaveBeenCalled();
  });

  it('rejette une requête sans idPatient (400)', async () => {
    const res = await GET(request(''));
    expect(res.status).toBe(400);
  });

  it('scope la recherche du patient au praticien en session', async () => {
    await GET(request());
    expect(prisma.patient.findFirst).toHaveBeenCalledWith({
      where: { idPatient: 'PAT_1', praticienEmail: { equals: 'p@wellneuro.fr', mode: 'insensitive' } },
    });
  });

  it('patient d’un autre praticien : 404 indistinguable, sans journalisation', async () => {
    prisma.patient.findFirst.mockResolvedValue(null);
    const res = await GET(request());
    expect(res.status).toBe(404);
    const json = (await res.json()) as { reason: string };
    expect(json.reason).toBe('patient_not_found');
    expect(prisma.questionnaireReponse.findMany).not.toHaveBeenCalled();
    // Un refus ne se journalise jamais : la ligne nommerait un dossier non lu.
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('patient accessible → 200, et la lecture est journalisée au gabarit littéral', async () => {
    const res = await GET(request());
    expect(res.status).toBe(200);
    const json = (await res.json()) as { patient: { idPatient: string } };
    expect(json.patient.idPatient).toBe('PAT_1');
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledTimes(1);
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledWith({
      data: {
        idPatient: 'PAT_1',
        praticienEmail: 'p@wellneuro.fr',
        route: '/api/praticien/equilibre',
        methode: 'GET',
      },
    });
  });
});
