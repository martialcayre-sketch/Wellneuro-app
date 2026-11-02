// COMPLÉTUDE DU QIF (D-421) — au grain de sa source, dix composantes.
//
// Bennett 2005 (WN-SRC-0602) : l'item 1 est la moyenne des sous-items Q1-Q11
// notés, et le patient peut en retirer ; Q12 à Q20 sont chacun une composante.
// `missing` compte des questions (sens de la consigne de synthèse) ; le total,
// le maximum et la bande ne bougent pas.
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

  it('le maximum reste 100, et la bande d’un total incomplet est inchangée (défaut consigné, D-421)', () => {
    const sansQ14 = qif(reponses(['Q14']));
    expect(sansQ14.maxTotal).toBe(100);
    expect(sansQ14.missing).toBe(1);
    expect(sansQ14.interpretation).not.toBeNull();
  });
});
