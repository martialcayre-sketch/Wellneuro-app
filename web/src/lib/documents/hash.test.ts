import { describe, expect, it } from 'vitest';
import { canonicalString, hashStable } from './hash';

describe('hashStable (isomorphe, sans node:crypto)', () => {
  it('est déterministe et insensible à l’ordre des clés', () => {
    expect(hashStable({ a: 1, b: 2 })).toBe(hashStable({ b: 2, a: 1 }));
    expect(canonicalString({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
  });

  it('distingue des valeurs différentes', () => {
    expect(hashStable({ a: 1 })).not.toBe(hashStable({ a: 2 }));
    expect(hashStable([{ id: 'x' }])).not.toBe(hashStable([{ id: 'y' }]));
  });

  it('rend un hexadécimal stable', () => {
    expect(hashStable(['a', 'b'])).toMatch(/^[0-9a-f]+$/);
  });
});
