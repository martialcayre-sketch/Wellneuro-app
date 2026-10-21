import { describe, expect, it } from 'vitest';
import { estFuture, finApresDebut, formaterDatePeriode, lireDatePeriode, valeurDatePeriode } from './dates';

// Les dates d'un traitement ([[D-335]] §4) : la forme dit la précision, et
// la fin se compare au début comme le CHECK `fin_apres_debut` (arbitrage du
// 2026-10-21 : la période de la fin doit finir après le début).

describe('lireDatePeriode — la forme dit la précision', () => {
  it('jour, mois, année, inconnu', () => {
    expect(lireDatePeriode('2024-05-10')).toEqual({ precision: 'jour', premierJour: '2024-05-10' });
    expect(lireDatePeriode('2024-05')).toEqual({ precision: 'mois', premierJour: '2024-05-01' });
    expect(lireDatePeriode('2024')).toEqual({ precision: 'annee', premierJour: '2024-01-01' });
    expect(lireDatePeriode('inconnu')).toEqual({ precision: 'inconnu', premierJour: null });
  });

  it('refuse une date irréelle, l’an 0000, une forme libre, un vide', () => {
    for (const v of ['2024-02-30', '2024-13', '0000', '24', '2024-5', '', 'mai 2024', null, 2024]) {
      expect(lireDatePeriode(v)).toBeNull();
    }
  });

  it('valeurDatePeriode est l’inverse', () => {
    for (const v of ['2024-05-10', '2024-05', '2024', 'inconnu']) {
      const p = lireDatePeriode(v)!;
      expect(valeurDatePeriode(p.premierJour, p.precision)).toBe(v);
    }
    expect(valeurDatePeriode(null, null)).toBeNull();
  });
});

describe('finApresDebut — la règle du CHECK', () => {
  const d = (v: string) => lireDatePeriode(v)!;
  it('admet une fin moins précise que le début dans la même période', () => {
    expect(finApresDebut(d('2024-05-10'), d('2024-05'))).toBe(true);
    expect(finApresDebut(d('2024-05'), d('2024'))).toBe(true);
    expect(finApresDebut(d('2024-05-10'), d('2024-05-10'))).toBe(true);
  });
  it('refuse une période de fin close avant le début', () => {
    expect(finApresDebut(d('2024-03'), d('2024-02'))).toBe(false);
    expect(finApresDebut(d('2024-05-10'), d('2024-05-09'))).toBe(false);
    expect(finApresDebut(d('2025'), d('2024-12'))).toBe(false);
  });
  it('une date inconnue ou une fin absente ne se compare pas', () => {
    expect(finApresDebut(d('inconnu'), d('2020'))).toBe(true);
    expect(finApresDebut(d('2024'), d('inconnu'))).toBe(true);
    expect(finApresDebut(d('2024'), null)).toBe(true);
  });
});

describe('estFuture et formaterDatePeriode', () => {
  it('une période qui commence après aujourd’hui est future ; le mois courant ne l’est pas', () => {
    expect(estFuture(lireDatePeriode('2026-10')!, '2026-10-21')).toBe(false);
    expect(estFuture(lireDatePeriode('2026-10-22')!, '2026-10-21')).toBe(true);
    expect(estFuture(lireDatePeriode('inconnu')!, '2026-10-21')).toBe(false);
  });
  it('dit la date à sa précision, sans en inventer', () => {
    expect(formaterDatePeriode('2024-05-10', 'jour', '?')).toBe('10/05/2024');
    expect(formaterDatePeriode('2024-05-01', 'mois', '?')).toBe('mai 2024');
    expect(formaterDatePeriode('2024-01-01', 'annee', '?')).toBe('2024');
    expect(formaterDatePeriode(null, 'inconnu', 'date inconnue')).toBe('date inconnue');
  });
});
