import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    questionnaireReponse: { findMany: vi.fn() },
    journalAccesDossier: { create: vi.fn(), deleteMany: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { GET } from './route';

function request(query = 'email=sophie.nicola%40fictif.wellneuro.fr'): Request {
  return new Request(`http://localhost/api/praticien/reponses?${query}`);
}

function reponseRow() {
  return {
    idReponse: 'REP_1',
    idPatient: 'PAT_1',
    emailPatient: 'sophie.nicola@fictif.wellneuro.fr',
    idAssignation: 'ASS_1',
    idQuestionnaire: 'Q_SOM_06',
    titre: 'Sommeil',
    dateReponse: new Date('2026-07-01T00:00:00.000Z'),
    scoresJson: {},
    scorePrincipal: 3,
    interpretation: 'Faible',
  };
}

describe('GET /api/praticien/reponses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.questionnaireReponse.findMany.mockResolvedValue([]);
  });

  it('refuse sans session (401)', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET(request());
    expect(res.status).toBe(401);
    expect(prisma.questionnaireReponse.findMany).not.toHaveBeenCalled();
  });

  it('rejette une requête sans email (400)', async () => {
    const res = await GET(request(''));
    expect(res.status).toBe(400);
  });

  it('scope la liste par la relation patient (l’e-mail seul est devinable)', async () => {
    await GET(request());
    expect(prisma.questionnaireReponse.findMany).toHaveBeenCalledWith({
      where: {
        emailPatient: 'sophie.nicola@fictif.wellneuro.fr',
        patient: { praticienEmail: { equals: 'p@wellneuro.fr', mode: 'insensitive' } },
      },
      orderBy: { dateReponse: 'desc' },
    });
  });

  it('liste non vide → lecture journalisée, idPatient issu de la ligne (pas de l’e-mail)', async () => {
    prisma.questionnaireReponse.findMany.mockResolvedValue([reponseRow()]);
    const res = await GET(request());
    expect(res.status).toBe(200);
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledTimes(1);
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledWith({
      data: {
        idPatient: 'PAT_1',
        praticienEmail: 'p@wellneuro.fr',
        route: '/api/praticien/reponses',
        methode: 'GET',
      },
    });
  });

  it('liste vide (e-mail inconnu OU patient d’un autre praticien) → 200 sans journalisation (limite assumée)', async () => {
    const res = await GET(request());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ reponses: [] });
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });
});
