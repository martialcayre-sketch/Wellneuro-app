import { describe, expect, it } from 'vitest';
import { datePublicationEnLettres } from './datePublication';
import { REGISTRE_DOCUMENTS_TRUST } from './contenus/registre';

// Q1 b du prototype PAT-6 ([[D-481]], DOC-11) : format d'affichage seul.
describe('datePublicationEnLettres', () => {
  it('écrit la date calendaire en lettres', () => {
    expect(datePublicationEnLettres('2026-11-12')).toBe('12 novembre 2026');
    expect(datePublicationEnLettres('2026-07-16')).toBe('16 juillet 2026');
    expect(datePublicationEnLettres('2026-09-01')).toBe('1 septembre 2026');
  });

  it('ne glisse pas d’un jour aux bornes de l’année', () => {
    expect(datePublicationEnLettres('2026-01-01')).toBe('1 janvier 2026');
    expect(datePublicationEnLettres('2026-12-31')).toBe('31 décembre 2026');
  });

  it('laisse telle quelle une valeur qui n’est pas une date calendaire valide', () => {
    expect(datePublicationEnLettres('2026-02-30')).toBe('2026-02-30');
    expect(datePublicationEnLettres('2026-11-12T10:00:00Z')).toBe('2026-11-12T10:00:00Z');
    expect(datePublicationEnLettres('')).toBe('');
  });

  it('sait écrire chaque date de publication du registre', () => {
    for (const doc of REGISTRE_DOCUMENTS_TRUST) {
      expect(datePublicationEnLettres(doc.publieLe)).toMatch(/^\d{1,2} [a-zéû]+ \d{4}$/);
    }
  });
});
