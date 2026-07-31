import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: { assignation: { create: vi.fn() } },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/ids', () => ({ createPublicId: (prefix: string) => `${prefix}_TEST_12345678` }));

import { assignPackToPatient, qidsSuspendus } from './assignBasePack';

// Ce chemin est le plus sensible des trois points d'assignation : il part de
// l'onboarding portail (`api/portail/valider`), donc sans clic praticien sur le
// questionnaire lui-même. Un pack enregistré en base peut contenir un qid
// depuis suspendu — rien ne l'en retire — d'où le filtre à la création.
describe('assignPackToPatient — instruments suspendus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.assignation.create.mockResolvedValue({});
  });

  async function assigner(qids: string[]) {
    return assignPackToPatient({
      idPatientBusiness: 'PAT_TEST',
      emailPatient: 'sophie.nicola@example.test',
      qids,
      packNom: 'Pack test',
    });
  }

  it('crée les assignations des instruments actifs', async () => {
    const cree = await assigner(['Q_NEU_03']);
    expect(cree).toHaveLength(1);
    expect(prisma.assignation.create).toHaveBeenCalledOnce();
  });

  // L'instrument témoin était `Q_SOM_07` jusqu'au 2026-07-31 ; il a été
  // reconstruit depuis sa source et rouvert, donc il ne témoigne plus de rien
  // ici. `Q_FIB_03` (ELFE) le remplace : suspendu depuis toujours, et le seul
  // dont l'arbitrage du 2026-07-31 a explicitement décidé qu'il le RESTE — son
  // usage ne coûte rien à personne, sa reconstruction ne servirait aujourd'hui
  // aucun usage.
  it('écarte un instrument suspendu sans faire échouer le reste du pack', async () => {
    const cree = await assigner(['Q_NEU_03', 'Q_FIB_03']);
    expect(cree).toHaveLength(1);
    expect(prisma.assignation.create).toHaveBeenCalledOnce();
    const arg = prisma.assignation.create.mock.calls[0][0] as { data: { idQuestionnaire: string } };
    expect(arg.data.idQuestionnaire).toBe('Q_NEU_03');
  });

  // `qidsSuspendus` est ce que la route journalise : sans elle, l'amputation du
  // pack de base serait invisible — ce chemin n'a aucun praticien pour lire un
  // écart de comptage. La fonction est ici, la trace dans `api/portail/valider`.
  it('expose les qids écartés, pour que l’appelant puisse les tracer', () => {
    expect(qidsSuspendus(['Q_NEU_03', 'Q_FIB_03'])).toEqual(['Q_FIB_03']);
    expect(qidsSuspendus(['Q_NEU_03'])).toEqual([]);
  });

  it('n’écrit rien si le pack ne contient que des instruments suspendus', async () => {
    const cree = await assigner(['Q_FIB_03']);
    expect(cree).toHaveLength(0);
    expect(prisma.assignation.create).not.toHaveBeenCalled();
  });
});
