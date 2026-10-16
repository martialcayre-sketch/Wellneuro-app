import { describe, expect, it } from 'vitest';
import { controlerLibelleContreStructure, controlerVersionContreStructure, type ContexteControle } from './controle';
import { empreinteTexte } from './empreintes';

// Structure SYNTHÉTIQUE : la vraie est vide (porte 23).
const S = 'c'.repeat(64);
const CONTEXTE: ContexteControle = {
  structure: {
    fiches: [
      { id: 'FU_SYNTH', question: 'QC_SYNTH', besoins: [2], nature: 'mesure_directe', usageDecisionnel: 'confirmer_hypothese', securiteAdmissibilite: false, statutUsage: 'etaye_valide', population: 'POP_SYNTH', hypotheses: ['HYP_SYNTH'], codesAnalyte: [], claims: [], rubriques: ['question', 'population'] },
    ],
    questions: ['QC_SYNTH'],
    hypotheses: ['HYP_SYNTH'],
    populations: ['POP_SYNTH'],
  },
  empreinte: S,
};

describe('controlerVersionContreStructure — le texte rédige la structure du jour', () => {
  it('une version conforme passe', () => {
    expect(controlerVersionContreStructure({ ficheId: 'FU_SYNTH', rubriques: ['population', 'question'], structureSha256: S }, CONTEXTE)).toEqual([]);
  });

  it('une fiche que la structure ne déclare pas est refusée', () => {
    expect(controlerVersionContreStructure({ ficheId: 'FU_AUTRE', rubriques: ['question'], structureSha256: S }, CONTEXTE)).toEqual([
      { code: 'fiche_hors_structure' },
    ]);
  });

  it('une structure périmée et des rubriques non conformes sont nommées', () => {
    expect(
      controlerVersionContreStructure({ ficheId: 'FU_SYNTH', rubriques: ['question', 'limites'], structureSha256: 'd'.repeat(64) }, CONTEXTE),
    ).toEqual([{ code: 'structure_perimee' }, { code: 'rubriques_non_conformes', manquantes: ['population'], enTrop: ['limites'] }]);
  });

  it('par défaut, la structure du dépôt — vide — refuse toute fiche', () => {
    expect(controlerVersionContreStructure({ ficheId: 'FU_SYNTH', rubriques: ['question'], structureSha256: S })).toEqual([
      { code: 'fiche_hors_structure' },
    ]);
  });
});

describe('controlerLibelleContreStructure — terme déclaré, sous sa nature, structure du jour', () => {
  it('un libellé conforme passe', () => {
    expect(controlerLibelleContreStructure({ termeId: 'HYP_SYNTH', nature: 'hypothese', structureSha256: S }, CONTEXTE)).toEqual([]);
    expect(controlerLibelleContreStructure({ termeId: 'POP_SYNTH', nature: 'population', structureSha256: S }, CONTEXTE)).toEqual([]);
  });

  it('un terme non déclaré, une nature divergente, une structure périmée sont refusés', () => {
    expect(controlerLibelleContreStructure({ termeId: 'HYP_AUTRE', nature: 'hypothese', structureSha256: S }, CONTEXTE)).toEqual([
      { code: 'terme_hors_structure' },
    ]);
    expect(controlerLibelleContreStructure({ termeId: 'HYP_SYNTH', nature: 'population', structureSha256: S }, CONTEXTE)).toEqual([
      { code: 'nature_divergente' },
    ]);
    expect(
      controlerLibelleContreStructure({ termeId: 'HYP_SYNTH', nature: 'hypothese', structureSha256: 'd'.repeat(64) }, CONTEXTE),
    ).toEqual([{ code: 'structure_perimee' }]);
  });
});

describe('empreinteTexte — celle que la base recalcule', () => {
  it('SHA-256 du texte en UTF-8, hexadécimal minuscule', () => {
    // Valeurs de référence calculées par PostgreSQL :
    // `encode(sha256(convert_to(t, 'UTF8')), 'hex')`.
    expect(empreinteTexte('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    // Un caractère non ASCII se hache sur ses octets UTF-8, comme en base.
    expect(empreinteTexte('é')).toBe('4a99557e4033c3539de2eb65472017cad5f9557f7a0625a09f1c3f6e2ba69c4c');
  });
});
