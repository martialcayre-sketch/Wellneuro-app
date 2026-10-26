import { describe, expect, it } from 'vitest';

import { cleBesoin, grouperBesoinsParStrate, STRATES_BESOINS } from './ordreBesoins';

// Q1 de l'audit des instruments (r3_09) : ordre fixe, B1 à B12 groupé par
// strate, clé « Bn · libellé » — jamais l'ordre reçu.
describe('ordreBesoins', () => {
  it('la clé d’un besoin : « Bn · libellé »', () => {
    expect(cleBesoin(7, 'Sensations favorables (cinq sens)')).toBe('B7 · Sensations favorables (cinq sens)');
  });

  it('les strates, dans l’ordre et sous les noms des anneaux des cercles', () => {
    expect(STRATES_BESOINS.map(s => s.nom)).toEqual(['Corps', 'Ancrage', 'Esprit']);
  });

  it('range par numéro et groupe par strate, quel que soit l’ordre reçu ; une strate vide n’a pas de groupe', () => {
    // L'ordre « creux d'abord » d'un ancien conteneur.
    const recus = [
      { id: 9, strate: 'ANCRAGE' as const },
      { id: 3, strate: 'CORPS' as const },
      { id: 1, strate: 'CORPS' as const },
      { id: 7, strate: 'ANCRAGE' as const },
    ];
    expect(grouperBesoinsParStrate(recus, b => b.id).map(g => [g.nom, g.besoins.map(b => b.id)])).toEqual([
      ['Corps', [1, 3]],
      ['Ancrage', [7, 9]],
    ]);
    // L'entrée n'est pas modifiée.
    expect(recus.map(b => b.id)).toEqual([9, 3, 1, 7]);
  });
});
