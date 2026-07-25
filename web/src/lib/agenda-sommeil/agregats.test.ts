import { describe, expect, it } from 'vitest';
import {
  calculerAgregats,
  compterNuitsPlausibles,
  dureeMinutes,
  minutesDepuisMidi,
} from './agregats';
import type { NuitReponses } from './types';

// Fabrique une nuit express valide, surchargeable.
function nuit(over: Partial<NuitReponses> = {}): NuitReponses {
  return {
    heureCoucher: '23:00',
    heureLever: '07:00',
    latence: 'lt15',
    qualite: 4,
    ...over,
  };
}

describe('dureeMinutes — traversée de minuit', () => {
  it('coucher 23:30 → lever 07:00 = 450 min', () => {
    expect(dureeMinutes('23:30', '07:00')).toBe(450);
  });

  it('coucher 01:00 → lever 07:00 = 360 min (sans traversée)', () => {
    expect(dureeMinutes('01:00', '07:00')).toBe(360);
  });

  it('coucher 22:00 → lever 06:00 = 480 min', () => {
    expect(dureeMinutes('22:00', '06:00')).toBe(480);
  });

  it('heures égales = 0 min (cas dégénéré)', () => {
    expect(dureeMinutes('07:00', '07:00')).toBe(0);
  });
});

describe('minutesDepuisMidi — ancrage anti-minuit', () => {
  it('23:30 et 00:30 restent proches (60 min), jamais ~720 d’écart', () => {
    const a = minutesDepuisMidi('23:30');
    const b = minutesDepuisMidi('00:30');
    expect(Math.abs(b - a)).toBe(60);
  });

  it('midi = 0', () => {
    expect(minutesDepuisMidi('12:00')).toBe(0);
  });
});

describe('calculerAgregats', () => {
  it('retourne null sous 5 nuits plausibles', () => {
    const nuits = Array.from({ length: 4 }, () => nuit());
    expect(calculerAgregats(nuits)).toBeNull();
  });

  it('agrège 5 nuits régulières 23:00→07:00 (TIB 480, latence lt15)', () => {
    const nuits = Array.from({ length: 5 }, () => nuit());
    const a = calculerAgregats(nuits);
    expect(a).not.toBeNull();
    expect(a!.AGD_NB_NUITS).toBe(5);
    expect(a!.AGD_TIB_MOY).toBe(480);
    // TST = 480 − 8 (latence lt15) − 0 réveils = 472
    expect(a!.AGD_TST_MOY).toBe(472);
    // efficacité = 472/480 ≈ 98,3 %
    expect(a!.AGD_EFF_MOY).toBe(98);
    // nuits identiques → régularité parfaite (écart-type 0)
    expect(a!.AGD_REG_ECT).toBe(0);
    expect(a!.AGD_QUAL_MOY).toBe(4);
  });

  it('exclut une nuit implausible (TIB hors [120,960]) des agrégats', () => {
    const bonnes = Array.from({ length: 5 }, () => nuit());
    // 20:00 → 19:00 = 1380 min (implausible)
    const nuits = [...bonnes, nuit({ heureCoucher: '20:00', heureLever: '19:00' })];
    expect(compterNuitsPlausibles(nuits)).toBe(5);
    const a = calculerAgregats(nuits);
    expect(a!.AGD_NB_NUITS).toBe(5);
    expect(a!.AGD_TIB_MOY).toBe(480); // la 6e n'a pas tiré la moyenne vers le haut
  });

  it('la régularité augmente avec des heures de coucher dispersées', () => {
    const regulier = calculerAgregats(Array.from({ length: 5 }, () => nuit()))!;
    const irregulier = calculerAgregats([
      nuit({ heureCoucher: '22:00', heureLever: '06:00' }),
      nuit({ heureCoucher: '00:30', heureLever: '08:30' }),
      nuit({ heureCoucher: '23:00', heureLever: '07:00' }),
      nuit({ heureCoucher: '01:00', heureLever: '09:00' }),
      nuit({ heureCoucher: '21:30', heureLever: '05:30' }),
    ])!;
    expect(irregulier.AGD_REG_ECT).toBeGreaterThan(regulier.AGD_REG_ECT);
  });

  it('compte les réveils et diminue le TST', () => {
    const nuits = Array.from({ length: 5 }, () =>
      nuit({ reveils: { nombre: 2, dureeTotale: 'e15_45' } }),
    );
    const a = calculerAgregats(nuits)!;
    expect(a.AGD_REV_MOY).toBe(2);
    // TST = 480 − 8 (latence) − 30 (réveils e15_45) = 442
    expect(a.AGD_TST_MOY).toBe(442);
  });

  it('DST : une nuit décalée de 60 min reste plausible et n’exclut rien', () => {
    // Nuit du changement d'heure : horloge murale, la durée varie de ±60 min
    // sans exception ni conversion — le calcul reste défini.
    const nuits = [
      nuit(),
      nuit(),
      nuit(),
      nuit(),
      nuit({ heureCoucher: '23:00', heureLever: '08:00' }), // +60 min ce matin-là
    ];
    const a = calculerAgregats(nuits);
    expect(a).not.toBeNull();
    expect(a!.AGD_NB_NUITS).toBe(5);
  });
});
