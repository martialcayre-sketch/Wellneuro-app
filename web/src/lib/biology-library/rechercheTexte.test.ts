import { describe, expect, it } from 'vitest';
import { jetons, normaliserRecherche } from './rechercheTexte';

describe('normaliserRecherche (D-320 §1)', () => {
  it('accents et casse tombent', () => {
    expect(normaliserRecherche('Homocystéine')).toBe('homocysteine');
    expect(normaliserRecherche('HÉMOGRAMME')).toBe('hemogramme');
    expect(normaliserRecherche('Vitamine D (25-OH)')).toBe('vitamine d 25 oh');
  });

  it('les ligatures se déplient', () => {
    expect(normaliserRecherche('Œstradiol')).toBe('oestradiol');
    expect(normaliserRecherche('cæcum')).toBe('caecum');
  });

  it('ponctuation et apostrophes typographiques deviennent des espaces', () => {
    expect(normaliserRecherche('  d’une anomalie, lipidique.  ')).toBe('d une anomalie lipidique');
  });

  it('les lettres hors de l’alphabet latin restent des lettres', () => {
    expect(normaliserRecherche('β-HCG')).toBe('β hcg');
    expect(jetons('β-β')).toEqual(['β', 'β']);
  });
});

describe('jetons', () => {
  it('découpe la saisie normalisée ; rien ne reste ⇒ liste vide', () => {
    expect(jetons('Folates  érythrocytaires')).toEqual(['folates', 'erythrocytaires']);
    expect(jetons(' --- ')).toEqual([]);
  });
});
