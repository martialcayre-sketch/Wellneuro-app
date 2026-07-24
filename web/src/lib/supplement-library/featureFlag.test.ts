import { describe, expect, it } from 'vitest';
import { isC4Enabled } from './featureFlag';

describe('isC4Enabled', () => {
  it('n\'active le rayon que pour la valeur exacte « true » (fail-closed)', () => {
    expect(isC4Enabled('true')).toBe(true);
    expect(isC4Enabled('false')).toBe(false);
    expect(isC4Enabled(undefined)).toBe(false);
    expect(isC4Enabled('')).toBe(false);
    expect(isC4Enabled('1')).toBe(false);
    expect(isC4Enabled('TRUE')).toBe(false);
    expect(isC4Enabled(' true ')).toBe(false);
  });
});
