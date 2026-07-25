import { describe, expect, it } from 'vitest';
import {
  assertRenduMedecinNonPrescriptif,
  contientTermeAnxiogene,
  contientTermePrescriptif,
  termeAnxiogene,
} from './vocabulaire';

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

describe('garde de vocabulaire anxiogène (contenus lus par le patient)', () => {
  // Ces phrases ne sont pas inventées : ce sont les `protocol` du catalogue,
  // que le modèle peut recopier dans le narratif patient.
  it("attrape les formulations d'orientation du catalogue", () => {
    expect(contientTermeAnxiogene('Avis médical urgent — programme de réduction des risques')).toBe(true);
    expect(contientTermeAnxiogene('Consultation neurologique urgente')).toBe(true);
    expect(contientTermeAnxiogene('Risque élevé de chute')).toBe(true);
    expect(contientTermeAnxiogene('Dépression sévère')).toBe(true);
    expect(contientTermeAnxiogene('nécessite une appréciation clinique immédiatement')).toBe(true);
  });

  it('laisse passer un registre descriptif orienté vers la consultation', () => {
    expect(contientTermeAnxiogene('Vos réponses évoquent un sommeil fragmenté.')).toBe(false);
    expect(contientTermeAnxiogene('Le sommeil ressort comme un axe à explorer en priorité.')).toBe(false);
    expect(contientTermeAnxiogene('Votre praticien reprendra ces éléments avec vous.')).toBe(false);
  });

  it('insensible à la casse et aux accents des racines couvertes', () => {
    expect(contientTermeAnxiogene('AVIS MÉDICAL URGENT')).toBe(true);
    expect(contientTermeAnxiogene('Depression severe')).toBe(true);
  });

  // Renvoyer le terme, et pas un booléen, est ce qui permet de dire au
  // praticien QUOI reformuler.
  it('termeAnxiogene nomme le terme fautif', () => {
    expect(termeAnxiogene('Consultation neurologique urgente')).toBe('urgen');
    expect(termeAnxiogene('Vos réponses évoquent une fatigue installée.')).toBeNull();
  });
});
