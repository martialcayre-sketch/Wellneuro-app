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

const AUCUNE = new Map<string, unknown>();

describe('derniersResultatsParAnalyte', () => {
  it('retient, par analyte, le prélèvement le plus récent', () => {
    const derniers = derniersResultatsParAnalyte([
      ligne({ id: 'a', preleveLe: '2026-06-01T00:00:00.000Z' }),
      ligne({ id: 'b', preleveLe: '2026-09-01T00:00:00.000Z' }),
      ligne({ id: 'c', analyteCode: 'BIO_HOMOCYSTEINE' }),
    ], AUCUNE);
    expect(derniers.get('BIO_CRP_US')?.id).toBe('b');
    expect(derniers.get('BIO_HOMOCYSTEINE')?.id).toBe('c');
  });

  // Élire sur la SAISIE montrerait la mesure la plus récemment tapée — ici la
  // plus ancienne, recopiée d'un vieux compte rendu.
  it('élit sur la date de PRÉLÈVEMENT, jamais sur la date de saisie', () => {
    const derniers = derniersResultatsParAnalyte([
      ligne({ id: 'recente', preleveLe: '2026-09-01T00:00:00.000Z', saisiLe: '2026-09-02T00:00:00.000Z' }),
      ligne({ id: 'ancienne', preleveLe: '2025-01-01T00:00:00.000Z', saisiLe: '2026-09-20T00:00:00.000Z' }),
    ], AUCUNE);
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
    ], AUCUNE);
    expect(derniers.get('BIO_CRP_US')?.id).toBe('corrigee');
  });

  it('même prélèvement, même saisie : l’identifiant départage, toujours de la même façon', () => {
    const lignes = [ligne({ id: 'x1' }), ligne({ id: 'x2' })];
    expect(derniersResultatsParAnalyte(lignes, AUCUNE).get('BIO_CRP_US')?.id).toBe('x2');
    expect(derniersResultatsParAnalyte([...lignes].reverse(), AUCUNE).get('BIO_CRP_US')?.id).toBe('x2');
  });

  it('aucune ligne : aucune entrée — jamais une valeur par défaut', () => {
    expect(derniersResultatsParAnalyte([], AUCUNE).size).toBe(0);
  });

  // [[D-294]] §6 : un fil annulé sort de l'élection ; la mesure d'avant revient.
  it('un fil annulé ne fait plus foi : le prélèvement précédent revient', () => {
    const lignes = [
      ligne({ id: 'ancienne', preleveLe: '2026-06-01T00:00:00.000Z' }),
      ligne({ id: 'erronee', preleveLe: '2026-09-01T00:00:00.000Z' }),
    ];
    const derniers = derniersResultatsParAnalyte(lignes, new Map([['erronee', { motif: 'mauvais_analyte' }]]));
    expect(derniers.get('BIO_CRP_US')?.id).toBe('ancienne');
  });

  it('l’annulation retire le FIL entier, quelle que soit la ligne qui la porte', () => {
    const lignes = [
      ligne({ id: 'r', preleveLe: '2026-09-01T00:00:00.000Z', saisiLe: '2026-09-01T00:00:00.000Z' }),
      ligne({ id: 'c', preleveLe: '2026-09-01T00:00:00.000Z', saisiLe: '2026-09-02T00:00:00.000Z', supersedesResultatId: 'r' }),
    ];
    // Portée par la racine, corrigée depuis : la correction sort aussi.
    expect(derniersResultatsParAnalyte(lignes, new Map([['r', true]])).size).toBe(0);
    expect(derniersResultatsParAnalyte(lignes, new Map([['c', true]])).size).toBe(0);
  });

  it('la place libérée : la mesure neuve de la même clé fait foi, l’annulée non', () => {
    const lignes = [
      ligne({ id: 'annulee', saisiLe: '2026-09-02T00:00:00.000Z' }),
      // Même clé, saisie AVANT : sans l'exclusion, l'annulée gagnerait.
      ligne({ id: 'vraie', saisiLe: '2026-09-01T00:00:00.000Z' }),
    ];
    expect(derniersResultatsParAnalyte(lignes, new Map([['annulee', true]])).get('BIO_CRP_US')?.id).toBe('vraie');
  });

  it('révoquée, l’annulation n’est plus active : le fil revient', () => {
    const lignes = [ligne({ id: 'a' })];
    // Le lecteur ne reçoit que les annulations ACTIVES : une révoquée n'y est pas.
    expect(derniersResultatsParAnalyte(lignes, AUCUNE).get('BIO_CRP_US')?.id).toBe('a');
  });
});
