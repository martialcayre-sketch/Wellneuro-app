import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    protocolDiffusionApproval: { findMany: vi.fn() },
    assessmentEpisode: { findMany: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { DIFFUSION_CONFIRMATION } from './diffusion';
import { lireCalendriersSuivi } from './calendriersPersistes';

// Ce que ce banc défend ([[D-255]]) : la lecture prend TOUTES les approbations
// du dossier, jointes à leur version et à l'épisode de celle-ci, et borne la
// lecture datée des deux côtés.

const jour = (n: number) => new Date(Date.UTC(2026, 8, 1 + n, 10, 0, 0));

function approbation(id: string, jourApprobation: number, priorite: string, idPatient = 'PAT_1') {
  return {
    id,
    approvedAt: jour(jourApprobation),
    createdAt: jour(jourApprobation),
    approvedBy: 'practitioner',
    confirmation: DIFFUSION_CONFIRMATION,
    decisionCardInputHash: `carte-${id}`,
    protocolDraftInputHash: `version-${id}`,
    draft: {
      idPatient,
      inputHash: `version-${id}`,
      decisionCardInputHash: `carte-${id}`,
      status: 'practitioner_reviewed',
      reviewedAt: new Date(jour(jourApprobation).getTime() - 60_000),
      selectedPriorityId: priorite,
      episode: { id: 'ep-T0', milestone: 'T0', cycleId: 'ep-T0' },
    },
  };
}

describe('lireCalendriersSuivi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.assessmentEpisode.findMany.mockResolvedValue([
      { id: 'ep-T0', cycleId: 'ep-T0', milestone: 'T0', confirmedAt: jour(0) },
    ]);
  });

  it('lit toutes les approbations du dossier, supplantées comprises, sans filtre de tête', async () => {
    prisma.protocolDiffusionApproval.findMany.mockResolvedValue([
      approbation('a', 10, 'PRIO-A'),
      approbation('b', 20, 'PRIO-A'),
    ]);

    const { parCycle } = await lireCalendriersSuivi('PAT_1');

    expect(prisma.protocolDiffusionApproval.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { idPatient: 'PAT_1' } }),
    );
    // La tête de chaîne est `b` ; le jour 0 reste la première diffusion.
    expect(parCycle.get('ep-T0')).toMatchObject({ jourZero: jour(10), approbationId: 'a', relance: false });
  });

  it('borne la lecture datée sur les approbations comme sur les ancres', async () => {
    prisma.protocolDiffusionApproval.findMany.mockResolvedValue([]);
    const asOf = jour(15);

    await lireCalendriersSuivi('PAT_1', asOf);

    expect(prisma.protocolDiffusionApproval.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { idPatient: 'PAT_1', approvedAt: { lte: asOf } } }),
    );
    expect(prisma.assessmentEpisode.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ confirmedAt: { lte: asOf } }) }),
    );
  });

  it('joint la priorité et l’épisode de la version diffusée', async () => {
    prisma.protocolDiffusionApproval.findMany.mockResolvedValue([
      approbation('a', 10, 'PRIO-A'),
      approbation('b', 30, 'PRIO-B'),
    ]);

    const { parCycle } = await lireCalendriersSuivi('PAT_1');

    const requete = prisma.protocolDiffusionApproval.findMany.mock.calls[0][0];
    expect(requete.select.draft.select).toMatchObject({
      selectedPriorityId: true,
      episode: { select: { id: true, milestone: true, cycleId: true } },
    });
    expect(parCycle.get('ep-T0')).toMatchObject({ jourZero: jour(30), prioriteId: 'PRIO-B', relance: true });
  });

  it('écarte une version qui appartient à un autre dossier', async () => {
    prisma.protocolDiffusionApproval.findMany.mockResolvedValue([
      approbation('a', 10, 'PRIO-A', 'PAT_AUTRE'),
      approbation('b', 20, 'PRIO-A'),
    ]);

    const { parCycle } = await lireCalendriersSuivi('PAT_1');

    expect(parCycle.get('ep-T0')).toMatchObject({ jourZero: jour(20), approbationId: 'b' });
  });
});
