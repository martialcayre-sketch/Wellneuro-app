import { describe, expect, it } from 'vitest';
import { calculateScore } from '@/lib/questions';
import { IDS_ASSIGNABLES } from '@/lib/bibliotheque';
import { AGENDA_SOMMEIL_ID } from './types';

// Le scoring `agenda_sommeil` lit les agrégats rangés dans rawAnswers. On le
// teste via le point d'entrée public `calculateScore` (id + answers), comme le
// fait le moteur d'équilibre.

describe('assignabilité Q_SOM_09', () => {
  it('Q_SOM_09 est assignable (intersection catalogue affichage ∩ définitions)', () => {
    expect(IDS_ASSIGNABLES).toContain(AGENDA_SOMMEIL_ID);
  });
});

describe('scoring agenda_sommeil', () => {
  it('recueil transmis sans agrégation sous 5 nuits (scored:false)', () => {
    const r = calculateScore(AGENDA_SOMMEIL_ID, { AGD_NB_NUITS: 3 });
    expect(r.scored).toBe(false);
    expect(r.nbNuits).toBe(3);
    expect(r.total).toBeUndefined();
  });

  it('sommeil satisfaisant : durée/efficacité/continuité/régularité au plateau → 100', () => {
    const r = calculateScore(AGENDA_SOMMEIL_ID, {
      AGD_NB_NUITS: 21,
      AGD_TST_MOY: 470, // dans [420,540]
      AGD_EFF_MOY: 95, // ≥85
      AGD_LAT_MED: 10, // ≤15
      AGD_REV_MOY: 0.5, // ≤1
      AGD_REG_ECT: 20, // ≤30
    });
    expect(r.scored).toBe(true);
    expect(r.total).toBe(100);
    expect(r.interpretation.label).toBe('Sommeil globalement satisfaisant');
    expect(r.subScores).toHaveLength(4);
  });

  it('sommeil nettement perturbé : hors plateau → bande danger', () => {
    const r = calculateScore(AGENDA_SOMMEIL_ID, {
      AGD_NB_NUITS: 12,
      AGD_TST_MOY: 300, // court
      AGD_EFF_MOY: 68, // faible
      AGD_LAT_MED: 55, // longue
      AGD_REV_MOY: 2.8, // nombreux
      AGD_REG_ECT: 110, // très irrégulier
    });
    expect(r.scored).toBe(true);
    expect(r.total).toBeLessThan(50);
    expect(r.interpretation.color).toBe('danger');
  });

  it('total borné à [0,100] même avec des valeurs extrêmes', () => {
    const r = calculateScore(AGENDA_SOMMEIL_ID, {
      AGD_NB_NUITS: 21,
      AGD_TST_MOY: 60,
      AGD_EFF_MOY: 10,
      AGD_LAT_MED: 120,
      AGD_REV_MOY: 3,
      AGD_REG_ECT: 360,
    });
    expect(r.total).toBeGreaterThanOrEqual(0);
    expect(r.total).toBeLessThanOrEqual(100);
  });
});
