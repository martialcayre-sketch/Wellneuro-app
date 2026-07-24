import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findMany: vi.fn(), findFirst: vi.fn() },
    questionnaireReponse: { findMany: vi.fn() },
    questionnaireLecturePraticien: { findMany: vi.fn(), createMany: vi.fn() },
    consultation: { groupBy: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { GET, POST } from './route';

function getRequest(path = '/api/praticien/inbox-questionnaires') {
  return new Request(`http://test.local${path}`);
}

describe('GET /api/praticien/inbox-questionnaires', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.patient.findMany.mockResolvedValue([]);
    prisma.patient.findFirst.mockResolvedValue({ idPatient: 'PAT_SEED_01' });
    prisma.questionnaireReponse.findMany.mockResolvedValue([]);
    prisma.questionnaireLecturePraticien.findMany.mockResolvedValue([]);
    prisma.questionnaireLecturePraticien.createMany.mockResolvedValue({ count: 0 });
    prisma.consultation.groupBy.mockResolvedValue([]);
  });

  it('sans session : 401 et `unavailable`', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET(getRequest());
    expect(res.status).toBe(401);
    expect((await res.json()).unavailable).toBe(true);
    expect(prisma.patient.findMany).not.toHaveBeenCalled();
  });

  it('sans patient actif : inbox vide, sans lecture des réponses', async () => {
    const payload = await (await GET(getRequest())).json();
    expect(payload.lignes).toEqual([]);
    expect(prisma.questionnaireReponse.findMany).not.toHaveBeenCalled();
  });

  it('groupe par patient et écarte ce qui précède la dernière consultation validée', async () => {
    prisma.patient.findMany.mockResolvedValue([{ idPatient: 'PAT_SEED_01', prenom: 'Sophie', nom: 'Nicola' }]);
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      { idReponse: 'R1', idPatient: 'PAT_SEED_01', titre: 'Ancien', dateReponse: new Date('2026-07-10T08:00:00.000Z') },
      { idReponse: 'R2', idPatient: 'PAT_SEED_01', titre: 'Récent', dateReponse: new Date('2026-07-15T08:00:00.000Z') },
    ]);
    prisma.consultation.groupBy.mockResolvedValue([
      { idPatient: 'PAT_SEED_01', _max: { dateValidation: new Date('2026-07-14T12:00:00.000Z') } },
    ]);
    const payload = await (await GET(getRequest())).json();
    expect(payload.lignes).toHaveLength(1);
    expect(payload.lignes[0].nb).toBe(1);
    expect(payload.lignes[0].titres).toEqual(['Récent']);
  });

  it('borne la lecture des patients au praticien en session', async () => {
    await GET(getRequest());
    const where = prisma.patient.findMany.mock.calls[0][0].where;
    expect(where.actif).toBe(true);
    expect(where.praticienEmail).toEqual({ equals: 'p@wellneuro.fr', mode: 'insensitive' });
  });

  it('retire de la liste les réponses déjà confirmées lues', async () => {
    prisma.patient.findMany.mockResolvedValue([{ idPatient: 'PAT_SEED_01', prenom: 'Sophie', nom: 'Nicola' }]);
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      { idReponse: 'R_LUE', idPatient: 'PAT_SEED_01', titre: 'Sommeil', dateReponse: new Date('2026-07-15T08:00:00.000Z') },
      { idReponse: 'R_NEUVE', idPatient: 'PAT_SEED_01', titre: 'Plaintes', dateReponse: new Date('2026-07-16T08:00:00.000Z') },
    ]);
    prisma.questionnaireLecturePraticien.findMany.mockResolvedValue([{ idReponse: 'R_LUE' }]);
    const payload = await (await GET(getRequest())).json();
    expect(payload.lignes[0].nb).toBe(1);
    expect(payload.lignes[0].titres).toEqual(['Plaintes']);
  });

  it('le détail patient renvoie les réponses brutes et scores en attente', async () => {
    prisma.patient.findMany.mockResolvedValue([{ idPatient: 'PAT_SEED_01', prenom: 'Sophie', nom: 'Nicola' }]);
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      {
        idReponse: 'R1',
        idPatient: 'PAT_SEED_01',
        idAssignation: 'ASS1',
        idQuestionnaire: 'NEU_03',
        titre: 'Questionnaire sommeil',
        dateReponse: new Date('2026-07-15T08:00:00.000Z'),
        scoresJson: { total: 7, rawAnswers: { Q1: 2 } },
        scorePrincipal: 7,
        interpretation: 'Vigilance',
      },
    ]);
    const res = await GET(getRequest('/api/praticien/inbox-questionnaires?idPatient=PAT_SEED_01'));
    const payload = await res.json();
    expect(payload.patient.nom).toBe('Sophie Nicola');
    expect(payload.reponses[0].rawAnswers).toEqual({ Q1: 2 });
    expect(payload.reponses[0].scorePrincipal).toBe(7);
  });

  it('POST confirme la lecture des réponses encore en attente du patient scopé', async () => {
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      { idReponse: 'R1', idPatient: 'PAT_SEED_01', titre: 'Sommeil', dateReponse: new Date('2026-07-15T08:00:00.000Z') },
    ]);
    const res = await POST(new Request('http://test.local/api/praticien/inbox-questionnaires', {
      method: 'POST',
      body: JSON.stringify({ idPatient: 'PAT_SEED_01', idsReponses: ['R1'] }),
    }));
    expect(res.status).toBe(200);
    expect(prisma.questionnaireLecturePraticien.createMany).toHaveBeenCalledWith({
      data: [{ idReponse: 'R1', idPatient: 'PAT_SEED_01', praticienEmail: 'p@wellneuro.fr' }],
      skipDuplicates: true,
    });
  });
});
