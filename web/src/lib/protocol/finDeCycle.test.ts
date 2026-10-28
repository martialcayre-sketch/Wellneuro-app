import { describe, expect, it } from 'vitest';
import { JOURS_FIN_DE_CYCLE, estFinDeCycle } from './finDeCycle';

const JOUR_MS = 24 * 60 * 60 * 1000;
const jourZero = new Date('2026-10-01T08:00:00.000Z');
const apres = (ms: number) => new Date(jourZero.getTime() + ms);

describe('estFinDeCycle', () => {
  it('la valeur déplacée est inchangée : 24 jours', () => {
    expect(JOURS_FIN_DE_CYCLE).toBe(24);
  });

  it('au jour zéro, le cycle est en cours', () => {
    expect(estFinDeCycle(jourZero, jourZero)).toBe(false);
  });

  it('à la borne exacte, le cycle est encore en cours (comparaison stricte)', () => {
    expect(estFinDeCycle(jourZero, apres(JOURS_FIN_DE_CYCLE * JOUR_MS))).toBe(false);
  });

  it('une milliseconde après la borne, le cycle est fini', () => {
    expect(estFinDeCycle(jourZero, apres(JOURS_FIN_DE_CYCLE * JOUR_MS + 1))).toBe(true);
  });

  it('une horloge antérieure au jour zéro ne fait pas une fin de cycle', () => {
    expect(estFinDeCycle(jourZero, apres(-JOUR_MS))).toBe(false);
  });
});
