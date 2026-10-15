import { describe, expect, it } from 'vitest';
import {
  derniereVersionValidee,
  etatDeLaVersion,
  etatDuLibelle,
  etatDuTexte,
  jetonDernierActe,
  type ActeLu,
  type RubriqueLue,
} from './etat';

// Empreintes et textes SYNTHÉTIQUES ([[D-251]] §4).
const E1 = 'a'.repeat(64);
const E2 = 'b'.repeat(64);
const S = 'c'.repeat(64);
const S_ANCIENNE = 'd'.repeat(64);
const LE = new Date('2026-10-16T02:00:00.000Z');

function acte(ordre: bigint, over: Partial<ActeLu> = {}): ActeLu {
  return { ordre, acte: 'validee', empreinte: E1, validateur: 'x@exemple.fr', relectureIntegrale: true, motif: null, le: LE, ...over };
}

function rubrique(nom: string, actes: ActeLu[] = [], empreinte = E1): RubriqueLue {
  return { rubrique: nom, empreinte, actes };
}

const ATTENDUES = ['question', 'population'];
const CONTEXTE = { empreinteStructure: S, rubriquesAttendues: ATTENDUES };

describe('etatDuTexte — le dernier acte décide, au sens d’ordre', () => {
  it('sans acte : à valider', () => {
    expect(etatDuTexte(E1, [])).toEqual({ etat: 'a_valider' });
  });

  it('le dernier par ordre, pas le premier de la liste', () => {
    const etat = etatDuTexte(E1, [acte(BigInt(3), { acte: 'retiree', motif: 'Motif.' }), acte(BigInt(5)), acte(BigInt(4), { acte: 'retiree', motif: 'M.' })]);
    expect(etat).toMatchObject({ etat: 'validee', ordre: '5' });
  });

  it('un acte inconnu, une empreinte étrangère, un retrait muet : illisible, jamais un état plausible', () => {
    expect(etatDuTexte(E1, [acte(BigInt(1), { acte: 'publiee' })])).toEqual({ etat: 'illisible', raison: 'acte_inconnu' });
    expect(etatDuTexte(E1, [acte(BigInt(1), { empreinte: E2 })])).toEqual({ etat: 'illisible', raison: 'empreinte_acte_divergente' });
    expect(etatDuTexte(E1, [acte(BigInt(1), { acte: 'retiree', motif: '\t ' })])).toEqual({ etat: 'illisible', raison: 'retrait_sans_motif' });
  });

  it('le jeton est l’ordre du dernier acte, en chaîne', () => {
    expect(jetonDernierActe([])).toBeNull();
    expect(jetonDernierActe([acte(BigInt(2)), acte(BigInt(9)), acte(BigInt(4))])).toBe('9');
  });
});

describe('etatDeLaVersion — toutes les rubriques attendues, sur la structure du jour (arbitrages 5, 10)', () => {
  it('toutes les rubriques attendues validées : validée', () => {
    const v = { structureSha256: S, rubriques: [rubrique('question', [acte(BigInt(1))]), rubrique('population', [acte(BigInt(2))])] };
    expect(etatDeLaVersion(v, CONTEXTE)).toEqual({ etat: 'validee' });
  });

  it('une seule rubrique validée sur deux : à valider, avec le compte', () => {
    const v = { structureSha256: S, rubriques: [rubrique('question', [acte(BigInt(1))]), rubrique('population')] };
    expect(etatDeLaVersion(v, CONTEXTE)).toEqual({ etat: 'a_valider', validees: 1, attendues: 2 });
  });

  it('une rubrique retirée l’emporte sur les validées', () => {
    const v = {
      structureSha256: S,
      rubriques: [rubrique('question', [acte(BigInt(1))]), rubrique('population', [acte(BigInt(2)), acte(BigInt(3), { acte: 'retiree', motif: 'Motif.' })])],
    };
    expect(etatDeLaVersion(v, CONTEXTE)).toEqual({ etat: 'retiree', rubriques: ['population'] });
  });

  it('une structure re-signée rend la version à relire, même toute validée', () => {
    const v = { structureSha256: S_ANCIENNE, rubriques: [rubrique('question', [acte(BigInt(1))]), rubrique('population', [acte(BigInt(2))])] };
    expect(etatDeLaVersion(v, CONTEXTE)).toEqual({ etat: 'a_relire' });
  });

  it('une rubrique manquante ou en trop : non conforme, jamais validée', () => {
    const manque = { structureSha256: S, rubriques: [rubrique('question', [acte(BigInt(1))])] };
    expect(etatDeLaVersion(manque, CONTEXTE)).toEqual({ etat: 'non_conforme', manquantes: ['population'], enTrop: [] });
    const trop = {
      structureSha256: S,
      rubriques: [rubrique('question', [acte(BigInt(1))]), rubrique('population', [acte(BigInt(2))]), rubrique('limites', [acte(BigInt(3))])],
    };
    expect(etatDeLaVersion(trop, CONTEXTE)).toEqual({ etat: 'non_conforme', manquantes: [], enTrop: ['limites'] });
  });

  it('une fiche absente de la structure : hors structure', () => {
    const v = { structureSha256: S, rubriques: [rubrique('question', [acte(BigInt(1))])] };
    expect(etatDeLaVersion(v, { empreinteStructure: S, rubriquesAttendues: null })).toEqual({ etat: 'hors_structure' });
  });

  it('l’illisible l’emporte sur tout, y compris sur « à relire » (DC-24)', () => {
    const v = { structureSha256: S_ANCIENNE, rubriques: [rubrique('question', [acte(BigInt(1), { empreinte: E2 })]), rubrique('population')] };
    expect(etatDeLaVersion(v, CONTEXTE)).toEqual({ etat: 'illisible', rubriques: ['question'] });
  });
});

describe('derniereVersionValidee — le plus haut numéro validé', () => {
  it('une version plus ancienne validée ne remplace pas la plus récente validée', () => {
    const versions = [
      { numero: 1, etat: { etat: 'validee' as const } },
      { numero: 3, etat: { etat: 'validee' as const } },
      { numero: 4, etat: { etat: 'a_valider' as const, validees: 0, attendues: 2 } },
    ];
    expect(derniereVersionValidee(versions)?.numero).toBe(3);
    expect(derniereVersionValidee([{ numero: 1, etat: { etat: 'a_relire' as const } }])).toBeNull();
  });
});

describe('etatDuLibelle — terme déclaré, structure du jour, puis actes (arbitrage 15)', () => {
  const libelle = { libelleSha256: E1, structureSha256: S };

  it('validé sur la structure du jour', () => {
    expect(etatDuLibelle(libelle, [acte(BigInt(1))], { empreinteStructure: S, termeDeclare: true })).toMatchObject({ etat: 'validee' });
  });

  it('une structure re-signée rend le libellé à relire', () => {
    expect(etatDuLibelle(libelle, [acte(BigInt(1))], { empreinteStructure: S_ANCIENNE, termeDeclare: true })).toEqual({ etat: 'a_relire' });
  });

  it('un terme retiré de la structure : hors structure', () => {
    expect(etatDuLibelle(libelle, [acte(BigInt(1))], { empreinteStructure: S, termeDeclare: false })).toEqual({ etat: 'hors_structure' });
  });

  it('un acte illisible l’emporte', () => {
    expect(etatDuLibelle(libelle, [acte(BigInt(1), { acte: 'x' })], { empreinteStructure: S_ANCIENNE, termeDeclare: false })).toEqual({
      etat: 'illisible',
      raison: 'acte_inconnu',
    });
  });
});
