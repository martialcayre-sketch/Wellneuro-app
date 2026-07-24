import { describe, expect, it } from 'vitest';
import { bornesJourParis, formatHeureParis } from './fuseau';

// Ces tests fixent le fuseau : le helper force `Europe/Paris`, donc les
// résultats sont déterministes quelle que soit la TZ de la machine (le serveur
// Vercel tourne en UTC — c'est précisément le décalage qu'on protège ici).

describe('formatHeureParis', () => {
  it('rend l’heure de Paris, pas l’heure UTC (été = UTC+2)', () => {
    // 07:00 UTC en juillet = 09:00 à Paris.
    expect(formatHeureParis(new Date('2026-07-15T07:00:00Z'))).toBe('09:00');
  });

  it('suit l’heure d’hiver (UTC+1)', () => {
    // 08:00 UTC en janvier = 09:00 à Paris.
    expect(formatHeureParis(new Date('2026-01-15T08:00:00Z'))).toBe('09:00');
  });
});

describe('bornesJourParis', () => {
  it('borne le jour civil de Paris en instants UTC (été)', () => {
    const { debut, fin } = bornesJourParis(new Date('2026-07-15T07:00:00Z'));
    // Minuit Paris du 15 juillet = 22:00 UTC le 14 ; +24 h = 22:00 UTC le 15.
    expect(debut.toISOString()).toBe('2026-07-14T22:00:00.000Z');
    expect(fin.toISOString()).toBe('2026-07-15T22:00:00.000Z');
  });

  it('range un rendez-vous de 00:30 Paris dans le bon jour, pas la veille UTC', () => {
    // 00:30 Paris le 15 juillet = 22:30 UTC le 14. Le jour civil de Paris de
    // cet instant reste le 15 : la borne doit l'inclure.
    const instant = new Date('2026-07-14T22:30:00Z');
    const { debut, fin } = bornesJourParis(instant);
    expect(instant >= debut && instant < fin).toBe(true);
    expect(debut.toISOString()).toBe('2026-07-14T22:00:00.000Z');
  });

  it('borne le jour civil de Paris en hiver (UTC+1)', () => {
    const { debut } = bornesJourParis(new Date('2026-01-15T08:00:00Z'));
    expect(debut.toISOString()).toBe('2026-01-14T23:00:00.000Z');
  });

  it('gère le jour de passage à l’heure d’été (29 mars 2026) : jour de 23 h', () => {
    // Transition à 02:00 local (01:00 UTC) → +1 avant, +2 après.
    const { debut, fin } = bornesJourParis(new Date('2026-03-29T12:00:00Z'));
    expect(debut.toISOString()).toBe('2026-03-28T23:00:00.000Z'); // minuit Paris = +1
    expect(fin.toISOString()).toBe('2026-03-29T22:00:00.000Z'); // minuit suivant = +2
    // Journée civile de 23 h (bascule en avant), pas 24.
    expect(fin.getTime() - debut.getTime()).toBe(23 * 60 * 60 * 1000);
  });

  it('gère le jour de passage à l’heure d’hiver (25 octobre 2026) : jour de 25 h', () => {
    const { debut, fin } = bornesJourParis(new Date('2026-10-25T12:00:00Z'));
    expect(debut.toISOString()).toBe('2026-10-24T22:00:00.000Z'); // minuit Paris = +2
    expect(fin.toISOString()).toBe('2026-10-25T23:00:00.000Z'); // minuit suivant = +1
    expect(fin.getTime() - debut.getTime()).toBe(25 * 60 * 60 * 1000);
  });
});
