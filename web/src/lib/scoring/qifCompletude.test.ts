// COMPLÉTUDE DU QIF (D-421) — au grain de sa source, dix composantes.
//
// Bennett 2005 (WN-SRC-0602) : l'item 1 est la moyenne des sous-items Q1-Q11
// notés, et le patient peut en retirer ; Q12 à Q20 sont chacun une composante.
// `missing` compte des questions (sens de la consigne de synthèse) ; le total
// et le maximum ne bougent pas. Un recueil incomplet perd sa bande (D-428).
import { describe, expect, it } from 'vitest';
import { calculateScore } from '@/lib/questions';

const FONCTION = Array.from({ length: 11 }, (_, i) => `Q${i + 1}`);
const AUTRES = Array.from({ length: 9 }, (_, i) => `Q${i + 12}`);

function reponses(sauf: string[] = []): Record<string, number> {
  const r: Record<string, number> = {};
  for (const id of FONCTION) r[id] = 1;
  for (const id of AUTRES) r[id] = 3;
  for (const id of sauf) delete r[id];
  return r;
}

const qif = (r: Record<string, number>) => calculateScore('Q_FIB_02', r) as any;

describe('QIF — compte de complétude (D-421)', () => {
  it('passation entière : missing 0, aucun missingIds', () => {
    const s = qif(reponses());
    expect(s.missing).toBe(0);
    expect(s).not.toHaveProperty('missingIds');
  });

  it('sous-items de l’item 1 retirés, un autre noté : complet, total inchangé', () => {
    const entiere = qif(reponses());
    const retires = qif(reponses(['Q5', 'Q9', 'Q11']));
    expect(retires.missing).toBe(0);
    expect(retires).not.toHaveProperty('missingIds');
    // Moyenne des sous-items notés : tous à 1, la composante ne bouge pas.
    expect(retires.total).toBe(entiere.total);
  });

  it('item 1 entièrement vide : ses onze sous-items comptent', () => {
    const s = qif(reponses(FONCTION));
    expect(s.missing).toBe(11);
    expect(s.missingIds).toEqual(FONCTION);
  });

  it('Q12 à Q20 sont exigés chacun', () => {
    for (const id of AUTRES) {
      const s = qif(reponses([id]));
      expect(s.missing).toBe(1);
      expect(s.missingIds).toEqual([id]);
    }
  });

  it('une seule réponse (Q12) : dix-neuf questions manquantes', () => {
    const s = qif({ Q12: 7 });
    expect(s.missing).toBe(19);
    expect(s.missingIds).toEqual([...FONCTION, ...AUTRES.slice(1)]);
  });

  it('forme persistée vide ou non numérique : la question manque', () => {
    for (const vide of ['', null, 'abc']) {
      const s = qif({ ...reponses(), Q14: vide as any });
      expect(s.missing).toBe(1);
      expect(s.missingIds).toEqual(['Q14']);
    }
  });

  it('item 1 sans aucune valeur numérique (NaN) : ses onze sous-items manquent', () => {
    const r: Record<string, any> = reponses(FONCTION.slice(1));
    r.Q1 = 'abc';
    const s = qif(r);
    expect(s.missing).toBe(11);
    expect(s.missingIds).toEqual(FONCTION);
  });

  it('item 1 : un sous-item non numérique manque même si un autre est noté', () => {
    const r: Record<string, any> = reponses(['Q3']);
    r.Q2 = 'abc';
    const s = qif(r);
    expect(s.missing).toBe(1);
    expect(s.missingIds).toEqual(['Q2']);
  });

  it('total nul avec un sous-item retiré : recueil complet, mais aucune bande (zéro à 20 sur 20, D-421 §3)', () => {
    const r: Record<string, number> = {};
    for (const id of FONCTION) r[id] = 0;
    delete r.Q5;
    Object.assign(r, { Q12: 7, Q13: 0, Q14: 0, Q15: 0, Q16: 0, Q17: 0, Q18: 0, Q19: 0, Q20: 0 });
    const s = qif(r);
    expect(s.total).toBe(0);
    expect(s.missing).toBe(0);
    expect(s.interpretation).toBeNull();
  });

  it('le maximum reste 100 ; un total incomplet reste servi, sans bande (D-428)', () => {
    const entiere = qif(reponses());
    const sansQ14 = qif(reponses(['Q14']));
    expect(entiere.interpretation).not.toBeNull();
    expect(sansQ14.maxTotal).toBe(100);
    expect(sansQ14.missing).toBe(1);
    // Somme des six EVA restantes, sans 10/x : le total est celui d'avant.
    expect(sansQ14.total).toBe(parseFloat((entiere.total - 3).toFixed(1)));
    expect(sansQ14.interpretation).toBeNull();
  });

  it('valeur non numérique : le total NaN ne tombe plus dans la dernière bande (D-428)', () => {
    const s = qif({ ...reponses(), Q15: 'abc' as any });
    expect(s.missing).toBe(1);
    expect(s.interpretation).toBeNull();
  });

  it('sous-item de l’item 1 retiré, total non nul : la bande reste servie (missing 0)', () => {
    const s = qif(reponses(['Q5']));
    expect(s.missing).toBe(0);
    expect(s.interpretation).not.toBeNull();
  });
});
