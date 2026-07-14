import { describe, expect, it } from 'vitest';
import type { QuestionnaireDef } from './questionnaire-types';
import { calculateScore, QUESTIONNAIRE_CATALOGUE } from './questions';
import {
  buildQuestionnaireAnswerPayload,
  getDisplayPolicy,
  getEnabledRenderer,
  getMicroBatches,
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

  it('définit neuf micro-lots ordonnés sans omission ni doublon pour Q_NEU_03', () => {
    const batches = getMicroBatches('Q_NEU_03');
    const questionIds = batches.flat();

    expect(batches).toHaveLength(9);
    expect(batches.map(batch => batch.length)).toEqual([3, 4, 3, 3, 1, 2, 5, 3, 1]);
    expect(questionIds).toEqual(
      Array.from({ length: 25 }, (_, index) => `SIGH_Q${String(index + 1).padStart(3, '0')}`),
    );
    expect(new Set(questionIds).size).toBe(25);
  });

  it('ne fournit aucun micro-lot aux questionnaires non activés', () => {
    for (const id of ['Q_MOD_02', 'Q_ALI_01', 'Q_ALI_03', 'Q_INCONNU']) {
      expect(getMicroBatches(id)).toEqual([]);
    }
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

  it('conserve le payload et le scoring Q_NEU_03 indépendamment de l’état UX', () => {
    const questionnaireNeu03 = QUESTIONNAIRE_CATALOGUE.Q_NEU_03 as QuestionnaireDef;
    const localValues = Object.fromEntries(
      questionnaireNeu03.sections.flatMap(section => section.questions.map(question => [question.id, 1])),
    );
    const localValuesWithUxState = {
      ...localValues,
      renderer: 'micro_batch',
      currentBatch: 6,
      visualOrder: getMicroBatches('Q_NEU_03'),
    };
    const payload = buildQuestionnaireAnswerPayload(questionnaireNeu03, localValuesWithUxState);

    expect(payload).toEqual(localValues);
    const score = calculateScore('Q_NEU_03', payload);
    expect(score).toEqual(calculateScore('Q_NEU_03', localValues));
    expect(score).toMatchObject({ scoreGroupeA: 16, scoreGroupeB: 8, total: 24 });
  });
});
