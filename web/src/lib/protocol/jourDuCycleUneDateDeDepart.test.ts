import { beforeEach, describe, expect, it, vi } from 'vitest';

// BANC J2-jourN (H52) — « une seule date de départ partout ». Le jour du cycle
// et les marques E4 du cockpit (route `praticien/protocoles/checkins`, via
// `buildResumeJ21`) partent du même jour 0, à la milliseconde, que :
//   - le point ouvert du check-in au portail (`calendrierDuProtocoleDiffuse`
//     puis `pointEtapeCourant`, route `portail/protocole/checkin`) ;
//   - les jalons du momentum ([[D-397]] §1, `jourZeroDuCycleCourant`).
// Le jour 0 porte des millisecondes : un calcul qui arrondirait au jour, ou
// qui compterait depuis la dernière rediffusion, rougit ici.
//
// EXCEPTION CONNUE, ÉPINGLÉE (périmètre A, arbitrage du 2026-11-01) : sur un
// dossier rouvert dont le nouveau cycle n'a pas encore de diffusion, le portail
// compte encore depuis le jour 0 du cycle précédent ; le cockpit n'affiche ni
// jour ni marque. Le repli `approvedAt` de `calendrierDuProtocoleDiffuse`
// reste hors du lot (jamais constaté en production).

