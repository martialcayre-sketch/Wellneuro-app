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
  return new Request(`http://localhost/api/praticien/besoins?${query}`);
}

// Régression E7 : cette route renvoyait identité + couverture des besoins pour
// tout idPatient fourni, sans vérifier qu'il appartenait au praticien en
// session (garde d'appartenance ajoutée le 2026-07-21).
describe('GET /api/praticien/besoins', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.patient.findFirst.mockResolvedValue({ idPatient: 'PAT_1', prenom: 'Sophie', nom: 'Nicola' });
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

  it('patient d’un autre praticien : 404 indistinguable d’un patient introuvable', async () => {
    // filtrePatientsDuPraticien exclut la ligne : findFirst ne la retourne pas.
    prisma.patient.findFirst.mockResolvedValue(null);
    const res = await GET(request());
    expect(res.status).toBe(404);
    const json = (await res.json()) as { reason: string };
    expect(json.reason).toBe('patient_not_found');
    expect(prisma.questionnaireReponse.findMany).not.toHaveBeenCalled();
    // Un refus ne se journalise jamais : la ligne nommerait un dossier non lu.
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('patient accessible → 200 avec identité et besoins', async () => {
    const res = await GET(request());
    expect(res.status).toBe(200);
    const json = (await res.json()) as { patient: { idPatient: string } };
    expect(json.patient.idPatient).toBe('PAT_1');
  });

  it('chaque besoin non mesuré porte son motif, un besoin mesuré aucun (r3_08)', async () => {
    const res = await GET(request());
    const json = (await res.json()) as { besoins: { id: number; couverture: number | null; motifNonMesure: unknown }[] };
    const par = new Map(json.besoins.map(b => [b.id, b]));
    expect(par.get(2)?.motifNonMesure).toEqual([{ motif: 'hors_score', idsQuestionnaire: [], dateDernierePassation: null }]);
    expect(par.get(6)?.motifNonMesure).toEqual([{ motif: 'sans_instrument', idsQuestionnaire: [], dateDernierePassation: null }]);
    for (const b of json.besoins) expect(b.motifNonMesure === null).toBe(b.couverture !== null);
  });

  it('drapeau de validité allumé : passation écartée, et recueil incomplet daté de la passation retenue (r3_08)', async () => {
    vi.stubEnv('WN_ENABLE_VALIDITE_PASSATIONS', '1');
    try {
      prisma.questionnaireReponse.findMany.mockResolvedValue([
        // Q_STR_02 : sa seule passation est invalidée → écartée par le filtre.
        { idQuestionnaire: 'Q_STR_02', dateReponse: new Date('2026-10-01T08:00:00Z'), scoresJson: { rawAnswers: { P1: '2' } }, statutValidite: 'INVALID' },
        // Q_STR_01 : une passation retenue, incomplète.
        { idQuestionnaire: 'Q_STR_01', dateReponse: new Date('2026-10-12T08:00:00Z'), scoresJson: { rawAnswers: { A1: 2 } }, statutValidite: null },
      ]);
      const json = (await (await GET(request())).json()) as { besoins: { id: number; motifNonMesure: unknown }[] };
      expect(json.besoins.find(b => b.id === 9)?.motifNonMesure).toEqual([
        { motif: 'recueil_incomplet', idsQuestionnaire: ['Q_STR_01'], dateDernierePassation: '2026-10-12T08:00:00.000Z' },
        { motif: 'passation_ecartee', idsQuestionnaire: ['Q_STR_02'], dateDernierePassation: null },
        { motif: 'aucune_passation', idsQuestionnaire: ['Q_STR_03'], dateDernierePassation: null },
      ]);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('GET accessible journalise la lecture au gabarit littéral (G-TRUST-04)', async () => {
    await GET(request());
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledTimes(1);
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledWith({
      data: {
        idPatient: 'PAT_1',
        praticienEmail: 'p@wellneuro.fr',
        route: '/api/praticien/besoins',
        methode: 'GET',
      },
    });
  });
});
