import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { mentionValidation, PREFIXE_MENTION_VALIDATION } from './texteMentionValidation';

describe('mention « Validé par votre praticien le … » (D-369)', () => {
  // RECOPIE AU CARACTÈRE PRÈS : le banc relit la citation de D-369 §1 et
  // rougit dès que la mention servie pour la date citée s'en écarte.
  it('est la citation de D-369 §1', () => {
    const decisions = readFileSync(path.join(process.cwd(), '..', 'docs', 'DECISIONS.md'), 'utf8');
    const debut = decisions.indexOf('### D-369');
    const fin = decisions.indexOf('### D-368');
    expect(debut).toBeGreaterThanOrEqual(0);
    expect(fin).toBeGreaterThan(debut);
    const section = decisions.slice(debut, fin);
    const paragraphe1 = section.slice(section.indexOf('**§1'), section.indexOf('**§2')).replace(/\s+/g, ' ');
    expect(paragraphe1).toContain(`« ${mentionValidation('2026-10-24T09:30:00.000Z')} »`);
  });

  it('dit le jour civil de Paris, pas celui d’UTC', () => {
    // 23 octobre 22 h 30 UTC = 24 octobre 0 h 30 à Paris (heure d'été).
    expect(mentionValidation('2026-10-23T22:30:00.000Z')).toBe(`${PREFIXE_MENTION_VALIDATION} 24 octobre 2026`);
    // 31 décembre 23 h 30 UTC = 1er janvier 0 h 30 à Paris (heure d'hiver).
    expect(mentionValidation('2026-12-31T23:30:00.000Z')).toBe(`${PREFIXE_MENTION_VALIDATION} 1er janvier 2027`);
  });

  it('un instant illisible ne produit aucune mention', () => {
    expect(mentionValidation('pas une date')).toBeNull();
    expect(mentionValidation('')).toBeNull();
  });
});
