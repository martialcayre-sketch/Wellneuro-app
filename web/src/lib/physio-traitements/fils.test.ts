import { describe, expect, it } from 'vitest';
import { construireFils, estTete, teteUnique, type LigneDeFil } from './fils';

// Les fils d'une table en ajout seul ([[D-335]] §5) : la tête est la pose que
// rien ne vise ; un retrait ramène le fil à « non renseigné ».

const l = (id: string, ordre: number, acte: 'pose' | 'retrait', idLigneRemplacee: string | null = null): LigneDeFil =>
  ({ id, ordre: String(ordre), acte, idLigneRemplacee });

describe('construireFils', () => {
  it('un remplacement prolonge le fil ; un retrait le ferme ; une pose neuve en ouvre un autre', () => {
    const fils = construireFils([
      l('a1', 1, 'pose'),
      l('b1', 2, 'pose'),
      l('a2', 3, 'pose', 'a1'),
      l('b2', 4, 'retrait', 'b1'),
      l('c1', 5, 'pose'),
    ]);
    expect(fils.map(f => [f.racine.id, f.tete?.id ?? null, f.historique.map(x => x.id)])).toEqual([
      ['a1', 'a2', ['a1', 'a2']],
      ['b1', null, ['b1', 'b2']],
      ['c1', 'c1', ['c1']],
    ]);
  });

  it('l’ordre de la base fait foi, pas l’ordre de lecture', () => {
    const fils = construireFils([l('a2', 3, 'pose', 'a1'), l('a1', 1, 'pose')]);
    expect(fils).toHaveLength(1);
    expect(fils[0].tete?.id).toBe('a2');
  });
});

describe('teteUnique et estTete', () => {
  it('la pose que rien ne vise ; aucune après un retrait', () => {
    const critere = [l('p1', 1, 'pose'), l('p2', 2, 'pose', 'p1')];
    expect(teteUnique(critere)?.id).toBe('p2');
    expect(teteUnique([...critere, l('r', 3, 'retrait', 'p2')])).toBeNull();
    expect(estTete(critere[0], critere)).toBe(false);
    expect(estTete(critere[1], critere)).toBe(true);
  });
});
