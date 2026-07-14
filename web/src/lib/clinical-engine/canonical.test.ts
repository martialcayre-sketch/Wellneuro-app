import { describe, expect, it } from 'vitest';
import { canonicalJson, canonicalSha256 } from './canonical';

describe('sérialisation canonique', () => {
  it('produit le même JSON et le même hash quel que soit l’ordre des clés', () => {
    const left = { z: 1, a: { y: true, x: 'valeur' }, absent: undefined };
    const right = { a: { x: 'valeur', y: true }, z: 1 };

    expect(canonicalJson(left)).toBe(canonicalJson(right));
    expect(canonicalSha256(left)).toBe(canonicalSha256(right));
  });

  it('change le hash quand une entrée change', () => {
    expect(canonicalSha256({ score: 1 })).not.toBe(canonicalSha256({ score: 2 }));
  });

  it.each([NaN, Infinity, -Infinity, new Date('2026-01-01T00:00:00Z')])('rejette une valeur non JSON : %s', value => {
    expect(() => canonicalJson({ value })).toThrow(TypeError);
  });

  it('rejette undefined dans un tableau', () => {
    expect(() => canonicalJson([undefined])).toThrow(TypeError);
  });

  it('rejette un tableau creux', () => {
    const sparse = new Array(2);
    sparse[1] = 'valeur';
    expect(() => canonicalJson(sparse)).toThrow('tableaux creux');
  });
});
