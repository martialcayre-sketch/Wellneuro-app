import { describe, expect, it } from 'vitest';
import { ORDRE_CONSULTATION_PORTEUSE } from './consultationPorteuse';

// L'ORDRE DE LA PORTEUSE EST TOTAL (revue Codex de #1373, D-275 §3).
//
// Le cockpit lit la porteuse par `findFirst`, le Fil par `findMany` en gardant
// la première ligne de chaque dossier. Les deux ne désignent la même ligne que
// si l'ordre ne laisse AUCUNE égalité au moteur SQL. Ce banc applique
// `ORDRE_CONSULTATION_PORTEUSE` tel quel, comme le ferait la base, à deux
// consultations aux deux mêmes dates : quel que soit l'ordre d'arrivée, la même
// doit sortir en tête. Sans le départage par `id`, le tri stable rendrait
// l'ordre d'arrivée — et ce banc rougirait.

type Ligne = { id: string; dateValidation: Date | null; createdAt: Date };

/** `orderBy` Prisma émulé terme à terme, avec la règle PostgreSQL des `NULL` (en tête en `DESC`). */
function trier(lignes: Ligne[]): Ligne[] {
  return [...lignes].sort((a, b) => {
    for (const terme of ORDRE_CONSULTATION_PORTEUSE) {
      const [champ, sens] = Object.entries(terme)[0] as [keyof Ligne, 'asc' | 'desc'];
      const va = a[champ];
      const vb = b[champ];
      const na = va instanceof Date ? va.getTime() : va;
      const nb = vb instanceof Date ? vb.getTime() : vb;
      if (na === nb) continue;
      // PostgreSQL range NULL comme la plus grande valeur : en `DESC`, en tête.
      if (na === null) return sens === 'desc' ? -1 : 1;
      if (nb === null) return sens === 'desc' ? 1 : -1;
      const comparaison = na < nb ? -1 : 1;
      return sens === 'desc' ? -comparaison : comparaison;
    }
    return 0;
  });
}

describe('ORDRE_CONSULTATION_PORTEUSE — ordre total', () => {
  const memesDates = { dateValidation: new Date('2026-10-01T09:00:00.000Z'), createdAt: new Date('2026-09-30T09:00:00.000Z') };
  const avecSignal: Ligne = { id: 'cons_b', ...memesDates };
  const sansSignal: Ligne = { id: 'cons_a', ...memesDates };

  it('deux consultations aux deux mêmes dates : la même sort en tête, dans les deux ordres d’arrivée', () => {
    expect(trier([avecSignal, sansSignal])[0].id).toBe('cons_b');
    expect(trier([sansSignal, avecSignal])[0].id).toBe('cons_b');
  });

  it('le dernier terme est la clé primaire, donc unique', () => {
    expect(ORDRE_CONSULTATION_PORTEUSE.at(-1)).toEqual({ id: 'desc' });
  });

  it('la validation prime toujours sur l’identifiant', () => {
    const recente: Ligne = { id: 'cons_a', dateValidation: new Date('2026-10-02T09:00:00.000Z'), createdAt: memesDates.createdAt };
    expect(trier([avecSignal, recente])[0].id).toBe('cons_a');
  });
});
