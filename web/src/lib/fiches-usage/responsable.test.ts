import { describe, expect, it } from 'vitest';
import { peutDeciderFichesUsage, validateursFichesUsage, VARIABLE_VALIDATEURS } from './responsable';

// Adresses SYNTHÉTIQUES : aucune adresse réelle dans le dépôt.
const env = (valeur?: string) => (valeur === undefined ? {} : { [VARIABLE_VALIDATEURS]: valeur });

describe('responsable des fiches d’usage — liste fermée par défaut', () => {
  it('variable absente ou vide : personne ne décide', () => {
    expect(peutDeciderFichesUsage('a@wellneuro.fr', env())).toBe(false);
    expect(peutDeciderFichesUsage('a@wellneuro.fr', env(''))).toBe(false);
    expect(peutDeciderFichesUsage('a@wellneuro.fr', env(' , ,'))).toBe(false);
    expect(validateursFichesUsage(env()).size).toBe(0);
  });

  it('une adresse listée décide, casse et espaces indifférents', () => {
    const e = env(' Responsable@Wellneuro.fr , autre@wellneuro.fr');
    expect(peutDeciderFichesUsage('responsable@wellneuro.fr', e)).toBe(true);
    expect(peutDeciderFichesUsage('RESPONSABLE@wellneuro.fr ', e)).toBe(true);
    expect(peutDeciderFichesUsage('autre@wellneuro.fr', e)).toBe(true);
  });

  it('une adresse non listée, vide ou absente ne décide pas', () => {
    const e = env('responsable@wellneuro.fr');
    expect(peutDeciderFichesUsage('praticien@wellneuro.fr', e)).toBe(false);
    expect(peutDeciderFichesUsage('', e)).toBe(false);
    expect(peutDeciderFichesUsage(null, e)).toBe(false);
    expect(peutDeciderFichesUsage(undefined, e)).toBe(false);
    // Pas de correspondance partielle.
    expect(peutDeciderFichesUsage('responsable@wellneuro.fr.exemple', e)).toBe(false);
  });
});
