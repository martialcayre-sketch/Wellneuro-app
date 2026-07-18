import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    protocolDraft: { findMany: vi.fn() },
    protocolCheckin: { findMany: vi.fn() },
    questionnaireReponse: { findMany: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { GET } from './route';

const reponses = { contractVersion: 'c2a-checkin-v1', adhesion: 'plupart_des_jours', tolerance: 'bien', energie: 'stable', sommeil: 'mieux' };

// Réponses brutes exploitables par le moteur d'équilibre (rawAnswers) — même
// fixture que depuisPrisma.test.ts : produit un scoreGlobal non-null par jalon.
const RAW_ANSWERS_Q_SOM_06 = { P1: '2', P2: '2', P3: '1', P4: '1', P5: '1', P6: '1', P7: '1', P8: '1' };

function request(query = 'idPatient=PAT_1&decisionCardId=DEC_1'): Request {
  return new Request(`http://localhost/api/praticien/protocoles/checkins?${query}`);
}

describe('GET /api/praticien/protocoles/checkins', () => {
  beforeEach(() => vi.clearAllMocks());

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
    // T0 en janvier → jalons T0/J21/J42/J90 tous passés à la date du test →
    // historique d'équilibre daté non vide → volet score branché (n'est plus null).
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      { idQuestionnaire: 'Q_SOM_06', dateReponse: new Date('2026-01-01T00:00:00.000Z'), scoresJson: { rawAnswers: RAW_ANSWERS_Q_SOM_06 } },
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
});
