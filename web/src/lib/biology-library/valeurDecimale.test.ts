import { describe, expect, it } from 'vitest';
import { canoniserDecimal, depasseCapacite, lireDecimalSaisi } from './valeurDecimale';

// BIO-INGEST LOT-10 : la valeur ne passe jamais par un `number`. Chaque cas
// ci-dessous est une valeur qu'un flottant IEEE 754 aurait arrondie, ou une
// écriture que la forme canonique doit ramener à une seule.

describe('lireDecimalSaisi — la valeur tapée, en forme canonique', () => {
  it.each([
    ['0,1', '0.1'],
    ['0.30000000000000004', '0.30000000000000004'],
    // 15 et 17 chiffres significatifs : le second ne survit pas à un `number`.
    ['123456789012345', '123456789012345'],
    ['12345678901234567', '12345678901234567'],
    ['9007199254740993', '9007199254740993'],
    ['0,000000123', '0.000000123'],
    // Zéros de tête et de queue, virgule française, signes.
    ['007,500', '7.5'],
    ['1,50', '1.5'],
    ['10', '10'],
    ['100,0', '100'],
    ['-0', '0'],
    ['-0,000', '0'],
    ['+5', '5'],
    ['-2,5', '-2.5'],
    ['  42,5  ', '42.5'],
    [',5', '0.5'],
    ['5,', '5'],
    ['5.', '5'],
  ])('« %s » → %s', (saisie, attendue) => {
    expect(lireDecimalSaisi(saisie)).toBe(attendue);
  });

  it.each([
    ['vide', ''],
    ['blancs', '   '],
    ['signe seul', '-'],
    ['séparateur seul', ','],
    ['exposant', '1e3'],
    ['hexadécimal', '0x10'],
    ['infini', 'Infinity'],
    ['texte', 'douze'],
    ['deux séparateurs', '12,5,3'],
    ['milliers espacés', '1 250'],
    ['opérateur', '<0,5'],
  ])('refuse une saisie %s', (_nom, saisie) => {
    expect(lireDecimalSaisi(saisie)).toBeNull();
  });

  it('refuse ce qui n’est pas une chaîne : un `number` a déjà perdu l’exactitude', () => {
    for (const brut of [42.5, 0.1 + 0.2, Number.NaN, null, undefined, {}, ['1']]) {
      expect(lireDecimalSaisi(brut)).toBeNull();
    }
  });
});

describe('canoniserDecimal', () => {
  it('ne laisse ni zéro de tête, ni zéro de queue, ni zéro négatif', () => {
    expect(canoniserDecimal(false, '000', '000')).toBe('0');
    expect(canoniserDecimal(true, '0', '0')).toBe('0');
    expect(canoniserDecimal(true, '012', '340')).toBe('-12.34');
    expect(canoniserDecimal(false, '', '5')).toBe('0.5');
  });
});

describe('depasseCapacite — DECIMAL(65,30), borne technique', () => {
  it('accepte 35 chiffres entiers et 30 décimales, refuse au-delà', () => {
    expect(depasseCapacite(`${'9'.repeat(35)}.${'9'.repeat(30)}`)).toBe(false);
    expect(depasseCapacite(`-${'9'.repeat(35)}`)).toBe(false);
    expect(depasseCapacite('9'.repeat(36))).toBe(true);
    expect(depasseCapacite(`0.${'0'.repeat(30)}1`)).toBe(true);
  });
});
