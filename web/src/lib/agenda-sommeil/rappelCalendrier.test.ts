import { describe, expect, it } from 'vitest';
import { TITRE_RAPPEL, genererRappelIcs } from './rappelCalendrier';

const base = {
  heure: '07:30',
  dateDebut: '2026-10-09',
  nombre: 12,
  uid: 'rappel-test@rappel',
  maintenant: new Date(Date.UTC(2026, 9, 8, 10, 5, 0)),
};

describe('rappel du matin — fichier calendrier posé sur l’appareil', () => {
  it('un événement quotidien, à l’heure locale, borné au nombre de matins', () => {
    const ics = genererRappelIcs(base);
    expect(ics).toContain('DTSTART:20261009T073000\r\n');
    expect(ics).toContain('RRULE:FREQ=DAILY;COUNT=12\r\n');
    expect(ics).toContain('DTSTAMP:20261008T100500Z\r\n');
    expect(ics).toContain('UID:rappel-test@rappel\r\n');
    // Une alarme à l'heure dite : c'est le téléphone qui sonne.
    expect(ics).toMatch(/BEGIN:VALARM\r\nACTION:DISPLAY\r\n.*\r\nTRIGGER:PT0M\r\nEND:VALARM/);
  });

  it('heure flottante : ni « Z » ni fuseau sur le début', () => {
    const ics = genererRappelIcs(base);
    expect(ics).not.toMatch(/DTSTART[^:\r\n]*TZID/);
    expect(ics).not.toMatch(/DTSTART:\d{8}T\d{6}Z/);
  });

  it('lignes terminées par CRLF (RFC 5545), enveloppe complète', () => {
    const ics = genererRappelIcs(base);
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.replaceAll('\r\n', '')).not.toContain('\n');
  });

  it('ni lien, ni mot qui trahisse un suivi de santé', () => {
    const ics = genererRappelIcs(base).toLowerCase();
    expect(ics).not.toMatch(/https?:|url:|portail|token/);
    for (const mot of ['sommeil', 'nuit', 'agenda', 'santé', 'wellneuro']) {
      expect(ics).not.toContain(mot);
    }
    expect(TITRE_RAPPEL).toBe('Rappel du matin');
  });

  it('refuse une heure, une date ou un nombre invalides', () => {
    expect(() => genererRappelIcs({ ...base, heure: '7:30' })).toThrow(TypeError);
    expect(() => genererRappelIcs({ ...base, dateDebut: '09/10/2026' })).toThrow(TypeError);
    expect(() => genererRappelIcs({ ...base, nombre: 0 })).toThrow(TypeError);
  });
});