const { prisma } = vi.hoisted(() => ({
  prisma: {
    protocolDiffusionApproval: { findMany: vi.fn() },
    assessmentEpisode: { findMany: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { ancreCourante, lireAncresPersistees } from './ancresPersistees';
import { calendrierDuProtocoleDiffuse, jourZeroDuCycleCourant, lireCalendriersSuivi } from './calendriersPersistes';
import { pointEtapeCourant, POINTS_ETAPE } from './checkinDomain';
import { DIFFUSION_CONFIRMATION } from './diffusion';
import { buildResumeJ21 } from './resumeJ21';

const JOUR = 24 * 60 * 60 * 1000;
const ANCRE_T0 = new Date('2026-10-12T09:00:00.000Z');
const DIFFUSION = new Date('2026-10-14T16:56:42.123Z');

function approbation(id: string, approuveLe: Date, priorite: string, cycle = 'ep-T0') {
  return {
    id,
    idPatient: 'PAT_1',
    approvedAt: approuveLe,
    createdAt: approuveLe,
    approvedBy: 'practitioner',
    confirmation: DIFFUSION_CONFIRMATION,
    decisionCardInputHash: `carte-${id}`,
    protocolDraftInputHash: `version-${id}`,
    protocolDraftId: `v-${id}`,
    draft: {
      idPatient: 'PAT_1',
      inputHash: `version-${id}`,
      decisionCardInputHash: `carte-${id}`,
      status: 'practitioner_reviewed',
      reviewedAt: new Date(approuveLe.getTime() - 60_000),
      selectedPriorityId: priorite,
      episode: { id: cycle, milestone: cycle === 'ep-T0' ? 'T0' : 'T1', cycleId: cycle },
    },
  };
}

const actif = (a: ReturnType<typeof approbation>) => ({
  approbationId: a.id,
  approvedAt: a.approvedAt,
  protocolDraftId: a.protocolDraftId,
});

/** Les trois lectures du jour 0, chacune par le chemin de sa route. */
async function troisLectures(active: ReturnType<typeof approbation>) {
  const ancres = await lireAncresPersistees('PAT_1');
  const ancre = ancreCourante(ancres);
  // Route du cockpit : le calendrier du cycle courant, sans repli.
  const cockpit = ancre
    ? (await lireCalendriersSuivi('PAT_1', null, ancres)).parCycle.get(ancre.cycleId ?? ancre.id)?.jourZero ?? null
    : null;
  return {
    cockpit,
    momentum: await jourZeroDuCycleCourant('PAT_1', ancres),
    portail: (await calendrierDuProtocoleDiffuse('PAT_1', actif(active))).jourZero,
  };
}

/** Des instants autour de chaque borne de fenêtre, à la milliseconde. */
function instantsAuxBornes(jourZero: Date): Date[] {
  return [0, 3, 4, 10, 11, 17, 18, 21, 24, 25].flatMap((jours) =>
    [-1, 0, 1].map((ms) => new Date(jourZero.getTime() + jours * JOUR + ms)),
  );
}

function attendreMarquesAlignees(jourZeroCockpit: Date, jourZeroPortail: Date) {
  for (const maintenant of instantsAuxBornes(jourZeroPortail)) {
    const resume = buildResumeJ21({ checkins: [], jourZero: jourZeroCockpit, maintenant });
    const ouvertAuPortail = pointEtapeCourant(jourZeroPortail, maintenant);
    for (const pointEtape of POINTS_ETAPE) {
      const marque = resume.points.find((p) => p.pointEtape === pointEtape)?.marque;
      expect(marque === 'en_cours', `${pointEtape} à ${maintenant.toISOString()}`).toBe(ouvertAuPortail === pointEtape);
    }
  }
}

describe('J2-jourN : une seule date de départ (H52)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.assessmentEpisode.findMany.mockResolvedValue([
      { id: 'ep-T0', cycleId: 'ep-T0', milestone: 'T0', confirmedAt: ANCRE_T0 },
    ]);
  });

  it('une diffusion : même jour 0 à la milliseconde, même fenêtre ouverte au cockpit et au portail', async () => {
    const a = approbation('a', DIFFUSION, 'PRIO-A');
    prisma.protocolDiffusionApproval.findMany.mockResolvedValue([a]);

    const { cockpit, momentum, portail } = await troisLectures(a);

    expect(cockpit?.getTime()).toBe(DIFFUSION.getTime());
    expect(momentum?.getTime()).toBe(DIFFUSION.getTime());
    expect(portail.getTime()).toBe(DIFFUSION.getTime());
    attendreMarquesAlignees(cockpit!, portail);
  });

  it('rediffusions à la même priorité : le jour 0 reste la première diffusion, partout', async () => {
    const a = approbation('a', DIFFUSION, 'PRIO-A');
    const b = approbation('b', new Date(DIFFUSION.getTime() + 5 * JOUR + 777), 'PRIO-A');
    const c = approbation('c', new Date(DIFFUSION.getTime() + 9 * JOUR + 3), 'PRIO-A');
    prisma.protocolDiffusionApproval.findMany.mockResolvedValue([a, b, c]);

    const { cockpit, momentum, portail } = await troisLectures(c);

    expect(cockpit?.getTime()).toBe(DIFFUSION.getTime());
    expect(momentum?.getTime()).toBe(DIFFUSION.getTime());
    expect(portail.getTime()).toBe(DIFFUSION.getTime());
    attendreMarquesAlignees(cockpit!, portail);
  });

  it('pivot : le jour 0 passe à la diffusion du pivot, partout', async () => {
    const a = approbation('a', DIFFUSION, 'PRIO-A');
    const pivot = approbation('p', new Date(DIFFUSION.getTime() + 8 * JOUR + 451), 'PRIO-B');
    prisma.protocolDiffusionApproval.findMany.mockResolvedValue([a, pivot]);

    const { cockpit, momentum, portail } = await troisLectures(pivot);

    expect(cockpit?.getTime()).toBe(pivot.approvedAt.getTime());
    expect(momentum?.getTime()).toBe(pivot.approvedAt.getTime());
    expect(portail.getTime()).toBe(pivot.approvedAt.getTime());
    attendreMarquesAlignees(cockpit!, portail);
  });

  it('jour du cycle : la convention du calendrier de Paris, Jour 0 le jour de la diffusion', () => {
    const resume = (maintenant: Date) => buildResumeJ21({ checkins: [], jourZero: DIFFUSION, maintenant }).suivi;
    // 14/10 à 18 h 56 à Paris : le soir même est le Jour 0, le lendemain matin le Jour 1.
    expect(resume(new Date('2026-10-14T21:59:59.999Z'))).toEqual({ jourZero: DIFFUSION.toISOString(), jour: 0 });
    expect(resume(new Date('2026-10-14T22:00:00.000Z'))?.jour).toBe(1);
    expect(resume(new Date('2026-11-04T12:00:00.000Z'))?.jour).toBe(21);
    expect(resume(new Date('2026-11-06T12:00:00.000Z'))?.jour).toBe(23);
  });

  it('EXCEPTION ÉPINGLÉE : dossier rouvert sans diffusion sur le nouveau cycle', async () => {
    prisma.assessmentEpisode.findMany.mockResolvedValue([
      { id: 'ep-T0', cycleId: 'ep-T0', milestone: 'T0', confirmedAt: ANCRE_T0 },
      { id: 'ep-T1', cycleId: 'ep-T1', milestone: 'T1', confirmedAt: new Date(DIFFUSION.getTime() + 15 * JOUR) },
    ]);
    const a = approbation('a', DIFFUSION, 'PRIO-A');
    prisma.protocolDiffusionApproval.findMany.mockResolvedValue([a]);

    const { cockpit, momentum, portail } = await troisLectures(a);

    // Cockpit et momentum : le cycle courant n'a pas de jour 0 ([[D-397]] §2).
    expect(cockpit).toBeNull();
    expect(momentum).toBeNull();
    const resume = buildResumeJ21({ checkins: [], jourZero: cockpit, maintenant: new Date(DIFFUSION.getTime() + 16 * JOUR) });
    expect(resume.suivi).toBeNull();
    expect(resume.points.every((p) => p.marque === null)).toBe(true);
    // Portail : le protocole du cycle précédent compte encore depuis son jour 0.
    expect(portail.getTime()).toBe(DIFFUSION.getTime());
  });
});
