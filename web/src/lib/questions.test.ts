import { describe, expect, it } from 'vitest';
import { calculateScore } from './questions';

describe('calculateScore', () => {
  it('renvoie une erreur explicite pour un identifiant de questionnaire inconnu', () => {
    const result = calculateScore('Q_INCONNU_99', {});
    expect(result).toEqual({ error: 'Questionnaire introuvable' });
  });

  it('Q_SOM_06 (Pichot, sum) — 8 items 2,2,1,1,1,1,1,1 sur 0-4 donne un total de 10/32', () => {
    const result = calculateScore('Q_SOM_06', {
      P1: '2', P2: '2', P3: '1', P4: '1', P5: '1', P6: '1', P7: '1', P8: '1',
    });
    expect(result.type).toBe('sum');
    expect(result.total).toBe(10);
    expect(result.maxTotal).toBe(32);
    expect(result.interpretation.label).toBe(
      'Fatigue non significative selon le seuil fourni ; à interpréter selon le contexte clinique'
    );
    expect(result.interpretation.color).toBe('success');
  });

  it('Q_CAN_02 (sum_items) — un item conditionnel inclus/exclus selon la réponse au déclencheur', () => {
    // BR4 (perte de cheveux) = 1 (< 2) → BR5 conditionnel (BR4>=2) devient non applicable.
    // BR15 (activité sexuelle) = 3 (>= 2) → BR16 conditionnel (BR15>=2) devient applicable,
    // mais reste sans réponse → comptabilisé en item manquant, pas en erreur.
    const answers: Record<string, string> = { BR4: '1', BR15: '3' };
    for (const id of [
      'BR1', 'BR2', 'BR3', 'BR6', 'BR7', 'BR8', 'BR9', 'BR10', 'BR11', 'BR12', 'BR13',
      'BR14', 'BR17', 'BR18', 'BR19', 'BR20', 'BR21', 'BR22', 'BR23',
    ]) {
      answers[id] = '2';
    }

    const result = calculateScore('Q_CAN_02', answers);

    expect(result.type).toBe('sum_items');
    expect(result.notApplicable).toEqual(['BR5']);
    expect(result.missingIds).toEqual(['BR16']);
    expect(result.missing).toBe(1);
    expect(result.total).toBe(42);
    expect(result.interpretation.label).toBe('Rares problèmes occasionnels');
  });

  it('Q_CAN_02 (sum_items) — aucune réponse ne provoque pas de throw et dégrade proprement', () => {
    expect(() => calculateScore('Q_CAN_02', {})).not.toThrow();
    const result = calculateScore('Q_CAN_02', {});
    expect(result.total).toBe(0);
    expect(result.missing).toBe(21);
    // Sans réponse au déclencheur, les items conditionnels BR5/BR16 restent non applicables.
    expect(result.notApplicable).toEqual(['BR5', 'BR16']);
  });
});
