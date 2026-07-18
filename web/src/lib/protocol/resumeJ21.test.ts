import { describe, expect, it } from 'vitest';
import type { LectureDatee } from '@/lib/equilibre/types';
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

  it('croise le score via momentum.ts (point de jonction) quand des lectures existent', () => {
    const dateT0 = new Date('2026-01-01T00:00:00.000Z');
    const lectures: LectureDatee[] = [
      { date: dateT0, valeur: 40 },
      { date: new Date('2026-01-22T00:00:00.000Z'), valeur: 55 }, // ~J21
    ];

    const resume = buildResumeJ21({
      checkins: [checkin('c1', 'J21', '2026-01-22T00:00:00.000Z')],
      momentum: { dateT0, lectures },
    });

    expect(resume.score).toEqual({ tendance: 'hausse', delta: 15 });
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
});
