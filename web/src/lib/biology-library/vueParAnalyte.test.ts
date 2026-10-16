import { describe, expect, it } from 'vitest';
import type { LigneAnalyteProposition, LignePanelProposition, StatutPanel } from './statuts';
import { vueParAnalyte } from './vueParAnalyte';

const analyte = (code: string, validationMedicaleRequise = false): LigneAnalyteProposition => ({
  code,
  libelle: `Libellé ${code}`,
  validationMedicaleRequise,
  remboursement: { statut: 'non_evalue', conditions: [], codesActesRetenus: [] },
});

const ligne = (
  panelCode: string,
  statut: StatutPanel,
  analytes: LigneAnalyteProposition[],
): LignePanelProposition => ({
  panelCode,
  libelle: `Panel ${panelCode}`,
  niveau: 'socle',
  objectif: null,
  statut,
  declencheurRempli: null,
  condition: null,
  motifs: [`motif ${panelCode}`],
  justificationClaims: [],
  analytes,
  ratios: [],
});

describe('vueParAnalyte — une ligne par analyte (D-296 §2, F50)', () => {
  it('un analyte cité par trois panels donne une ligne et trois justifications', () => {
    const vue = vueParAnalyte([
      ligne('PANEL_A', 'recommande', [analyte('BIO_X'), analyte('BIO_Y')]),
      ligne('PANEL_B', 'optionnel', [analyte('BIO_X')]),
      ligne('PANEL_C', 'non_indique_actuellement', [analyte('BIO_X')]),
    ]);
    const x = vue.filter(l => l.analyte.code === 'BIO_X');
    expect(x).toHaveLength(1);
    expect(x[0].justifications).toEqual([
      { panelCode: 'PANEL_A', libelle: 'Panel PANEL_A', statut: 'recommande' },
      { panelCode: 'PANEL_B', libelle: 'Panel PANEL_B', statut: 'optionnel' },
      { panelCode: 'PANEL_C', libelle: 'Panel PANEL_C', statut: 'non_indique_actuellement' },
    ]);
  });

  it('aucune justification perdue : la somme des justifications égale les citations distinctes', () => {
    const lignes = [
      ligne('PANEL_A', 'recommande', [analyte('BIO_X'), analyte('BIO_Y')]),
      ligne('PANEL_B', 'a_repeter', [analyte('BIO_Y'), analyte('BIO_Z')]),
      ligne('PANEL_C', 'conditionnel', [analyte('BIO_Z'), analyte('BIO_X')]),
    ];
    const vue = vueParAnalyte(lignes);
    const citations = lignes.reduce((n, l) => n + l.analytes.length, 0);
    expect(vue.reduce((n, l) => n + l.justifications.length, 0)).toBe(citations);
    expect(vue.map(l => l.analyte.code)).toEqual(['BIO_X', 'BIO_Y', 'BIO_Z']);
  });

  it("garde l'ordre des lignes du moteur, sans retrier ni filtrer", () => {
    const vue = vueParAnalyte([
      ligne('PANEL_N', 'non_indique_actuellement', [analyte('BIO_N')]),
      ligne('PANEL_R', 'recommande', [analyte('BIO_R')]),
    ]);
    expect(vue.map(l => l.analyte.code)).toEqual(['BIO_N', 'BIO_R']);
  });

  it('un panel qui citerait deux fois le même analyte ne compte qu’une fois', () => {
    const vue = vueParAnalyte([ligne('PANEL_A', 'recommande', [analyte('BIO_X'), analyte('BIO_X')])]);
    expect(vue).toHaveLength(1);
    expect(vue[0].justifications).toHaveLength(1);
  });

  it("ne modifie pas les lignes du moteur, qu'un autre lecteur consomme par panel", () => {
    const lignes = [
      ligne('PANEL_A', 'recommande', [analyte('BIO_X', true)]),
      ligne('PANEL_B', 'optionnel', [analyte('BIO_X', true)]),
    ];
    const avant = JSON.stringify(lignes);
    const vue = vueParAnalyte(lignes);
    expect(JSON.stringify(lignes)).toBe(avant);
    expect(vue[0].analyte.validationMedicaleRequise).toBe(true);
  });

  it('sans ligne, aucune analyse', () => {
    expect(vueParAnalyte([])).toEqual([]);
  });
});
