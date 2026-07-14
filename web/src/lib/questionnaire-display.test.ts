import { describe, expect, it } from 'vitest';
import type { QuestionnaireDef } from './questionnaire-types';
import {
  buildQuestionnaireAnswerPayload,
  getDisplayPolicy,
  getEnabledRenderer,
  type OptionOrderPolicy,
} from './questionnaire-display';

const questionnaire: QuestionnaireDef = {
  id: 'Q_TEST_01',
  titre: 'Questionnaire fictif de test',
  sections: [
    {
      id: 'S1',
      questions: [
        { id: 'Q1', texte: 'Question 1', type: 'likert', options: [{ v: 0, l: 'Non' }] },
        { id: 'Q2', texte: 'Question 2', type: 'number' },
        { id: 'Q3', texte: 'Question conditionnelle', type: 'select', conditionnel: 'Q1>=1' },
      ],
    },
  ],
};

describe('registre d’affichage questionnaires', () => {
  it('applique strict et ordre fixe par défaut', () => {
    expect(getDisplayPolicy('Q_INCONNU')).toEqual({
      administration: 'strict',
      renderer: 'standard',
      itemOrder: 'fixed',
      optionOrder: { mode: 'fixed' },
      activation: 'enabled',
    });
  });

  it('n’active que le pilote Q_NEU_03', () => {
    expect(getEnabledRenderer('Q_NEU_03')).toBe('micro_batch');
    expect(getEnabledRenderer('Q_MOD_02')).toBe('standard');
    expect(getEnabledRenderer('Q_ALI_01')).toBe('standard');
    expect(getEnabledRenderer('Q_ALI_03')).toBe('standard');
  });

  it('spécifie shuffle_nominal sans l’utiliser dans le registre V1', () => {
    const specification: OptionOrderPolicy = {
      mode: 'shuffle_nominal',
      specificationVersion: 1,
      pinnedValues: [0],
    };
    expect(specification.mode).toBe('shuffle_nominal');
    for (const id of ['Q_NEU_03', 'Q_MOD_02', 'Q_ALI_01', 'Q_ALI_03', 'Q_INCONNU']) {
      expect(getDisplayPolicy(id).optionOrder.mode).toBe('fixed');
    }
  });

  it('conserve uniquement questionId → value, y compris pour un item conditionnel', () => {
    const payload = buildQuestionnaireAnswerPayload(questionnaire, {
      Q1: '1',
      Q2: 0,
      Q3: '2',
      __draftVersion: 3,
      visualOrder: ['Q2', 'Q1'],
      renderer: 'focus',
      invalid: Number.NaN,
    });
    expect(payload).toEqual({ Q1: '1', Q2: 0, Q3: '2' });
    expect(Object.keys(payload)).toEqual(['Q1', 'Q2', 'Q3']);
  });
});
