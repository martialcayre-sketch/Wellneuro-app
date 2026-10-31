import { beforeEach, describe, expect, it, vi } from 'vitest';

// BANC T-2 ([[D-397]] §8) — le banc de [[D-058]] réécrit : portail, cockpit et
// fil, client et serveur, donnent la même référence et les mêmes bornes depuis
// le jour 0, à la milliseconde. Le jour 0 porte des millisecondes et diffère
// de l'ancre : un calcul qui compterait depuis l'ancre, ou qui arrondirait au
// jour, rougit ici.
//
// L'onglet Équilibre (`api/praticien/equilibre`) appelle le même
// `calculerMomentumDuCycle` sur la même ancre et le même jour 0 : son banc de
// route vérifie la référence et l'arrivée à leur date.

const { prisma, jourZeroDuCycleCourant } = vi.hoisted(() => ({
  prisma: {
    questionnaireReponse: { findMany: vi.fn() },
    assessmentEpisode: { findMany: vi.fn() },
  },
  jourZeroDuCycleCourant: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/protocol/calendriersPersistes', () => ({ jourZeroDuCycleCourant }));

import type { ReponseBrute } from './depuisPrisma';
import { lireEquilibrePatient } from './lecturePatient';
import { calculerMomentumDuCycle } from './momentumDuCycle';
import { etiquetteLecture } from './momentumParBesoin';
import { refusJalonMesureHorsFenetre, resoudreJalonDu } from '@/lib/protocol/jalonDu';
import { construireTrajectoire, type TrajectoireEpisode } from '@/lib/protocol/trajectoire';

const JOUR = 24 * 60 * 60 * 1000;
const ANCRE_T0 = new Date('2026-01-10T09:00:00.000Z');
const JOUR_ZERO = new Date('2026-01-12T14:30:07.123Z');
const apresZero = (jours: number, ms = 0) => new Date(JOUR_ZERO.getTime() + jours * JOUR + ms);

const pss = (valeur: string) =>
  Object.fromEntries(['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10'].map(id => [id, valeur]));
const passation = (date: Date, valeur: string): ReponseBrute => ({
  idQuestionnaire: 'Q_STR_02',
  dateReponse: date,
  scoresJson: { rawAnswers: pss(valeur) },
  statutValidite: null,
});
const episode = (id: string, milestone: 'T0' | 'T1', confirmedAt: Date): TrajectoireEpisode => ({
  id,
  milestone,
  confirmedAt,
  cycleId: id,
  versionScore: 'v1',
});

/** Première réponse haute, bilan d'ancre bas, J21 et remesure libre. */
const REPONSES = [
  passation(new Date(ANCRE_T0.getTime() - 40 * JOUR), '3'),
  passation(new Date(ANCRE_T0.getTime() - 60_000), '1'),
  passation(apresZero(21), '2'),
  passation(apresZero(33), '3'),
];

describe('une seule date de départ — portail, cockpit, fil (D-397 §1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.questionnaireReponse.findMany.mockResolvedValue(REPONSES);
    prisma.assessmentEpisode.findMany.mockResolvedValue([
      { id: 'ep_T0', cycleId: 'ep_T0', confirmedAt: ANCRE_T0, milestone: 'T0' },
    ]);
    jourZeroDuCycleCourant.mockResolvedValue(JOUR_ZERO);
  });

  it('même référence, même arrivée, même écart, même tendance', async () => {
    const direct = calculerMomentumDuCycle({
      reponses: REPONSES,
      ancre: { ancre: 'T0', date: ANCRE_T0 },
      jourZero: JOUR_ZERO,
    });
    if (direct.statut !== 'disponible') throw new Error('attendu : disponible');
    expect(direct.depart.date.getTime()).toBe(ANCRE_T0.getTime());
    expect(direct.arrivee.date.getTime()).toBe(apresZero(33).getTime());

    // Cockpit et fil : le cycle courant de la trajectoire (le fil lit `cycles.at(-1)`).
    const trajectoire = construireTrajectoire({
      episodes: [episode('ep_T0', 'T0', ANCRE_T0)],
      reponses: REPONSES,
      joursZero: new Map([['ep_T0', JOUR_ZERO]]),
    });
    const courant = trajectoire.cycles.at(-1);
    expect(courant?.momentum).toEqual({
      tendance: direct.tendance,
      delta: direct.delta,
      dateArrivee: direct.arrivee.date.toISOString(),
    });

    // Portail (et aperçu praticien) : la tendance seule, du même calcul.
    const portail = await lireEquilibrePatient('PAT_1');
    expect(portail.momentum).toEqual({ tendance: direct.tendance });
    expect(portail.motifMomentum).toBeNull();
  });

  it('les bornes du J21 tombent au jour 0 + 13 j et + 29 j, à la milliseconde — client et serveur', () => {
    const trajectoire = construireTrajectoire({
      episodes: [episode('ep_T0', 'T0', ANCRE_T0)],
      reponses: REPONSES,
      joursZero: new Map([['ep_T0', JOUR_ZERO]]),
    });
    const ouverture = apresZero(13);
    const fermeture = apresZero(29);

    // Cockpit, client : le jalon proposé.
    expect(resoudreJalonDu(trajectoire, ouverture)).toMatchObject({ statut: 'du', jalon: 'J21', ouvertLe: ouverture.toISOString() });
    expect(resoudreJalonDu(trajectoire, apresZero(13, -1))).not.toMatchObject({ statut: 'du' });
    expect(resoudreJalonDu(trajectoire, fermeture)).toMatchObject({ statut: 'du', jalon: 'J21' });

    // Serveur : la garde de confirmation.
    const cycle = trajectoire.cycles[0];
    expect(refusJalonMesureHorsFenetre('J21', cycle, ouverture)).toBeNull();
    expect(refusJalonMesureHorsFenetre('J21', cycle, apresZero(13, -1))).not.toBeNull();
    expect(refusJalonMesureHorsFenetre('J21', cycle, fermeture)).toBeNull();
    expect(refusJalonMesureHorsFenetre('J21', cycle, apresZero(29, 1))).not.toBeNull();

    // Les lectures par besoin : même fenêtre pour l'étiquette.
    expect(etiquetteLecture(ouverture, JOUR_ZERO)).toBe('J21');
    expect(etiquetteLecture(apresZero(13, -1), JOUR_ZERO)).toBe('remesure');
    expect(etiquetteLecture(fermeture, JOUR_ZERO)).toBe('J21');
    expect(etiquetteLecture(apresZero(29, 1), JOUR_ZERO)).toBe('remesure');

    // La lecture du J21 de la trajectoire, au centre exact.
    expect(cycle.jalons.find(j => j.jalon === 'J21')?.date).toBe(apresZero(21).toISOString());
  });
});

