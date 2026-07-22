import { beforeEach, describe, expect, it, vi } from 'vitest';

// Test minimal ciblé sur la garde d'appartenance et la journalisation des
// accès (G-TRUST-04) : le métier des repères est jugé par
// lib/praticien/lectureAsOf.test.ts, pas ici. Sans ce fichier, oublier le
// 3ᵉ argument `acces` sur cette route compilerait sans échec de test
// (paramètre optionnel).
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

function request(query = 'idPatient=PAT_1'): Request {
  return new Request(`http://localhost/api/praticien/reperes?${query}`);
}

describe('GET /api/praticien/reperes — garde et journal des accès', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'p@wellneuro.fr' });
    prisma.assessmentEpisode.findMany.mockResolvedValue([]);
    prisma.questionnaireReponse.findMany.mockResolvedValue([]);
  });

  it('un GET accessible journalise l’accès au gabarit littéral (G-TRUST-04)', async () => {
    const res = await GET(request());
    expect(res.status).toBe(200);
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledTimes(1);
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledWith({
      data: {
        idPatient: 'PAT_1',
        praticienEmail: 'p@wellneuro.fr',
        route: '/api/praticien/reperes',
        methode: 'GET',
      },
    });
  });

  it('patient d’un autre praticien : 403, jamais journalisé', async () => {
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr' });
    const res = await GET(request());
    expect(res.status).toBe(403);
    expect(prisma.assessmentEpisode.findMany).not.toHaveBeenCalled();
    // Un refus ne se journalise pas : la ligne nommerait un dossier non lu.
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('patient inconnu : 404, jamais journalisé', async () => {
    prisma.patient.findUnique.mockResolvedValue(null);
    const res = await GET(request());
    expect(res.status).toBe(404);
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });
});
