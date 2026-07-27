import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: { assignation: { create: vi.fn() } },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/ids', () => ({ createPublicId: (prefix: string) => `${prefix}_TEST_12345678` }));

import { assignPackToPatient } from './assignBasePack';

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

  it('écarte un instrument suspendu sans faire échouer le reste du pack', async () => {
    const cree = await assigner(['Q_NEU_03', 'Q_SOM_07']);
    expect(cree).toHaveLength(1);
    expect(prisma.assignation.create).toHaveBeenCalledOnce();
    const arg = prisma.assignation.create.mock.calls[0][0] as { data: { idQuestionnaire: string } };
    expect(arg.data.idQuestionnaire).toBe('Q_NEU_03');
  });

  it('n’écrit rien si le pack ne contient que des instruments suspendus', async () => {
    const cree = await assigner(['Q_SOM_07']);
    expect(cree).toHaveLength(0);
    expect(prisma.assignation.create).not.toHaveBeenCalled();
  });
});
