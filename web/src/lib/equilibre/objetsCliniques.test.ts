import { describe, it, expect } from 'vitest';
import { calculerClarte, calculerObjetsCliniques, calculerReserveAdaptation, calculerStabiliteMetabolique } from './objetsCliniques';

describe('objetsCliniques — formules de calcul zéro-dépendance', () => {
  it('aucune réponse → les 3 objets dérivés sont null', () => {
    expect(calculerClarte({})).toBeNull();
    expect(calculerReserveAdaptation({})).toBeNull();
    expect(calculerStabiliteMetabolique({})).toBeNull();
  });

  it('clarté doit être 0 quand DA/NA/SE sont au pire score', () => {
    const reponsesInf03Basses = {
      Q_INF_03: Object.fromEntries([
        ...Array.from({ length: 10 }, (_, i) => [`D${i + 1}`, '4']),
        ...Array.from({ length: 10 }, (_, i) => [`N${i + 1}`, '4']),
        ...Array.from({ length: 10 }, (_, i) => [`S${i + 1}`, '4']),
        ...Array.from({ length: 10 }, (_, i) => [`ME${i + 1}`, '0']),
      ]),
    };
    const result = calculerClarte(reponsesInf03Basses);
    expect(result).toBe(0);
  });

  it('stabilité métabolique avec hyperexcitabilité nulle (seule source répondue) doit être 1', () => {
    const reponsesInf01Nulles = {
      Q_INF_01: Object.fromEntries(Array.from({ length: 24 }, (_, i) => [`H${i + 1}`, '0'])),
    };
    const result = calculerStabiliteMetabolique(reponsesInf01Nulles);
    expect(result).toBe(1);
  });

  it('calculerObjetsCliniques regroupe bien les 4 objets en une photo', () => {
    const objets = calculerObjetsCliniques({});
    expect(objets.indiceGlobal.scoreGlobal).toBeNull();
    expect(objets.clarte).toBeNull();
  });

  it('réserve d\'adaptation sans réponse doit être null', () => {
    expect(calculerReserveAdaptation({})).toBeNull();
  });
});
