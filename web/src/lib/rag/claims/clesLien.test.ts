import { describe, expect, it } from 'vitest';
import { BESOIN_SOURCES } from '@/lib/equilibre/constants';
import { BESOINS } from '@/lib/fiches-usage/vocabulaire';
import { clesLienDuClaim, lireClesLien } from './clesLien';

describe('lireClesLien — les clés de lien d’un claim (D-320)', () => {
  it('la liste des besoins est celle des douze besoins du guide (BESOIN_SOURCES)', () => {
    expect([...BESOINS]).toEqual(Object.keys(BESOIN_SOURCES).map(Number).sort((a, b) => a - b));
  });

  it('accepte des besoins de 1 à 12 et une rubrique des fiches d’usage', () => {
    expect(lireClesLien([4, 2], 'options')).toEqual({ besoins: [2, 4], rubrique: 'options' });
    expect(lireClesLien([12, 1, 12], 'limites')).toEqual({ besoins: [1, 12], rubrique: 'limites' });
  });

  it.each([
    ['vide', []],
    ['absent', undefined],
    ['13', [13]],
    ['0', [0]],
    ['non entier', [2.5]],
    ['en chaîne', ['2']],
    ['imbriqué', [[3]]],
    ['objet', { 0: 2 }],
  ])('refuse des besoins %s', (_cas, besoins) => {
    expect(lireClesLien(besoins, 'options')).toBeNull();
  });

  it.each([
    ['de l’ancien vocabulaire', 'indication'],
    ['absente', undefined],
    ['vide', ''],
    ['« explication patient », hors du lot', 'explication_patient'],
  ])('refuse une rubrique %s', (_cas, rubrique) => {
    expect(lireClesLien([2], rubrique)).toBeNull();
  });

  it('lit les clés d’un claim, et rien quand elles manquent', () => {
    expect(clesLienDuClaim({ page: 3, besoins: [2], rubrique: 'question' })).toEqual({
      besoins: [2],
      rubrique: 'question',
    });
    expect(clesLienDuClaim({ page: 3 })).toBeNull();
  });
});
