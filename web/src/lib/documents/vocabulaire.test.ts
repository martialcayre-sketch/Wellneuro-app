import { describe, expect, it } from 'vitest';
import { assertRenduMedecinNonPrescriptif, contientTermePrescriptif } from './vocabulaire';

describe('garde de vocabulaire médecin', () => {
  it('détecte un registre prescriptif', () => {
    expect(contientTermePrescriptif('Prescrire 500 mg matin et soir')).toBe(true);
    expect(contientTermePrescriptif('Voir posologie ci-jointe')).toBe(true);
    expect(contientTermePrescriptif('Rédiger une ordonnance')).toBe(true);
  });

  it('accepte un registre « explorations à discuter »', () => {
    expect(contientTermePrescriptif('Piste à explorer : sommeil')).toBe(false);
    expect(contientTermePrescriptif('Signal à discuter avec le patient')).toBe(false);
  });

  it('assertRenduMedecinNonPrescriptif lève sur un contenu prescriptif', () => {
    expect(() => assertRenduMedecinNonPrescriptif('Prescription de magnésium')).toThrow(/prescriptive/);
    expect(() => assertRenduMedecinNonPrescriptif('Piste à explorer : magnésium')).not.toThrow();
  });
});
