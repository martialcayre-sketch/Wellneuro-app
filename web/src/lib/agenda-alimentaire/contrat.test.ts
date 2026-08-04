import { describe, expect, it } from 'vitest';
import { ensureVersionContratLue } from './contrat';
import { AGENDA_ALI_CONTRACT_VERSION, AGENDA_ALI_CONTRACT_VERSIONS_LUES } from './types';

describe('ensureVersionContratLue — lecture indulgente, version stricte', () => {
  it('accepte la version courante', () => {
    expect(ensureVersionContratLue(AGENDA_ALI_CONTRACT_VERSION)).toBe(AGENDA_ALI_CONTRACT_VERSION);
  });

  it('accepte toute version déclarée lisible', () => {
    // Le test suit la constante plutôt que de recopier la liste : le jour où
    // une v2 s'ajoute, il la couvre sans être touché — et si quelqu'un RETIRE
    // une version de la liste, c'est ailleurs que ça doit rougir (la liste ne
    // se rétrécit jamais, cf. le commentaire de `types.ts`).
    for (const v of AGENDA_ALI_CONTRACT_VERSIONS_LUES) {
      expect(ensureVersionContratLue(v)).toBe(v);
    }
  });

  it('tolère l’absence de version — une ligne ancienne reste relisible', () => {
    expect(ensureVersionContratLue(undefined)).toBeUndefined();
    expect(ensureVersionContratLue(null)).toBeUndefined();
  });

  it('refuse une version inconnue EN LA NOMMANT', () => {
    // Sans le nom dans le message, le diagnostic obligerait à ouvrir la base
    // pour savoir ce qui a été lu.
    expect(() => ensureVersionContratLue('agenda-alimentaire-v9')).toThrow(
      /agenda-alimentaire-v9/,
    );
  });

  it('refuse ce qui n’est pas une chaîne', () => {
    // Un JSONB peut contenir n'importe quoi : un nombre ou un objet ne doivent
    // pas passer pour une absence de version, qui elle est tolérée.
    for (const valeur of [42, {}, [], true]) {
      expect(() => ensureVersionContratLue(valeur), JSON.stringify(valeur)).toThrow(TypeError);
    }
  });
});
