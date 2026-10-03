import { describe, expect, it } from 'vitest';
import { lireValeurQuantitative, preMarquage, unitesConcordent } from './valeurLue';

describe('lireValeurQuantitative — une mesure, ou rien', () => {
  it('lit la virgule décimale française, le point, le signe et les milliers espacés', () => {
    expect(lireValeurQuantitative('12,5')).toBe(12.5);
    expect(lireValeurQuantitative('12.5')).toBe(12.5);
    expect(lireValeurQuantitative(' 48 ')).toBe(48);
    expect(lireValeurQuantitative('-0,3')).toBe(-0.3);
    expect(lireValeurQuantitative('1 250')).toBe(1250);
    expect(lireValeurQuantitative('1 250,5')).toBe(1250.5);
  });

  it('refuse tout ce qui n’est pas un nombre : opérateur, texte, exposant', () => {
    for (const texte of ['<0,5', '> 100', '≤ 3', 'positif', 'négatif', 'traces', '1,2 x10^9', '1e3', '', '12,5 ng', '1 25']) {
      expect(lireValeurQuantitative(texte), texte).toBeNull();
    }
  });
});

describe('unitesConcordent — aucune conversion (D-157)', () => {
  it('admet les seules variantes typographiques', () => {
    expect(unitesConcordent('ng/mL', 'ng/mL')).toBe(true);
    expect(unitesConcordent('ng/ml', 'ng/mL')).toBe(true);
    expect(unitesConcordent('ng/ML', 'ng/mL')).toBe(false);
    expect(unitesConcordent('µmol / L', 'µmol/L')).toBe(true);
    // Le « mu » grec et le signe micro.
    expect(unitesConcordent('μmol/L', 'µmol/L')).toBe(true);
  });

  it('le « u » ASCII vaut « µ » en préfixe de mol, g ou L — et seulement là', () => {
    expect(unitesConcordent('umol/L', 'µmol/L')).toBe(true);
    expect(unitesConcordent('ug/24h', 'µg/24h')).toBe(true);
    expect(unitesConcordent('ug/mL', 'µg/mL')).toBe(true);
    expect(unitesConcordent('ng/uL', 'ng/µL')).toBe(true);
    expect(unitesConcordent('UI/L', 'µI/L')).toBe(false);
    expect(unitesConcordent('U/L', 'µ/L')).toBe(false);
    expect(unitesConcordent('mUI/L', 'mµI/L')).toBe(false);
    expect(unitesConcordent('umol/L', 'mmol/L')).toBe(false);
  });

  it('la casse compte, sauf pour le litre (revue, P2-8)', () => {
    expect(unitesConcordent('mUI/L', 'MUI/L')).toBe(false);
    expect(unitesConcordent('mui/l', 'mUI/L')).toBe(false);
    expect(unitesConcordent('µmol/l', 'µmol/L')).toBe(true);
    expect(unitesConcordent('g/dl', 'g/dL')).toBe(true);
  });

  it('refuse une unité différente, même convertible', () => {
    expect(unitesConcordent('mg/L', 'g/L')).toBe(false);
    expect(unitesConcordent('nmol/L', 'ng/mL')).toBe(false);
    expect(unitesConcordent('g/dL', 'g/L')).toBe(false);
    expect(unitesConcordent('pmol/L', 'ng/mL')).toBe(false);
  });

  it('admet les seules notations équivalentes listées, dans les deux sens (D-260)', () => {
    expect(unitesConcordent('µg/L', 'ng/mL')).toBe(true);
    expect(unitesConcordent('ug/l', 'ng/mL')).toBe(true);
    expect(unitesConcordent('ng/mL', 'µg/L')).toBe(true);
    // Même logique, mais pas validée : hors liste, refusée.
    expect(unitesConcordent('ng/L', 'pg/mL')).toBe(false);
    expect(unitesConcordent('mg/L', 'µg/mL')).toBe(false);
  });

  it('admet les notations de D-261 et D-263, dans les deux sens, et rien d’autour', () => {
    expect(unitesConcordent('G/L', '10^9/L')).toBe(true);
    expect(unitesConcordent('10^9/L', 'G/L')).toBe(true);
    expect(unitesConcordent('T/L', '10^12/L')).toBe(true);
    expect(unitesConcordent('U/L', 'UI/L')).toBe(true);
    expect(unitesConcordent('mL/min/1.73 m²', 'mL/min/1,73 m²')).toBe(true);
    expect(unitesConcordent('mL/min/1,73m2', 'mL/min/1,73 m²')).toBe(true);
    // Le préfixe femto suit la règle du litre.
    expect(unitesConcordent('fl', 'fL')).toBe(true);
    // Un autre facteur n'est pas une notation : refusé.
    expect(unitesConcordent('G/L', '10^12/L')).toBe(false);
    expect(unitesConcordent('/mm3', '10^9/L')).toBe(false);
    expect(unitesConcordent('mU/L', 'UI/L')).toBe(false);
    expect(unitesConcordent('U/mL', 'UI/L')).toBe(false);
    expect(unitesConcordent('mL/min', 'mL/min/1,73 m²')).toBe(false);
    expect(unitesConcordent('FL', 'fL')).toBe(false);
  });

  it('une unité lue absente ne concorde qu’avec une unité attendue absente', () => {
    expect(unitesConcordent(null, 'ng/mL')).toBe(false);
    expect(unitesConcordent('  ', 'ng/mL')).toBe(false);
    expect(unitesConcordent(null, null)).toBe(true);
    expect(unitesConcordent('%', null)).toBe(false);
  });
});

describe('preMarquage — une suggestion pour l’écran, jamais une décision', () => {
  it('signale une ligne non quantitative, puis une unité divergente', () => {
    expect(preMarquage({ valeurLue: '<0,5', uniteLue: 'mg/L' }, { unite: 'mg/L' })).toBe('non_quantitative');
    expect(preMarquage({ valeurLue: '3,2', uniteLue: 'mg/dL' }, { unite: 'mg/L' })).toBe('unite_divergente');
    expect(preMarquage({ valeurLue: '3,2', uniteLue: 'mg/L' }, { unite: 'mg/L' })).toBeNull();
  });

  it('sans analyte retenu, l’unité ne se juge pas', () => {
    expect(preMarquage({ valeurLue: '3,2', uniteLue: 'mg/dL' }, null)).toBeNull();
  });
});
