import { describe, expect, it } from 'vitest';
import {
  ALIAS_HISTORIQUES,
  IDS_ASSIGNABLES,
  PASSATION_PRATICIEN,
  listeBibliotheque,
} from './bibliotheque';

describe('listeBibliotheque', () => {
  const entrees = listeBibliotheque();
  const parId = new Map(entrees.map(e => [e.id, e]));

  it('expose les instruments assignables avec leur nombre de questions', () => {
    const pss = parId.get('Q_STR_02');
    expect(pss).toBeDefined();
    expect(pss?.assignable).toBe(true);
    expect(pss?.nbQuestions).toBe(10);
    expect(pss?.passationPraticien).toBe(false);
  });

  it('marque les alias historiques non assignables, grille cible renseignée', () => {
    for (const [alias, cible] of Object.entries(ALIAS_HISTORIQUES)) {
      const entree = parId.get(alias);
      expect(entree, alias).toBeDefined();
      expect(entree?.assignable).toBe(false);
      expect(entree?.aliasVers).toBe(cible);
      expect(IDS_ASSIGNABLES.has(alias)).toBe(false);
    }
  });

  it('expose les 5 passations praticien, jamais assignables', () => {
    for (const { id } of PASSATION_PRATICIEN) {
      const entree = parId.get(id);
      expect(entree, id).toBeDefined();
      expect(entree?.passationPraticien).toBe(true);
      expect(entree?.assignable).toBe(false);
      expect(IDS_ASSIGNABLES.has(id)).toBe(false);
    }
  });

  it('ne contient aucun doublon d’identifiant', () => {
    expect(parId.size).toBe(entrees.length);
  });
});
