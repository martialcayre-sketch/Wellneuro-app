import { describe, expect, it } from 'vitest';

import { dateJourParis } from './dateParis';

/**
 * Ce que ces cas prouvent : `dateJourParis` rend la date de PARIS, pas celle du
 * conteneur (UTC), et elle suit le passage à l'heure d'été au lieu d'appliquer
 * un décalage fixe.
 *
 * Un test qui n'exercerait qu'une seule saison passerait avec un `+1 h` codé en
 * dur — c'est-à-dire avec une horloge fausse la moitié de l'année.
 *
 * Repère 2026 : l'heure d'été européenne commence le dimanche 29 mars à 01:00
 * UTC (02:00 → 03:00 locales) et finit le 25 octobre.
 */
describe('dateJourParis', () => {
  it('rend la date de Paris et non celle d’UTC — hiver (UTC+1)', () => {
    // 23:30 UTC le 28 mars = 00:30 le 29 à Paris : le jour a déjà tourné ici,
    // pas là-bas.
    expect(dateJourParis(new Date('2026-03-28T23:30:00Z'))).toBe('2026-03-29');
  });

  it('rend la date de Paris et non celle d’UTC — été (UTC+2)', () => {
    // 22:30 UTC le 29 mars = 00:30 le 30 à Paris. En hiver, la même heure UTC
    // n'aurait PAS fait tourner le jour : c'est l'heure d'été qui décide.
    expect(dateJourParis(new Date('2026-03-29T22:30:00Z'))).toBe('2026-03-30');
  });

  it('la même heure UTC ne rend pas la même date selon la saison', () => {
    // Cœur du test : 22:30 UTC, deux fois, à six mois d'écart. En janvier
    // (UTC+1) il est 23:30 le même jour ; en juillet (UTC+2) il est 00:30 le
    // lendemain. Un décalage fixe rendrait les deux identiques.
    expect(dateJourParis(new Date('2026-01-15T22:30:00Z'))).toBe('2026-01-15');
    expect(dateJourParis(new Date('2026-07-15T22:30:00Z'))).toBe('2026-07-16');
  });

  it('reste correcte au creux de la nuit du changement d’heure', () => {
    // 00:30 UTC le 29 mars : encore UTC+1 (la bascule a lieu à 01:00 UTC), donc
    // 01:30 à Paris, toujours le 29.
    expect(dateJourParis(new Date('2026-03-29T00:30:00Z'))).toBe('2026-03-29');
    // 01:30 UTC : la bascule est passée, 03:30 à Paris — toujours le 29.
    expect(dateJourParis(new Date('2026-03-29T01:30:00Z'))).toBe('2026-03-29');
  });

  it('rend le format AAAA-MM-JJ zéro-complété', () => {
    expect(dateJourParis(new Date('2026-02-03T12:00:00Z'))).toBe('2026-02-03');
  });
});
