import { describe, expect, it } from 'vitest';
import type { ReponseBrute } from '@/lib/equilibre/depuisPrisma';
import { calculerMomentumDuCycle } from '@/lib/equilibre/momentumDuCycle';
import { buildResumeJ21 } from './resumeJ21';
import type { CheckinReponses, CheckinRow, PointEtape } from './checkinDomain';

const reponses: CheckinReponses = {
  adhesion: 'plupart_des_jours',
  tolerance: 'bien',
  energie: 'stable',
  sommeil: 'mieux',
};

const checkin = (id: string, pointEtape: PointEtape, iso: string, supersedes: string | null = null): CheckinRow => ({
  id,
  idPatient: 'PAT_1',
  idAssignation: 'ASS_1',
  protocolDraftId: 'proto_DEC_1#h',
  pointEtape,
  reponses,
  canal: 'portail',
  supersedesCheckinId: supersedes,
  soumisLe: iso,
});

describe('buildResumeJ21', () => {
  it('résume les points d’étape renseignés sans momentum (score null)', () => {
    const resume = buildResumeJ21({
      checkins: [checkin('c1', 'J7', '2026-01-08T00:00:00.000Z'), checkin('c2', 'J21', '2026-01-22T00:00:00.000Z')],
    });

    expect(resume.score).toBeNull();
    expect(resume.pointsRenseignes).toBe(2);
    expect(resume.points.find((p) => p.pointEtape === 'J14')?.renseigne).toBe(false);
    expect(resume.points.find((p) => p.pointEtape === 'J7')?.reponses).toEqual(reponses);
  });

  // Le score est le momentum du cycle courant, le même calcul que les autres
  // surfaces ([[D-397]], contre-revue Codex P1-2). Données synthétiques.
  const JOUR = 24 * 60 * 60 * 1000;
  const ANCRE = new Date('2026-01-01T09:00:00.000Z');
  const JOUR_ZERO = new Date('2026-01-03T09:00:00.000Z');
  const apresZero = (jours: number) => new Date(JOUR_ZERO.getTime() + jours * JOUR);
  const items = (prefixe: string, ids: number[], valeur: string) =>
    Object.fromEntries(ids.map((n) => [`${prefixe}${n}`, valeur]));
  const pss = (date: Date, valeur: string): ReponseBrute => ({
    idQuestionnaire: 'Q_STR_02',
    dateReponse: date,
    scoresJson: { rawAnswers: items('P', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], valeur) },
    statutValidite: null,
  });
  const had = (date: Date, valeur: string): ReponseBrute => ({
    idQuestionnaire: 'Q_NEU_11',
    dateReponse: date,
    scoresJson: { rawAnswers: items('D', [2, 4, 6, 8, 10, 12, 14], valeur) },
    statutValidite: null,
  });
  const momentumDe = (reponses: ReponseBrute[], jourZero: Date | null = JOUR_ZERO) =>
    calculerMomentumDuCycle({ reponses, ancre: { ancre: 'T0', date: ANCRE }, jourZero, maintenant: apresZero(60) });
  const avantAncre = new Date(ANCRE.getTime() - 60_000);

  it('reprend le momentum du cycle courant tel quel, arrivée à la dernière remesure (Q5)', () => {
    const momentum = momentumDe([pss(avantAncre, '1'), pss(apresZero(21), '2'), pss(apresZero(33), '3')]);
    if (momentum.statut !== 'disponible') throw new Error('attendu : disponible');
    expect(momentum.arrivee.date).toEqual(apresZero(33));
    const resume = buildResumeJ21({ checkins: [checkin('c1', 'J21', '2026-01-24T00:00:00.000Z')], momentum });
    expect(resume.score).toEqual({ tendance: momentum.tendance, delta: momentum.delta });
  });

  it('la première passation d’un questionnaire absent à l’ancre ne donne aucun score', () => {
    // PSS seul à l'ancre, premier HADS à J15, rien de repassé : l'ancienne
    // paire ancre → J21 annonçait une baisse ; le calcul commun, aucune.
    const momentum = momentumDe([pss(avantAncre, '1'), had(apresZero(15), '3')]);
    expect(momentum).toEqual({ statut: 'absent', motif: 'sans_remesure' });
    expect(buildResumeJ21({ checkins: [], momentum }).score).toBeNull();
  });

  it('sans jour 0, aucun score : le repli sur l’ancre est supprimé ([[D-397]] §2)', () => {
    const momentum = momentumDe([pss(avantAncre, '1'), pss(apresZero(21), '3')], null);
    expect(momentum).toEqual({ statut: 'absent', motif: 'sans_jour_zero' });
    expect(buildResumeJ21({ checkins: [checkin('c1', 'J21', '2026-01-22T00:00:00.000Z')], momentum }).score).toBeNull();
  });

  it('retient la correction (tête de chaîne) d’un point d’étape', () => {
    const resume = buildResumeJ21({
      checkins: [
        checkin('c1', 'J7', '2026-01-08T00:00:00.000Z'),
        { ...checkin('c2', 'J7', '2026-01-09T00:00:00.000Z', 'c1'), reponses: { ...reponses, adhesion: 'tous_les_jours' } },
      ],
    });

    expect(resume.points.find((p) => p.pointEtape === 'J7')?.reponses?.adhesion).toBe('tous_les_jours');
  });
  // J2-jourN (H52) : les marques E4 (`D-334` §2) et le jour du cycle.
  describe('marques E4 et jour du cycle', () => {
    const JOUR_ZERO = new Date('2026-01-01T10:00:00.000Z');
    const a = (jours: number) => new Date(JOUR_ZERO.getTime() + jours * 24 * 60 * 60 * 1000);

    it('sans jour 0 : ni jour du cycle ni marque, même avec une réponse', () => {
      const resume = buildResumeJ21({ checkins: [checkin('c1', 'J7', '2026-01-08T00:00:00.000Z')], maintenant: a(8) });
      expect(resume.suivi).toBeNull();
      expect(resume.points.map((p) => p.marque)).toEqual([null, null, null]);
    });

    it('une réponse fait la marque, datée ; sinon l’état de la fenêtre du portail', () => {
      const resume = buildResumeJ21({
        checkins: [checkin('c1', 'J7', '2026-01-08T09:00:00.000Z')],
        jourZero: JOUR_ZERO,
        maintenant: a(12),
      });
      expect(resume.points).toEqual([
        expect.objectContaining({ pointEtape: 'J7', marque: 'repondu', soumisLe: '2026-01-08T09:00:00.000Z' }),
        expect.objectContaining({ pointEtape: 'J14', marque: 'en_cours', soumisLe: null }),
        expect.objectContaining({ pointEtape: 'J21', marque: 'a_venir', soumisLe: null }),
      ]);
      expect(resume.suivi).toEqual({ jourZero: JOUR_ZERO.toISOString(), jour: 12 });
    });

    it('une fenêtre passée sans réponse dit « pas de réponse », jamais un niveau', () => {
      const resume = buildResumeJ21({ checkins: [], jourZero: JOUR_ZERO, maintenant: a(19) });
      expect(resume.points.map((p) => p.marque)).toEqual(['pas_de_reponse', 'pas_de_reponse', 'en_cours']);
      expect(resume.points.every((p) => p.reponses === null)).toBe(true);
    });

    it('après la fenêtre J21 : trois marques passées', () => {
      const resume = buildResumeJ21({ checkins: [], jourZero: JOUR_ZERO, maintenant: a(25) });
      expect(resume.points.map((p) => p.marque)).toEqual(['pas_de_reponse', 'pas_de_reponse', 'pas_de_reponse']);
      expect(resume.suivi?.jour).toBe(25);
    });
  });
});
