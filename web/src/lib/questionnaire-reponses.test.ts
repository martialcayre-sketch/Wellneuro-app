import { describe, expect, it } from 'vitest';
import type { QuestionnaireDef } from '@/lib/questionnaire-types';
import { construireReponsesLisibles } from '@/lib/questionnaire-reponses';

const definition: QuestionnaireDef = {
  id: 'Q_TEST',
  titre: 'Questionnaire fictif',
  sections: [
    {
      id: 'S1',
      titre: 'Sommeil',
      questions: [
        {
          id: 'Q1',
          texte: 'Avez-vous du mal à vous endormir ?',
          type: 'likert',
          options: [
            { v: 0, l: 'Jamais' },
            { v: 2, l: 'Souvent' },
          ],
        },
        {
          id: 'Q2',
          texte: 'Combien d’heures dormez-vous ?',
          type: 'number',
          unit: 'h',
        },
      ],
    },
  ],
};

describe('construireReponsesLisibles', () => {
  it('associe les libellés de question, de réponse et la valeur brute', () => {
    expect(construireReponsesLisibles(definition, { Q1: '2', Q2: 7 })).toEqual([
      {
        idQuestion: 'Q1',
        libelleQuestion: 'Avez-vous du mal à vous endormir ?',
        libelleReponse: 'Souvent',
        valeurBrute: '2',
        section: 'Sommeil',
      },
      {
        idQuestion: 'Q2',
        libelleQuestion: 'Combien d’heures dormez-vous ?',
        libelleReponse: '7 h',
        valeurBrute: '7',
        section: 'Sommeil',
      },
    ]);
  });

  it('conserve une réponse historique même si sa définition est inconnue', () => {
    expect(construireReponsesLisibles(null, { ancienne_cle: 'Texte libre' })).toEqual([
      {
        idQuestion: 'ancienne_cle',
        libelleQuestion: null,
        libelleReponse: null,
        valeurBrute: 'Texte libre',
        section: null,
      },
    ]);
  });
});
