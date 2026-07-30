import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: { protocolDraft: { findFirst: vi.fn() } },
}));

vi.mock('@/lib/prisma', () => ({ prisma }));

import { readJaObservationSnapshot } from './persistence';

const TRACE = {
  traceId: 't1',
  episodeId: 'ja_PAT_A_cycle',
  localDate: '2026-07-28',
  occasionPresentee: true,
  faisable: true,
  issue: 'fait',
  motLibre: 'plus simple la veille',
  frictionsVersion: 'frictions-v1',
};

function ligne(payload: Record<string, unknown>) {
  return {
    id: 'JA_1',
    idPatient: 'PAT_A',
    supersedesDraftId: null,
    createdAt: new Date('2026-07-28T10:00:00.000Z'),
    payload,
  };
}

describe('readJaObservationSnapshot — cloisonnement', () => {
  beforeEach(() => {
    prisma.protocolDraft.findFirst.mockReset();
  });

  // Un `draftId` seul laisserait lire l'instantané d'un autre patient à qui
  // saurait le deviner : le patient DOIT être dans le filtre, pas seulement
  // dans la garde d'appartenance de la route.
  it('filtre sur le patient autant que sur l’identifiant', async () => {
    prisma.protocolDraft.findFirst.mockResolvedValue(null);
    await readJaObservationSnapshot('PAT_A', 'JA_1');

    const where = prisma.protocolDraft.findFirst.mock.calls[0][0].where;
    expect(where.id).toBe('JA_1');
    expect(where.idPatient).toBe('PAT_A');
    expect(where.contractVersion).toBeDefined();
    expect(where.selectedPriorityId).toBeDefined();
  });

  it('rend null quand la ligne n’est pas celle de ce patient', async () => {
    prisma.protocolDraft.findFirst.mockResolvedValue(null);
    expect(await readJaObservationSnapshot('PAT_A', 'JA_AUTRE')).toBeNull();
  });

  it('rend null sur un identifiant vide, sans interroger la base', async () => {
    expect(await readJaObservationSnapshot('PAT_A', '   ')).toBeNull();
    expect(prisma.protocolDraft.findFirst).not.toHaveBeenCalled();
  });
});

describe('readJaObservationSnapshot — relecture des éléments', () => {
  beforeEach(() => {
    prisma.protocolDraft.findFirst.mockReset();
  });

  it('rend le contenu, mot libre compris', async () => {
    prisma.protocolDraft.findFirst.mockResolvedValue(ligne({ actor: 'patient', traces: [TRACE] }));
    const detail = await readJaObservationSnapshot('PAT_A', 'JA_1');
    expect(detail?.traces[0].motLibre).toBe('plus simple la veille');
    expect(detail?.elementsEcartes).toBe(0);
  });

  // Une assertion de type ne lève jamais : sans relecture réelle, un champ
  // inattendu traversait jusqu'à React et faisait disparaître tout le panneau.
  it('écarte un élément illisible plutôt que de le laisser passer', async () => {
    prisma.protocolDraft.findFirst.mockResolvedValue(
      ligne({
        actor: 'patient',
        traces: [TRACE, { ...TRACE, traceId: 't2', localDate: { bizarre: true } }, 42, null],
      }),
    );
    const detail = await readJaObservationSnapshot('PAT_A', 'JA_1');
    expect(detail?.traces).toHaveLength(1);
    expect(detail?.elementsEcartes).toBe(3);
    // Le décompte reste celui du payload : l'écart est visible, pas masqué.
    expect(detail?.tracesCount).toBe(4);
  });

  it('écarte une journée illisible sans perdre son décompte', async () => {
    prisma.protocolDraft.findFirst.mockResolvedValue(
      ligne({ actor: 'patient', journees: [{ pas: 'une journée' }] }),
    );
    const detail = await readJaObservationSnapshot('PAT_A', 'JA_1');
    expect(detail?.journees).toHaveLength(0);
    expect(detail?.journeesCount).toBe(1);
    expect(detail?.elementsEcartes).toBe(1);
  });

  it('ne casse pas sur une liste absente', async () => {
    prisma.protocolDraft.findFirst.mockResolvedValue(ligne({ actor: 'patient' }));
    const detail = await readJaObservationSnapshot('PAT_A', 'JA_1');
    expect(detail?.traces).toEqual([]);
    expect(detail?.plans).toEqual([]);
    expect(detail?.elementsEcartes).toBe(0);
  });

  it('relit un plan minimal et refuse une durée hors registre', async () => {
    prisma.protocolDraft.findFirst.mockResolvedValue(
      ligne({
        actor: 'patient',
        plans: [
          { eventId: 'p1', episodeId: 'e', from: '2026-07-28', dureeJours: 3, activatedBy: 'patient' },
          { eventId: 'p2', episodeId: 'e', from: '2026-07-29', dureeJours: 4, activatedBy: 'patient' },
        ],
      }),
    );
    const detail = await readJaObservationSnapshot('PAT_A', 'JA_1');
    expect(detail?.plans).toHaveLength(1);
    expect(detail?.elementsEcartes).toBe(1);
  });
});
