import { describe, expect, it } from 'vitest';
import { canonicalSha256 } from '@/lib/clinical-engine/canonical';
import {
  C5_PRACTITIONER_FOODS,
  C5_PRACTITIONER_MANIFEST_HASH,
  C5_PRACTITIONER_MANIFEST_VERSION,
} from './manifest';

describe('manifeste praticien C5', () => {
  it('est versionné, ordonné et protégé par une empreinte canonique', () => {
    expect(C5_PRACTITIONER_FOODS).toHaveLength(12);
    expect(new Set(C5_PRACTITIONER_FOODS.map(food => food.foodRef)).size).toBe(12);
    expect(canonicalSha256({
      version: C5_PRACTITIONER_MANIFEST_VERSION,
      foods: C5_PRACTITIONER_FOODS,
    })).toBe(C5_PRACTITIONER_MANIFEST_HASH);
  });
});
