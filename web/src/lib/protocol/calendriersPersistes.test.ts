import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    protocolDiffusionApproval: { findMany: vi.fn() },
    assessmentEpisode: { findMany: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { DIFFUSION_CONFIRMATION } from './diffusion';
import { calendrierDuProtocoleDiffuse, lireCalendriersSuivi } from './calendriersPersistes';

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
    protocolDraftId: `v-${id}`,
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

describe('calendrierDuProtocoleDiffuse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.assessmentEpisode.findMany.mockResolvedValue([
      { id: 'ep-T0', cycleId: 'ep-T0', milestone: 'T0', confirmedAt: jour(0) },
    ]);
  });

  it('rend le jour 0 du cycle de la diffusion active, et les versions diffusées depuis', async () => {
    prisma.protocolDiffusionApproval.findMany.mockResolvedValue([
      approbation('a', 10, 'PRIO-A'),
      approbation('b', 20, 'PRIO-A'),
    ]);

    const calendrier = await calendrierDuProtocoleDiffuse('PAT_1', {
      approbationId: 'b',
      approvedAt: jour(20),
      protocolDraftId: 'v-b',
    });

    expect(calendrier).toEqual({ jourZero: jour(10), versionIds: ['v-a', 'v-b'] });
    // Borné à l'approbation active : un pivot publié entre les deux lectures
    // ne lui donne pas son jour 0.
    expect(prisma.protocolDiffusionApproval.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { idPatient: 'PAT_1', approvedAt: { lte: jour(20) } } }),
    );
  });

  it('se replie aussi quand la version servie n’appartient pas au calendrier rendu', async () => {
    const avertissement = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Un pivot de même instant que l'approbation active : la borne le laisse
    // entrer, et le calendrier rendu n'est plus celui de la version servie.
    prisma.protocolDiffusionApproval.findMany.mockResolvedValue([
      approbation('a', 10, 'PRIO-A'),
      { ...approbation('b', 10, 'PRIO-B'), createdAt: new Date(jour(10).getTime() + 1) },
    ]);

    const calendrier = await calendrierDuProtocoleDiffuse('PAT_1', {
      approbationId: 'a',
      approvedAt: jour(10),
      protocolDraftId: 'v-a',
    });

    expect(calendrier).toEqual({ jourZero: jour(10), versionIds: ['v-a'] });
    expect(avertissement).toHaveBeenCalledOnce();
    avertissement.mockRestore();
  });

  it('se replie sur l’approbation active quand son calendrier ne se résout pas', async () => {
    const avertissement = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Aucune ancre : la diffusion n'est rattachée à aucun cycle.
    prisma.assessmentEpisode.findMany.mockResolvedValue([]);
    const orpheline = approbation('a', 10, 'PRIO-A');
    orpheline.draft.episode = null as never;
    prisma.protocolDiffusionApproval.findMany.mockResolvedValue([orpheline]);

    const calendrier = await calendrierDuProtocoleDiffuse('PAT_1', {
      approbationId: 'a',
      approvedAt: jour(10),
      protocolDraftId: 'v-a',
    });

    expect(calendrier).toEqual({ jourZero: jour(10), versionIds: ['v-a'] });
    expect(avertissement).toHaveBeenCalledOnce();
    avertissement.mockRestore();
  });
});