describe('dossier rouvert : le momentum part de l’ancre T1, aucune paire T0–T1 (D-397 §6)', () => {
  const ANCRE_T1 = new Date('2026-05-01T09:00:00.000Z');
  const JOUR_ZERO_T1 = new Date('2026-05-03T10:00:00.000Z');
  const reponsesRouvert = [...REPONSES, passation(new Date(ANCRE_T1.getTime() - 60_000), '1')];

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.assessmentEpisode.findMany.mockResolvedValue([
      { id: 'ep_T0', cycleId: 'ep_T0', confirmedAt: ANCRE_T0, milestone: 'T0' },
      { id: 'ep_T1', cycleId: 'ep_T1', confirmedAt: ANCRE_T1, milestone: 'T1' },
    ]);
    jourZeroDuCycleCourant.mockResolvedValue(JOUR_ZERO_T1);
  });

  it('sans passation après T1 : « sans remesure », malgré les mesures du cycle T0', async () => {
    prisma.questionnaireReponse.findMany.mockResolvedValue(reponsesRouvert);
    const trajectoire = construireTrajectoire({
      episodes: [episode('ep_T0', 'T0', ANCRE_T0), episode('ep_T1', 'T1', ANCRE_T1)],
      reponses: reponsesRouvert,
      joursZero: new Map([['ep_T0', JOUR_ZERO], ['ep_T1', JOUR_ZERO_T1]]),
    });
    const t1 = trajectoire.cycles.at(-1);
    expect(t1?.ancre).toBe('T1');
    expect(t1?.momentum).toBeNull();
    expect(t1?.motifMomentum).toBe('sans_remesure');
    // Le cycle T0 reste dans la trajectoire, avec sa lecture historique.
    expect(trajectoire.cycles[0].momentum).not.toBeNull();

    const portail = await lireEquilibrePatient('PAT_1');
    expect(portail.momentum).toBeNull();
    expect(portail.motifMomentum).toBe('sans_remesure');
  });

  it('avec une remesure après T1 : la référence est la lecture d’ancre T1', () => {
    const remesure = new Date('2026-06-10T08:00:00.000Z');
    const reponses = [...reponsesRouvert, passation(remesure, '3')];
    const trajectoire = construireTrajectoire({
      episodes: [episode('ep_T0', 'T0', ANCRE_T0), episode('ep_T1', 'T1', ANCRE_T1)],
      reponses,
      joursZero: new Map([['ep_T0', JOUR_ZERO], ['ep_T1', JOUR_ZERO_T1]]),
    });
    const direct = calculerMomentumDuCycle({ reponses, ancre: { ancre: 'T1', date: ANCRE_T1 }, jourZero: JOUR_ZERO_T1 });
    if (direct.statut !== 'disponible') throw new Error('attendu : disponible');
    expect(direct.depart.date.getTime()).toBe(ANCRE_T1.getTime());
    expect(trajectoire.cycles.at(-1)?.momentum).toEqual({
      tendance: direct.tendance,
      delta: direct.delta,
      dateArrivee: remesure.toISOString(),
    });
  });
});
