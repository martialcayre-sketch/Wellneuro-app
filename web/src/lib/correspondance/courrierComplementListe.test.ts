import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { ProtocolAction } from '@/lib/clinical-engine/types';
import { listeComplementsCibles, listeCouverte, memeListe } from './courrierComplementListe';

const V4 = 'c1-protocol-draft-v4';
const sha = (texte: string) => createHash('sha256').update(texte, 'utf8').digest('hex');

function complement(actionId: string, extra: Partial<ProtocolAction> = {}): ProtocolAction {
  return {
    actionId,
    type: 'supplement_exploration',
    title: `Intention ${actionId}`,
    idealPlan: 'idéal',
    minimalPlan: 'minimal',
    rescuePlan: 'secours',
    limitations: [],
    natureComplement: 'cible',
    interventionStatus: 'active',
    ...extra,
  };
}

describe('listeComplementsCibles — la liste que le trigger recalcule (D-345 §5)', () => {
  it('élément sans référence catalogue : <actionId>:<sha256(title)>', () => {
    const liste = listeComplementsCibles([complement('a1')], V4);
    expect(liste).toEqual({
      ok: true,
      elements: [`a1:${sha('Intention a1')}`],
      sha256: sha(`a1:${sha('Intention a1')}`),
    });
  });

  it('élément avec référence catalogue : l’ingrédient entre dans l’identité', () => {
    const liste = listeComplementsCibles([complement('a1', {
      supplementCatalogRef: { ingredientId: 'ing-1', ruleId: 'r', ruleVersion: 1, justification: 'j' },
    })], V4);
    expect(liste.ok && liste.elements).toEqual([`a1:${sha('Intention a1')}:${sha('ing-1')}`]);
  });

  it('triée en ordre d’octets, distincte, empreinte des éléments joints par \\n', () => {
    const liste = listeComplementsCibles([complement('b'), complement('a'), complement('B'), complement('a')], V4);
    expect(liste.ok).toBe(true);
    if (!liste.ok) return;
    expect(liste.elements.map(e => e.split(':')[0])).toEqual(['B', 'a', 'b']);
    expect(liste.sha256).toBe(sha(liste.elements.join('\n')));
  });

  it('ne compte que les intentions de complément marquées « ciblé »', () => {
    const liste = listeComplementsCibles([
      complement('a'),
      complement('m', { natureComplement: 'multivitamine_vente_libre' }),
      complement('n', { natureComplement: undefined }),
      { ...complement('f'), type: 'food', natureComplement: undefined },
    ], V4);
    expect(liste.ok && liste.elements.map(e => e.split(':')[0])).toEqual(['a']);
  });

  it('refuse EN CLAIR ce que le trigger refuserait par une exception', () => {
    expect(listeComplementsCibles([complement('a')], 'c1-protocol-draft-v3')).toEqual({ ok: false, raison: 'contrat_non_v4' });
    expect(listeComplementsCibles([complement('a')], null)).toEqual({ ok: false, raison: 'contrat_non_v4' });
    expect(listeComplementsCibles([], V4)).toEqual({ ok: false, raison: 'aucun_complement_cible' });
    expect(listeComplementsCibles([complement('a:b')], V4)).toEqual({ ok: false, raison: 'identifiant_hors_format' });
    expect(listeComplementsCibles([complement('é')], V4)).toEqual({ ok: false, raison: 'identifiant_hors_format' });
    expect(listeComplementsCibles([complement('a', { title: '  ' })], V4)).toEqual({ ok: false, raison: 'intitule_vide' });
    expect(listeComplementsCibles([complement('a', { supplementCatalogRef: null as never })], V4))
      .toEqual({ ok: false, raison: 'reference_catalogue_invalide' });
    expect(listeComplementsCibles([complement('a', {
      supplementCatalogRef: { ingredientId: ' ', ruleId: 'r', ruleVersion: 1, justification: 'j' },
    })], V4)).toEqual({ ok: false, raison: 'reference_catalogue_invalide' });
  });
});

describe('listeCouverte — inclusion dans UNE remise (arbitrage du 2026-10-24)', () => {
  it('une liste contenue dans la liste d’une remise est couverte', () => {
    expect(listeCouverte(['a'], [{ complements: ['a', 'b'] }])).toBe(true);
    expect(listeCouverte(['a', 'b'], [{ complements: ['a', 'b'] }])).toBe(true);
  });

  it('un complément ajouté n’est pas couvert', () => {
    expect(listeCouverte(['a', 'c'], [{ complements: ['a', 'b'] }])).toBe(false);
  });

  it('l’union de deux remises ne couvre pas : le médecin n’a jamais lu la liste entière', () => {
    expect(listeCouverte(['a', 'b'], [{ complements: ['a'] }, { complements: ['b'] }])).toBe(false);
  });

  it('aucune remise, ou liste vide : non couverte', () => {
    expect(listeCouverte(['a'], [])).toBe(false);
    expect(listeCouverte([], [{ complements: ['a'] }])).toBe(false);
  });

  it('memeListe compare élément par élément', () => {
    expect(memeListe(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(memeListe(['a', 'b'], ['b', 'a'])).toBe(false);
    expect(memeListe(['a'], ['a', 'b'])).toBe(false);
  });
});
