import { describe, expect, it } from 'vitest';
import { derniersResultatsParAnalyte, type LigneResultatDatee } from './derniersResultats';

function ligne(p: Partial<LigneResultatDatee> & { id: string }): LigneResultatDatee {
  return {
    analyteCode: 'BIO_CRP_US',
    preleveLe: '2026-09-01T00:00:00.000Z',
    saisiLe: '2026-09-02T00:00:00.000Z',
    supersedesResultatId: null,
    ...p,
  };
}

describe('derniersResultatsParAnalyte', () => {
  it('retient, par analyte, le prélèvement le plus récent', () => {
    const derniers = derniersResultatsParAnalyte([
      ligne({ id: 'a', preleveLe: '2026-06-01T00:00:00.000Z' }),
      ligne({ id: 'b', preleveLe: '2026-09-01T00:00:00.000Z' }),
      ligne({ id: 'c', analyteCode: 'BIO_HOMOCYSTEINE' }),
    ]);
    expect(derniers.get('BIO_CRP_US')?.id).toBe('b');
    expect(derniers.get('BIO_HOMOCYSTEINE')?.id).toBe('c');
  });

  // Élire sur la SAISIE montrerait la mesure la plus récemment tapée — ici la
  // plus ancienne, recopiée d'un vieux compte rendu.
  it('élit sur la date de PRÉLÈVEMENT, jamais sur la date de saisie', () => {
    const derniers = derniersResultatsParAnalyte([
      ligne({ id: 'recente', preleveLe: '2026-09-01T00:00:00.000Z', saisiLe: '2026-09-02T00:00:00.000Z' }),
      ligne({ id: 'ancienne', preleveLe: '2025-01-01T00:00:00.000Z', saisiLe: '2026-09-20T00:00:00.000Z' }),
    ]);
    expect(derniers.get('BIO_CRP_US')?.id).toBe('recente');
  });

  it('une ligne corrigée ne fait plus foi : c’est sa correction qui sort', () => {
    const derniers = derniersResultatsParAnalyte([
      ligne({ id: 'erronee', preleveLe: '2026-09-10T00:00:00.000Z', saisiLe: '2026-09-10T00:00:00.000Z' }),
      ligne({
        id: 'corrigee',
        preleveLe: '2026-09-10T00:00:00.000Z',
        saisiLe: '2026-09-11T00:00:00.000Z',
        supersedesResultatId: 'erronee',
      }),
    ]);
    expect(derniers.get('BIO_CRP_US')?.id).toBe('corrigee');
  });

  it('même prélèvement, même saisie : l’identifiant départage, toujours de la même façon', () => {
    const lignes = [ligne({ id: 'x1' }), ligne({ id: 'x2' })];
    expect(derniersResultatsParAnalyte(lignes).get('BIO_CRP_US')?.id).toBe('x2');
    expect(derniersResultatsParAnalyte([...lignes].reverse()).get('BIO_CRP_US')?.id).toBe('x2');
  });

  it('aucune ligne : aucune entrée — jamais une valeur par défaut', () => {
    expect(derniersResultatsParAnalyte([]).size).toBe(0);
  });
});
