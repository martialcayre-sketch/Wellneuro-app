import { describe, expect, it } from 'vitest';
import { isMotifValide, MOTIFS_CONSULTATION } from './motifs';

describe('isMotifValide', () => {
  it('rejette null, undefined et la chaîne vide', () => {
    expect(isMotifValide(null)).toBe(false);
    expect(isMotifValide(undefined)).toBe(false);
    expect(isMotifValide('')).toBe(false);
  });

  it('rejette un motif hors liste', () => {
    expect(isMotifValide('Autre chose')).toBe(false);
    expect(isMotifValide('sommeil et récupération')).toBe(false); // casse différente
  });

  it.each(MOTIFS_CONSULTATION)('accepte le motif « %s »', (motif) => {
    expect(isMotifValide(motif)).toBe(true);
  });
});
