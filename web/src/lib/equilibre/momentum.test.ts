import { describe, it, expect } from 'vitest';
import { calculerDeltaMomentum, resoudreLectureJalon } from './momentum';
import type { LectureDatee } from './types';

describe('momentum — tracking et delta', () => {
  const jours = (n: number): number => n * 24 * 60 * 60 * 1000;
  const dateT0 = new Date('2026-01-01T00:00:00.000Z');

  it('aucune lecture à ±20j du jalon (tolérance ±8j) ne doit résoudre', () => {
    const lecturesLoin: LectureDatee[] = [
      { date: new Date(dateT0.getTime() + jours(21) + jours(20)), valeur: 60 },
    ];
    const result = resoudreLectureJalon(dateT0, 'J21', lecturesLoin);
    expect(result).toBeNull();
  });

  it('une lecture à +5j du centre J21 doit être résolue', () => {
    const lectureDansFenetre: LectureDatee = { date: new Date(dateT0.getTime() + jours(21) + jours(5)), valeur: 55 };
    const resolue = resoudreLectureJalon(dateT0, 'J21', [lectureDansFenetre]);
    expect(resolue?.valeur).toBe(55);
  });

  it('avec deux lectures valides, celle la plus proche du centre gagne', () => {
    const lecturesConcurrentes: LectureDatee[] = [
      { date: new Date(dateT0.getTime() + jours(21) - jours(7)), valeur: 40 },
      { date: new Date(dateT0.getTime() + jours(21) + jours(2)), valeur: 70 },
    ];
    const gagnante = resoudreLectureJalon(dateT0, 'J21', lecturesConcurrentes);
    expect(gagnante?.valeur).toBe(70);
  });

  it('delta positif → tendance hausse', () => {
    const hausse = calculerDeltaMomentum(
      { date: dateT0, valeur: 40 },
      { date: new Date(dateT0.getTime() + jours(21)), valeur: 55 }
    );
    expect(hausse?.delta).toBe(15);
    expect(hausse?.tendance).toBe('hausse');
  });

  it('une des deux lectures absente → delta null', () => {
    const result = calculerDeltaMomentum(null, { date: dateT0, valeur: 55 });
    expect(result).toBeNull();
  });
});
