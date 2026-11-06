import { describe, expect, it } from 'vitest';
import type { ConflitSourcesDeclare } from '@/lib/clinical/conflitsSourcesV1';
import { causesARelire, dernierActe, etatVersion, jetonDernierActe, refusAlternance, type ContexteARelire, type TeteArbitrageLue } from './etat';
import { empreinteEntreeConflit } from './registreConflits';

// Textes synthétiques ([[D-251]] §4) : aucune position réelle.
const ENTREE = {
  id: 'CS-BANC-01',
  statut: 'publiee',
  objet: 'Objet synthétique ?',
  claims: [
    { claimId: 'WN-CL-0001-001', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0001-002', versionClaim: 'v1.0' },
  ],
  positions: ['A', 'B'],
  importance: 'moyenne',
  hypotheses: [],
  actionSuggeree: 'x',
  limitations: [],
  fichesUsage: ['FU_BANC_A'],
} as unknown as ConflitSourcesDeclare;

describe('états d’une version — le dernier acte au sens d’`ordre`', () => {
  it('lit l’ordre, jamais la position dans la liste', () => {
    const actes = [{ ordre: '12', acte: 'retiree' }, { ordre: '3', acte: 'signee' }];
    expect(dernierActe(actes)?.ordre).toBe('12');
    expect(jetonDernierActe(actes)).toBe('12');
    expect(etatVersion(actes)).toBe('retiree');
    // Comparaison numérique : « 9 » < « 10 ».
    expect(etatVersion([{ ordre: BigInt(10), acte: 'signee' }, { ordre: BigInt(9), acte: 'retiree' }])).toBe('signee');
  });
  it('aucun acte = brouillon ; un acte hors liste = illisible', () => {
    expect(etatVersion([])).toBe('brouillon');
    expect(jetonDernierActe([])).toBeNull();
    expect(etatVersion([{ ordre: BigInt(1), acte: 'validee' }])).toBe('illisible');
  });
});

describe('les actes alternent (arbitrage du 2026-11-06, question 1)', () => {
  it('signer : un brouillon ou une version retirée, jamais une version signée', () => {
    expect(refusAlternance('brouillon', 'signee')).toBeNull();
    expect(refusAlternance('retiree', 'signee')).toBeNull();
    expect(refusAlternance('signee', 'signee')).toBe('deja_signee');
  });
  it('retirer : une version signée seulement', () => {
    expect(refusAlternance('signee', 'retiree')).toBeNull();
    expect(refusAlternance('brouillon', 'retiree')).toBe('jamais_signee');
    expect(refusAlternance('retiree', 'retiree')).toBe('deja_retiree');
  });
  it('un état illisible refuse tout', () => {
    expect(refusAlternance('illisible', 'signee')).toBe('etat_illisible');
    expect(refusAlternance('illisible', 'retiree')).toBe('etat_illisible');
  });
});

describe('une tête d’arbitrage « à relire » — les six cas d’A3', () => {
  const tetePosition: TeteArbitrageLue = {
    conflitId: 'CS-BANC-01',
    ficheId: 'FU_BANC_A',
    claimRetenu: null,
    idPositionVersion: 'versionretenue01',
    conflitSha256: empreinteEntreeConflit(ENTREE),
  };
  const teteClaim: TeteArbitrageLue = { ...tetePosition, claimRetenu: 'WN-CL-0001-001@v1.0', idPositionVersion: null };
  const base: ContexteARelire = {
    entree: ENTREE,
    structureSignee: true,
    fichesDeLaStructure: new Set(['FU_BANC_A']),
    versionRetenue: { courante: true, etat: 'signee', appuisNonFrais: [] },
    claimsFrais: new Set(['WN-CL-0001-001@v1.0']),
  };

  it('courante quand rien n’a bougé', () => {
    expect(causesARelire(tetePosition, base)).toEqual([]);
    expect(causesARelire(teteClaim, base)).toEqual([]);
  });
  it('1. conflit modifié', () => {
    const modifie = { ...ENTREE, objet: 'Autre objet ?' } as ConflitSourcesDeclare;
    expect(causesARelire(teteClaim, { ...base, entree: modifie })).toContain('conflit_modifie_ou_depublie');
  });
  it('1 bis. conflit dépublié', () => {
    expect(causesARelire(teteClaim, { ...base, entree: null })).toContain('conflit_modifie_ou_depublie');
  });
  it('2. fiche retirée de la structure, ou de la liste curée', () => {
    expect(causesARelire(teteClaim, { ...base, fichesDeLaStructure: new Set() })).toEqual(['fiche_hors_structure_ou_liste']);
    expect(causesARelire(teteClaim, { ...base, structureSignee: false })).toEqual(['fiche_hors_structure_ou_liste']);
    const sansListe = { ...ENTREE, fichesUsage: [] } as unknown as ConflitSourcesDeclare;
    const tete = { ...teteClaim, conflitSha256: empreinteEntreeConflit(sansListe) };
    expect(causesARelire(tete, { ...base, entree: sansListe })).toEqual(['fiche_hors_structure_ou_liste']);
  });
  it('3. position retirée', () => {
    expect(causesARelire(tetePosition, { ...base, versionRetenue: { courante: true, etat: 'retiree', appuisNonFrais: [] } })).toEqual([
      'position_retiree',
    ]);
  });
  it('4. position remplacée par une version neuve', () => {
    expect(causesARelire(tetePosition, { ...base, versionRetenue: { courante: false, etat: 'signee', appuisNonFrais: [] } })).toEqual([
      'position_remplacee',
    ]);
  });
  it('5. appui de la position périmé (absent compris)', () => {
    expect(
      causesARelire(tetePosition, { ...base, versionRetenue: { courante: true, etat: 'signee', appuisNonFrais: ['WN-CL-0009-009@v1.0'] } }),
    ).toEqual(['position_a_relire']);
  });
  it('6. claim retenu qui n’est plus frais, ou absent du corpus', () => {
    expect(causesARelire(teteClaim, { ...base, claimsFrais: new Set() })).toEqual(['claim_non_frais']);
  });
});
