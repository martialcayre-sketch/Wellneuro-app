import { describe, expect, it } from 'vitest';
import { isC4Enabled, isRechercheCorpusEnabled } from './featureFlag';

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

describe('isRechercheCorpusEnabled', () => {
  it('n\'active l\'écran que pour la valeur exacte « true » (fail-closed)', () => {
    expect(isRechercheCorpusEnabled('true')).toBe(true);
    expect(isRechercheCorpusEnabled('false')).toBe(false);
    expect(isRechercheCorpusEnabled(undefined)).toBe(false);
    expect(isRechercheCorpusEnabled('')).toBe(false);
    expect(isRechercheCorpusEnabled('1')).toBe(false);
    expect(isRechercheCorpusEnabled('TRUE')).toBe(false);
    expect(isRechercheCorpusEnabled(' true ')).toBe(false);
  });
});
