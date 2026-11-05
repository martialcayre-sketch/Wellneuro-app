import { describe, expect, it } from 'vitest';
import { lireDecision, lireToutesDecisions } from './lireDecision';

// L'aide commune des bancs qui relisent un texte opposable (D-418 §5) : elle
// lit le vrai registre, et une décision absente LÈVE — jamais une chaîne vide
// qui laisserait passer un découpage vide ou un `toContain` négatif.
describe('lireDecision — le registre, un fichier par décision', () => {
  it('rend la décision par son numéro, titre en tête', () => {
    expect(lireDecision('D-418')).toMatch(/^# D-418 — Le registre des décisions passe à un fichier par décision/);
    expect(lireDecision('418')).toBe(lireDecision('D-418'));
  });

  it('lève sur une décision absente ou un identifiant illisible', () => {
    expect(() => lireDecision('D-99999')).toThrow(/D-99999 absente/);
    expect(() => lireDecision('quatre-cent')).toThrow(/illisible/);
  });

  it('rend tout le registre, du plus récent au plus ancien', () => {
    const toutes = lireToutesDecisions();
    expect(toutes.length).toBeGreaterThanOrEqual(442);
    const numeros = toutes.map(d => Number(d.id.slice(2)));
    expect(numeros).toEqual([...numeros].sort((a, b) => b - a));
    for (const d of toutes) expect(d.texte.startsWith(`# ${d.id} — `)).toBe(true);
  });
});
