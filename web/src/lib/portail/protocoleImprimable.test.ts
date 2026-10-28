import { afterEach, describe, expect, it } from 'vitest';
import { protocoleImprimableOuvert, protocoleImprimableServi } from './protocoleImprimable';

const MAINTENANT = Date.parse('2026-10-28T12:00:00Z');

describe('WN_PORTAIL_PROTOCOLE_IMPRIMABLE ([[D-392]] §5)', () => {
  afterEach(() => {
    delete process.env.WN_PORTAIL_PROTOCOLE_IMPRIMABLE;
  });

  it('absent : fermé', () => {
    expect(protocoleImprimableOuvert()).toBe(false);
  });

  it.each(['1', 'TRUE', 'oui', ' true'])('valeur « %s » : fermé (seule la chaîne exacte « true » ouvre)', (valeur) => {
    expect(protocoleImprimableOuvert(valeur)).toBe(false);
  });

  it('« true » : ouvert', () => {
    expect(protocoleImprimableOuvert('true')).toBe(true);
  });
});

describe('servi aux seuls majeurs ([[D-392]] §3)', () => {
  afterEach(() => {
    delete process.env.WN_PORTAIL_PROTOCOLE_IMPRIMABLE;
  });

  it('drapeau fermé : jamais servi, même à un majeur', () => {
    expect(protocoleImprimableServi('1980-05-12', MAINTENANT)).toBe(false);
  });

  it('drapeau ouvert : servi au majeur', () => {
    process.env.WN_PORTAIL_PROTOCOLE_IMPRIMABLE = 'true';
    expect(protocoleImprimableServi('1980-05-12', MAINTENANT)).toBe(true);
  });

  it.each([
    ['mineur', '2012-05-12'],
    ['date absente', null],
    ['date vide', ''],
    ['date illisible', '12/05/1980'],
  ])('drapeau ouvert, %s : refusé', (_cas, date) => {
    process.env.WN_PORTAIL_PROTOCOLE_IMPRIMABLE = 'true';
    expect(protocoleImprimableServi(date, MAINTENANT)).toBe(false);
  });
});
