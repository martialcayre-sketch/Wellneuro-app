import { describe, it, expect } from 'vitest';
import { resolveQidsLogic } from './packRegistryLogic';

describe('resolveQidsLogic — logique pure de résolution pack', () => {
  it('cas 1: registry vide → null (fallback legacy)', () => {
    const result = resolveQidsLogic([], ['Q1', 'Q2']);
    expect(result).toBeNull();
  });

  it('cas 2: registry = legacy (nominal) → registryQids avec ordre', () => {
    const registryQids = ['Q_SOM_06', 'Q_CAN_02', 'Q_DNSM'];
    const legacyQids = ['Q_SOM_06', 'Q_CAN_02', 'Q_DNSM'];
    const result = resolveQidsLogic(registryQids, legacyQids);
    expect(result).toEqual(registryQids);
    expect(result).toBe(registryQids); // Même référence (ordre préservé)
  });

  it('cas 3: registry ⊃ legacy (superset, registry a plus d\'éléments) → null', () => {
    const registryQids = ['Q1', 'Q2', 'Q3'];
    const legacyQids = ['Q1', 'Q2'];
    const result = resolveQidsLogic(registryQids, legacyQids);
    expect(result).toBeNull();
  });

  it('cas 4: registry ⊂ legacy (subset, registry a moins d\'éléments) → null', () => {
    const registryQids = ['Q1'];
    const legacyQids = ['Q1', 'Q2'];
    const result = resolveQidsLogic(registryQids, legacyQids);
    expect(result).toBeNull();
  });

  it('cas 5: registry ≠ legacy (contenu différent, même cardinal) → null', () => {
    const registryQids = ['Q1', 'Q2'];
    const legacyQids = ['Q1', 'Q3'];
    const result = resolveQidsLogic(registryQids, legacyQids);
    expect(result).toBeNull();
  });

  it('cas 6: registry existant, legacy vide → null', () => {
    const registryQids = ['Q1', 'Q2'];
    const legacyQids: string[] = [];
    const result = resolveQidsLogic(registryQids, legacyQids);
    expect(result).toBeNull();
  });

  it('cas 7: registry et legacy tous deux vides → null', () => {
    const result = resolveQidsLogic([], []);
    expect(result).toBeNull();
  });

  it('bonus: ordre préservé dans registry nominal (cardinal 3)', () => {
    // Vérifie que l'ordre du registre est vraiment retourné
    const registryQids = ['Q_DNSM', 'Q_SOM_06', 'Q_CAN_02'];
    const legacyQids = ['Q_SOM_06', 'Q_CAN_02', 'Q_DNSM']; // Ordre différent
    const result = resolveQidsLogic(registryQids, legacyQids);
    expect(result).toEqual(registryQids);
    expect(result?.[0]).toBe('Q_DNSM'); // Ordre registry préservé
  });
});
