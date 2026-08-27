import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    protocolDraft: { findMany: vi.fn() },
    protocolCheckin: { findMany: vi.fn() },
    questionnaireReponse: { findMany: vi.fn() },
    assessmentEpisode: { findMany: vi.fn() },
    journalAccesDossier: { create: vi.fn(), deleteMany: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { GET } from './route';

const reponses = { contractVersion: 'c2a-checkin-v1', adhesion: 'plupart_des_jours', tolerance: 'bien', energie: 'stable', sommeil: 'mieux' };

// Réponses brutes exploitables par le moteur d'équilibre (rawAnswers) — même
// fixture que depuisPrisma.test.ts : produit un scoreGlobal non-null par jalon.
// PSS-10 complet : source vivante du besoin 9, donc scoreGlobal non-null.
// Le Pichot tenait ce rôle avant v4 ; il n'est plus source de Mon équilibre.
const RAW_ANSWERS_Q_STR_02 = {
  P1: '2', P2: '2', P3: '3', P4: '3', P5: '3',
  P6: '2', P7: '3', P8: '3', P9: '2', P10: '3',
};

function request(query = 'idPatient=PAT_1&decisionCardId=DEC_1'): Request {
  return new Request(`http://localhost/api/praticien/protocoles/checkins?${query}`);
}

describe('GET /api/praticien/protocoles/checkins', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Par défaut, le patient appartient au praticien en session (garde d'appartenance).
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'p@wellneuro.fr' });
    // Par défaut : aucune ancre confirmée → repli sur la 1re réponse (LOT-08).
    prisma.assessmentEpisode.findMany.mockResolvedValue([]);
  });

  it('refuse sans session (401)', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET(request());
    expect(res.status).toBe(401);
    expect(prisma.protocolDraft.findMany).not.toHaveBeenCalled();
  });

  it('rejette un identifiant patient invalide (400)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    const res = await GET(request('idPatient=pas%20valide&decisionCardId=DEC_1'));
    expect(res.status).toBe(400);
  });

  it('patient hors périmètre : 404 fusionné, jamais journalisé', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr' });
    const res = await GET(request());
    expect(res.status).toBe(404);
    // Un refus ne se journalise pas : la ligne nommerait un dossier non lu.
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('un GET accessible journalise l’accès au gabarit littéral (G-TRUST-04)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.protocolDraft.findMany.mockResolvedValue([]);
    prisma.protocolCheckin.findMany.mockResolvedValue([]);
    prisma.questionnaireReponse.findMany.mockResolvedValue([]);
    const res = await GET(request());
    expect(res.status).toBe(200);
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledTimes(1);
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledWith({
      data: {
        idPatient: 'PAT_1',
        praticienEmail: 'p@wellneuro.fr',
        route: '/api/praticien/protocoles/checkins',
        methode: 'GET',
      },
    });
  });

  it('borne les check-ins au fil et calcule le résumé (200)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.protocolDraft.findMany.mockResolvedValue([{ id: 'proto_DEC_1#h' }]);
    // Aucune réponse questionnaire exploitable → pas de T0 → score null (honnête).
    prisma.questionnaireReponse.findMany.mockResolvedValue([]);
    prisma.protocolCheckin.findMany.mockResolvedValue([
      {
        id: 'ck_1', idPatient: 'PAT_1', idAssignation: 'ASS_1', protocolDraftId: 'proto_DEC_1#h',
        pointEtape: 'J7', reponses, canal: 'portail', supersedesCheckinId: null, soumisLe: new Date('2026-01-08T00:00:00.000Z'),
      },
      // Check-in d'un AUTRE protocole logique — doit être filtré.
      {
        id: 'ck_x', idPatient: 'PAT_1', idAssignation: 'ASS_1', protocolDraftId: 'proto_AUTRE#h',
        pointEtape: 'J14', reponses, canal: 'portail', supersedesCheckinId: null, soumisLe: new Date('2026-01-15T00:00:00.000Z'),
      },
    ]);

    const res = await GET(request());
    const json = (await res.json()) as { ok: boolean; checkins: unknown[]; resume: { score: unknown; pointsRenseignes: number } };
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.checkins).toHaveLength(1);
    expect(json.resume.score).toBeNull();
    expect(json.resume.pointsRenseignes).toBe(1);
  });

  it('branche le momentum réel : score non-null quand un cycle T0+J21 est mesuré (C2B LOT-07)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.protocolDraft.findMany.mockResolvedValue([{ id: 'proto_DEC_1#h' }]);
    prisma.protocolCheckin.findMany.mockResolvedValue([
      {
        id: 'ck_1', idPatient: 'PAT_1', idAssignation: 'ASS_1', protocolDraftId: 'proto_DEC_1#h',
        pointEtape: 'J21', reponses, canal: 'portail', supersedesCheckinId: null, soumisLe: new Date('2026-01-22T00:00:00.000Z'),
      },
    ]);
    // T0 en janvier → jalons T0/J21/J42/J90 tous passés à la date du test.
    // DEUX passations réelles : depuis le lot 1 (règle de nouveauté, F1), un
    // jalon sans réponse nouvelle n'est plus mesuré — une réponse unique à T0
    // ne produirait donc aucun momentum, et ce test ne prouverait plus que le
    // volet score est branché. Le titre annonçait déjà « T0+J21 ».
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      { idQuestionnaire: 'Q_STR_02', dateReponse: new Date('2026-01-01T00:00:00.000Z'), scoresJson: { rawAnswers: RAW_ANSWERS_Q_STR_02 } },
      { idQuestionnaire: 'Q_STR_02', dateReponse: new Date('2026-01-22T00:00:00.000Z'), scoresJson: { rawAnswers: RAW_ANSWERS_Q_STR_02 } },
    ]);

    const res = await GET(request());
    const json = (await res.json()) as { ok: boolean; resume: { score: { tendance: string; delta: number } | null } };
    expect(res.status).toBe(200);
    expect(prisma.questionnaireReponse.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { idPatient: 'PAT_1' } }),
    );
    expect(json.resume.score).not.toBeNull();
    expect(typeof json.resume.score?.delta).toBe('number');
  });

  it('ancre sur l’épisode d’ancre confirmé quand il existe (C2B LOT-08)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.protocolDraft.findMany.mockResolvedValue([{ id: 'proto_DEC_1#h' }]);
    prisma.protocolCheckin.findMany.mockResolvedValue([]);
    // Épisode d'ancre confirmé : c'est lui qui ancre les jalons (pas la 1re réponse).
    prisma.assessmentEpisode.findMany.mockResolvedValue([
      { id: 'EPI_T0', cycleId: 'EPI_T0', confirmedAt: new Date('2026-01-01T00:00:00.000Z'), milestone: 'T0' },
    ]);
    // Deux passations : voir le cas précédent — la règle de nouveauté (lot 1)
    // rend le momentum null sur une réponse unique, ce qui masquerait ici ce
    // que le cas vérifie réellement, à savoir l'ancrage sur l'épisode confirmé.
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      { idQuestionnaire: 'Q_STR_02', dateReponse: new Date('2026-01-01T00:00:00.000Z'), scoresJson: { rawAnswers: RAW_ANSWERS_Q_STR_02 } },
      { idQuestionnaire: 'Q_STR_02', dateReponse: new Date('2026-01-22T00:00:00.000Z'), scoresJson: { rawAnswers: RAW_ANSWERS_Q_STR_02 } },
    ]);

    const res = await GET(request());
    const json = (await res.json()) as { resume: { score: { delta: number } | null } };
    expect(res.status).toBe(200);
    // Le filtre SQL est LARGE (`startsWith: 'T'`) : la série des ancres est
    // ouverte, et `milestone: 'T0'` n'aurait pas vu un `T1` (`D-113`).
    expect(prisma.assessmentEpisode.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { idPatient: 'PAT_1', milestone: { startsWith: 'T' } } }),
    );
    expect(json.resume.score).not.toBeNull();
  });
});
