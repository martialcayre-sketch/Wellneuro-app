import { describe, expect, it } from 'vitest';
import {
  descriptifsDeScores,
  getArrayField,
  syntheseSansRedondanceSousScores,
} from './descriptifsScores';

describe('getArrayField', () => {
  it('rend les éléments en chaînes, et [] pour une clé absente ou non tableau', () => {
    expect(getArrayField({ missingIds: ['Q1', 2] }, 'missingIds')).toEqual(['Q1', '2']);
    expect(getArrayField({ missingIds: 'Q1' }, 'missingIds')).toEqual([]);
    expect(getArrayField({}, 'missingIds')).toEqual([]);
    expect(getArrayField(null, 'missingIds')).toEqual([]);
  });
});

describe('descriptifsDeScores', () => {
  it('rend une dimension avec son dénominateur, `total` ou `val`, `max` ou `maxTotal`', () => {
    expect(
      descriptifsDeScores({
        dimensions: [
          { id: 'D1', label: 'Humeur', total: 7, max: 12 },
          { id: 'D2', label: 'Énergie', val: 3, maxTotal: 9 },
        ],
      }),
    ).toEqual([
      { cle: 'dimensions', id: 'dimensions:D1', label: 'Humeur', texte: '7/12' },
      { cle: 'dimensions', id: 'dimensions:D2', label: 'Énergie', texte: '3/9' },
    ]);
  });

  it('une unité écrite l’emporte sur le dénominateur', () => {
    expect(
      descriptifsDeScores({
        apports: [{ id: 'PROT', label: 'Protéines', total: 86.6, max: 100, unite: 'g/jour' }],
      }),
    ).toEqual([{ cle: 'apports', id: 'apports:PROT', label: 'Protéines', texte: '86.6 g/jour' }]);
  });

  it('une catégorie sans nombre se lit par sa positivité', () => {
    const axes = descriptifsDeScores({
      categories: [
        { id: 'C1', label: 'Catégorie 1', positive: true },
        { id: 'C2', label: 'Catégorie 2', positive: false },
      ],
    });
    expect(axes.map(a => a.texte)).toEqual(['positive', 'négative']);
  });

  it('un axe sans valeur ni positivité est « non mesuré », jamais « — » ni 0', () => {
    const [axe] = descriptifsDeScores({ components: [{ id: 'C3', label: 'Latence', total: null, max: 3 }] });
    expect(axe.texte).toBe('non mesuré');
  });

  it('parcourt les six porteurs dans leur ordre, et rien pour des scores nuls', () => {
    const axes = descriptifsDeScores({
      apports: [{ id: 'A', total: 1 }],
      phases: [{ id: 'P', total: 2 }],
      parts: [{ id: 'T', total: 3 }],
      categories: [{ id: 'K', positive: true }],
      components: [{ id: 'C', total: 4 }],
      dimensions: [{ id: 'D', total: 5 }],
    });
    expect(axes.map(a => a.cle)).toEqual(['dimensions', 'components', 'categories', 'parts', 'phases', 'apports']);
    // Sans libellé, l'identifiant en tient lieu.
    expect(axes[0].label).toBe('D');
    expect(descriptifsDeScores(null)).toEqual([]);
  });
});

describe('syntheseSansRedondanceSousScores', () => {
  it('coupe le détail par rubrique quand des sous-scores l’affichent déjà', () => {
    expect(
      syntheseSansRedondanceSousScores('Fatigue modérée. Détail — Physique 3/10, Mentale 4/10.', true),
    ).toBe('Fatigue modérée');
    expect(
      syntheseSansRedondanceSousScores('Profil perturbé. Rubriques à noter — Sommeil : élevé.', true),
    ).toBe('Profil perturbé');
  });

  it('laisse le texte intact sans sous-scores, ou sans marqueur', () => {
    const texte = 'Fatigue modérée. Détail — Physique 3/10.';
    expect(syntheseSansRedondanceSousScores(texte, false)).toBe(texte);
    expect(syntheseSansRedondanceSousScores('Fatigue modérée', true)).toBe('Fatigue modérée');
    expect(syntheseSansRedondanceSousScores('', true)).toBe('');
  });
});
