import { describe, expect, it } from 'vitest';
import { isCbEnabled, isCbResultsEnabled } from './featureFlag';

describe('isCbEnabled', () => {
  it("n'active le rayon que pour la valeur exacte « true » (fail-closed)", () => {
    expect(isCbEnabled('true')).toBe(true);
    expect(isCbEnabled('false')).toBe(false);
    expect(isCbEnabled(undefined)).toBe(false);
    expect(isCbEnabled('')).toBe(false);
    expect(isCbEnabled('1')).toBe(false);
    expect(isCbEnabled('TRUE')).toBe(false);
    expect(isCbEnabled(' true ')).toBe(false);
  });
});

describe('isCbResultsEnabled', () => {
  it("n'ouvre l'étage résultats que si les DEUX flags valent « true »", () => {
    expect(isCbResultsEnabled('true', 'true')).toBe(true);
    expect(isCbResultsEnabled('true', 'false')).toBe(false);
    expect(isCbResultsEnabled('true', undefined)).toBe(false);
    expect(isCbResultsEnabled('false', 'true')).toBe(false);
    expect(isCbResultsEnabled(undefined, 'true')).toBe(false);
  });

  it('reste fermé sur les variantes proches de « true » (gate dur HDS)', () => {
    expect(isCbResultsEnabled('1', 'true')).toBe(false);
    expect(isCbResultsEnabled('TRUE', 'true')).toBe(false);
    expect(isCbResultsEnabled(' true ', 'true')).toBe(false);
    expect(isCbResultsEnabled('true', '1')).toBe(false);
  });

  it("ne s'ouvre pas quand les deux flags sont absents", () => {
    expect(isCbResultsEnabled(undefined, undefined)).toBe(false);
  });
});
