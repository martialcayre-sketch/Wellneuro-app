import { describe, expect, it } from 'vitest';
import type { Trajectoire } from './trajectoire';
import { resumerTrajectoire } from './resumeTrajectoire';

const AUJOURDHUI = new Date('2026-01-15T00:00:00.000Z');

function trajectoire(cycles: Trajectoire['cycles']): Trajectoire {
  return { index: [], cycles, comparaison: { disponible: false, raison: cycles.length === 0 ? 'aucun_cycle' : 'un_seul_cycle' } };
}

describe('resumerTrajectoire (SP-TRAJ LOT-04)', () => {
  it('sans cycle confirmé : rien d’affirmé, « T0 à confirmer »', () => {
    const resume = resumerTrajectoire(trajectoire([]), AUJOURDHUI);
    expect(resume.episodeEnCours).toBeNull();
    expect(resume.dernierJalonMesure).toBeNull();
    expect(resume.prochaineEcheance).toEqual({ libelle: 'T0 à confirmer', date: null });
  });

  it('cycle en cours : numéro d’épisode, position en jours, dernier jalon mesuré, prochaine échéance datée', () => {
    const resume = resumerTrajectoire(
      trajectoire([
        {
          cycleId: 'c1',
          dateT0: '2026-01-01T00:00:00.000Z',
          versionScore: 'v1',
          jalons: [
            { jalon: 'T0', mesure: true, valeur: 40, date: '2026-01-01T00:00:00.000Z' },
            { jalon: 'J21', mesure: false, valeur: null, date: null },
            { jalon: 'J42', mesure: false, valeur: null, date: null },
            { jalon: 'J90', mesure: false, valeur: null, date: null },
          ],
          momentum: null,
        },
      ]),
      AUJOURDHUI,
    );
    expect(resume.episodeEnCours).toEqual({ numero: 1, dateT0: '2026-01-01T00:00:00.000Z', positionJours: 14 });
    expect(resume.dernierJalonMesure).toEqual({ jalon: 'T0', valeur: 40, date: '2026-01-01T00:00:00.000Z' });
    // Prochain jalon non mesuré : J21, à sa date théorique T0 + 21 j.
    expect(resume.prochaineEcheance).toEqual({ libelle: 'J21', date: '2026-01-22T00:00:00.000Z' });
  });

  it('un jalon non mesuré est une échéance, jamais une valeur (A8-2)', () => {
    const resume = resumerTrajectoire(
      trajectoire([
        {
          cycleId: 'c1',
          dateT0: '2026-01-01T00:00:00.000Z',
          versionScore: 'v1',
          jalons: [
            { jalon: 'T0', mesure: true, valeur: 40, date: '2026-01-01T00:00:00.000Z' },
            { jalon: 'J21', mesure: true, valeur: 52, date: '2026-01-22T00:00:00.000Z' },
            { jalon: 'J42', mesure: false, valeur: null, date: null },
            { jalon: 'J90', mesure: false, valeur: null, date: null },
          ],
          momentum: null,
        },
      ]),
      AUJOURDHUI,
    );
    expect(resume.dernierJalonMesure?.jalon).toBe('J21');
    expect(resume.dernierJalonMesure?.valeur).toBe(52);
    expect(resume.prochaineEcheance?.libelle).toBe('J42');
  });

  it('deux cycles : l’épisode en cours est le dernier T0 confirmé', () => {
    const resume = resumerTrajectoire(
      trajectoire([
        {
          cycleId: 'c1',
          dateT0: '2025-03-01T00:00:00.000Z',
          versionScore: 'v1',
          jalons: [{ jalon: 'T0', mesure: true, valeur: 30, date: '2025-03-01T00:00:00.000Z' }],
          momentum: null,
        },
        {
          cycleId: 'c2',
          dateT0: '2026-01-10T00:00:00.000Z',
          versionScore: 'v1',
          jalons: [{ jalon: 'T0', mesure: true, valeur: 44, date: '2026-01-10T00:00:00.000Z' }],
          momentum: null,
        },
      ]),
      AUJOURDHUI,
    );
    expect(resume.episodeEnCours?.numero).toBe(2);
    expect(resume.episodeEnCours?.positionJours).toBe(5);
  });
});
