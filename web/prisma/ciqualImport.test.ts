import { describe, expect, it } from 'vitest';
import {
  CIQUAL_EXPECTED_FOODS,
  CIQUAL_EXPECTED_ROWS,
  CIQUAL_EXPECTED_STATUS_COUNTS,
  CIQUAL_NUTRIENTS,
  parseCiqualValue,
  unitFromConstituentLabel,
} from './ciqualImport';

describe('import Ciqual C5 LOT-02', () => {
  it('conserve uniquement les teneurs numériques exactes', () => {
    expect(parseCiqualValue(' 0,0035 ')).toEqual({
      value: '0.0035',
      status: 'exact',
      decimalScale: 4,
    });
    expect(parseCiqualValue('0')).toEqual({
      value: '0',
      status: 'exact',
      decimalScale: 0,
    });
  });

  it('ne transforme jamais les absences, traces ou bornes en zéro', () => {
    expect(parseCiqualValue('-')).toEqual({
      value: null,
      status: 'missing',
      decimalScale: 0,
    });
    expect(parseCiqualValue('traces')).toEqual({
      value: null,
      status: 'trace',
      decimalScale: 0,
    });
    expect(parseCiqualValue('< 0,00024')).toEqual({
      value: null,
      status: 'below_limit',
      decimalScale: 0,
    });
  });

  it('refuse les teneurs ambiguës ou incompatibles avec numeric(14,6)', () => {
    expect(() => parseCiqualValue('-0,1')).toThrow('non reconnue');
    expect(() => parseCiqualValue('1,1234567')).toThrow('6 décimales');
    expect(() => parseCiqualValue('1e3')).toThrow('non reconnue');
  });

  it('résout seulement les deux unités autorisées', () => {
    expect(unitFromConstituentLabel('Protéines (g/100 g)')).toBe('g/100 g');
    expect(unitFromConstituentLabel('Magnésium (mg/100 g)')).toBe('mg/100 g');
    expect(unitFromConstituentLabel('Énergie (kJ/100 g)')).toBeNull();
  });

  it('verrouille les volumes documentés du dataset', () => {
    expect(CIQUAL_EXPECTED_FOODS * CIQUAL_NUTRIENTS.length).toBe(
      CIQUAL_EXPECTED_ROWS,
    );
    for (const nutrient of CIQUAL_NUTRIENTS) {
      const counts = CIQUAL_EXPECTED_STATUS_COUNTS[nutrient.code];
      expect(counts).toBeDefined();
      expect(
        counts.exact + counts.trace + counts.below_limit + counts.missing,
      ).toBe(CIQUAL_EXPECTED_FOODS);
    }
  });
});
