import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    assignation: { findUnique: vi.fn(), update: vi.fn() },
    questionnaireReponse: { findFirst: vi.fn(), create: vi.fn() },
    agendaSommeilNuit: { findMany: vi.fn() },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { cloturerAgenda } from './cloture';

const ASS = {
  idAssignation: 'ASS_AGD',
  idPatient: 'PAT_1',
  emailPatient: 'p@example.test',
  idQuestionnaire: 'Q_SOM_09',
  titre: 'Agenda du sommeil — 21 nuits',
  statutReponses: 'non_rempli',
};

function nuitRow(dateNuit: string, over: Record<string, unknown> = {}) {
  return {
    id: `n_${dateNuit}`,
    idPatient: ASS.idPatient,
    idAssignation: ASS.idAssignation,
    dateNuit,
    reponses: { contractVersion: 'agenda-sommeil-v1', heureCoucher: '23:00', heureLever: '07:00', latence: 'lt15', qualite: 4, ...over },
    canal: 'portail',
    supersedesNuitId: null,
    soumisLe: new Date(`${dateNuit}T07:00:00.000Z`),
  };
}

// $transaction exécute le callback avec un tx dont le verrou de ligne
// (SELECT … FOR UPDATE, via $queryRaw) reflète le statut courant de
// l'assignation — c'est ce verrou qui sérialise les clôtures concurrentes.
function mockTransaction(statutVerrou: string) {
  prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
    fn({
      $queryRaw: vi.fn().mockResolvedValue([{ statutReponses: statutVerrou }]),
      assignation: { update: prisma.assignation.update },
      questionnaireReponse: {
        findFirst: prisma.questionnaireReponse.findFirst,
        create: prisma.questionnaireReponse.create,
      },
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('cloturerAgenda', () => {
  it('crée une réponse scorée et verrouille l’assignation (≥5 nuits)', async () => {
    prisma.assignation.findUnique.mockResolvedValue(ASS);
    prisma.agendaSommeilNuit.findMany.mockResolvedValue([
      nuitRow('2026-07-10'),
      nuitRow('2026-07-11'),
      nuitRow('2026-07-12'),
      nuitRow('2026-07-13'),
      nuitRow('2026-07-14'),
    ]);
    mockTransaction('non_rempli');

    const res = await cloturerAgenda({ idAssignation: 'ASS_AGD' });

    expect(res.dejaCloture).toBe(false);
    expect(res.nbNuits).toBe(5);
    expect(prisma.questionnaireReponse.create).toHaveBeenCalledTimes(1);
    const data = prisma.questionnaireReponse.create.mock.calls[0][0].data;
    expect(data.idQuestionnaire).toBe('Q_SOM_09');
    expect(data.scoresJson.rawAnswers.AGD_NB_NUITS).toBe(5);
    expect(typeof data.scoresJson.total).toBe('number');
    expect(typeof data.scorePrincipal).toBe('number');
    expect(prisma.assignation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ statutReponses: 'verrouille' }) }),
    );
  });

  it('produit une réponse non scorée sous 5 nuits (scored:false, jamais un 0)', async () => {
    prisma.assignation.findUnique.mockResolvedValue(ASS);
    prisma.agendaSommeilNuit.findMany.mockResolvedValue([nuitRow('2026-07-10'), nuitRow('2026-07-11')]);
    mockTransaction('non_rempli');

    await cloturerAgenda({ idAssignation: 'ASS_AGD' });

    const data = prisma.questionnaireReponse.create.mock.calls[0][0].data;
    expect(data.scoresJson.scored).toBe(false);
    expect(data.scoresJson.rawAnswers.AGD_NB_NUITS).toBe(2);
    expect(data.scorePrincipal).toBeNull();
  });

  it('est idempotente : un agenda déjà clôturé renvoie la réponse existante sans en créer', async () => {
    prisma.assignation.findUnique.mockResolvedValue({ ...ASS, statutReponses: 'verrouille' });
    prisma.questionnaireReponse.findFirst.mockResolvedValue({
      idReponse: 'REP_EXIST',
      scoresJson: { rawAnswers: { AGD_NB_NUITS: 7 } },
    });

    const res = await cloturerAgenda({ idAssignation: 'ASS_AGD' });

    expect(res.dejaCloture).toBe(true);
    expect(res.idReponse).toBe('REP_EXIST');
    expect(res.nbNuits).toBe(7);
    expect(prisma.questionnaireReponse.create).not.toHaveBeenCalled();
  });

  it('course concurrente : si une autre clôture a verrouillé pendant le calcul, ne crée pas de doublon', async () => {
    // L'assignation était non verrouillée au démarrage (chemin idempotent initial
    // non pris), mais une clôture concurrente a commité entre-temps : le verrou
    // de ligne (FOR UPDATE) lit alors 'verrouille' DANS la transaction → on
    // renvoie la réponse gagnante, sans créer de seconde QuestionnaireReponse.
    prisma.assignation.findUnique.mockResolvedValue(ASS);
    prisma.agendaSommeilNuit.findMany.mockResolvedValue([
      nuitRow('2026-07-10'),
      nuitRow('2026-07-11'),
      nuitRow('2026-07-12'),
      nuitRow('2026-07-13'),
      nuitRow('2026-07-14'),
    ]);
    mockTransaction('verrouille');
    prisma.questionnaireReponse.findFirst.mockResolvedValue({ idReponse: 'REP_GAGNANT' });

    const res = await cloturerAgenda({ idAssignation: 'ASS_AGD' });

    expect(res.dejaCloture).toBe(true);
    expect(res.idReponse).toBe('REP_GAGNANT');
    expect(prisma.questionnaireReponse.create).not.toHaveBeenCalled();
    expect(prisma.assignation.update).not.toHaveBeenCalled();
  });

  it('refuse une assignation qui n’est pas un agenda', async () => {
    prisma.assignation.findUnique.mockResolvedValue({ ...ASS, idQuestionnaire: 'Q_SOM_01' });
    await expect(cloturerAgenda({ idAssignation: 'ASS_AGD' })).rejects.toThrow(TypeError);
  });

  it('refuse de clôturer un agenda sans aucune nuit', async () => {
    prisma.assignation.findUnique.mockResolvedValue(ASS);
    prisma.agendaSommeilNuit.findMany.mockResolvedValue([]);
    await expect(cloturerAgenda({ idAssignation: 'ASS_AGD' })).rejects.toThrow(/aucune nuit/i);
  });
});
