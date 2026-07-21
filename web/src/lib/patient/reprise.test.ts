import { describe, expect, it } from 'vitest';
import { evaluerReprise, phraseReprise } from './reprise';
import { SEUIL_REPRISE_MOIS } from '@/lib/fil/cartes';

/*
 * L'enjeu de ces tests n'est pas l'arithmétique : c'est que la surface patient
 * et le Fil praticien s'accordent. Un patient accueilli en reprise que le
 * praticien ne voit pas signalé (ou l'inverse) serait une incohérence visible
 * en consultation.
 */
describe('evaluerReprise', () => {
  const maintenant = new Date('2026-07-21T12:00:00.000Z');

  it('ne déclare pas en reprise un patient qui n’a jamais répondu', () => {
    // Il n'a rien interrompu — même choix que côté praticien.
    expect(evaluerReprise(null, maintenant)).toEqual({ enReprise: false });
    expect(evaluerReprise(undefined, maintenant)).toEqual({ enReprise: false });
  });

  it('ne déclare pas en reprise une activité récente', () => {
    expect(evaluerReprise('2026-07-01T12:00:00.000Z', maintenant)).toEqual({ enReprise: false });
  });

  it('ne déclare pas en reprise une absence encore sous le seuil', () => {
    // 5 mois : clairement en deçà.
    expect(evaluerReprise('2026-02-21T12:00:00.000Z', maintenant)).toEqual({ enReprise: false });
  });

  /*
   * L'instant exact du seuil n'est volontairement pas asserté. `setMonth`
   * opère en heure locale : entre juillet (CEST) et janvier (CET) le décalage
   * déplace la frontière d'une heure, si bien qu'un test « 6 mois pile »
   * mesurerait le fuseau du poste plutôt que la règle. Le Fil praticien
   * calcule le seuil exactement de la même façon — c'est cet alignement qui
   * compte, et il est couvert par les cas francs ci-dessus et ci-dessous.
   */

  it('déclare en reprise au-delà du seuil', () => {
    const etat = evaluerReprise('2025-07-21T12:00:00.000Z', maintenant);
    expect(etat.enReprise).toBe(true);
  });

  it('n’annonce jamais moins de mois que le seuil praticien', () => {
    const etat = evaluerReprise('2026-01-15T12:00:00.000Z', maintenant);
    expect(etat).toEqual({ enReprise: true, moisEcoules: SEUIL_REPRISE_MOIS });
  });

  it('compte les mois écoulés pour une absence longue', () => {
    const etat = evaluerReprise('2025-07-21T12:00:00.000Z', maintenant);
    expect(etat.enReprise && etat.moisEcoules).toBe(12);
  });

  it('ignore une date illisible plutôt que de mal accueillir', () => {
    expect(evaluerReprise('pas-une-date', maintenant)).toEqual({ enReprise: false });
  });
});

describe('phraseReprise', () => {
  it('accueille sans reprocher ni presser', () => {
    const phrase = phraseReprise(8);
    expect(phrase).toContain('8 mois');
    expect(phrase).toContain('à votre rythme');
    // Garde de vocabulaire : la reprise ne culpabilise pas et n'impose rien.
    expect(phrase).not.toMatch(/manqué|retard|devez|oubli|perdu du temps/i);
  });
});
