import { describe, expect, it } from 'vitest';
import type { QuestionnaireDef } from '@/lib/questionnaire-types';
import { Q_SOM_03 } from '@/lib/questionnaires/sommeil';
import {
  AVERTISSEMENT_DEFINITION_INTROUVABLE,
  AVERTISSEMENT_DEFINITION_RETIREE,
  AVERTISSEMENT_REPONSES_ABSENTES,
  AVERTISSEMENT_SANS_RECOUVREMENT,
  lireReponses,
} from './reponsesExport';

// Définition fabriquée : le comportement ne doit dépendre d'aucun instrument
// nommé. Le cas réel (Berlin) est exercé à part.
const DEF: QuestionnaireDef = {
  id: 'Q_TEST',
  titre: 'Questionnaire de test',
  sections: [
    {
      id: 'A',
      titre: 'Humeur',
      questions: [
        {
          id: 'H1',
          texte: 'Vous sentez-vous triste ?',
          type: 'likert',
          options: [{ v: 0, l: 'Jamais' }, { v: 1, l: 'Parfois' }, { v: 2, l: 'Souvent' }],
        },
        {
          id: 'H2',
          texte: 'Dormez-vous mal ?',
          type: 'select',
          options: [{ v: 0, l: 'Non' }, { v: 1, l: 'Oui' }, { v: 0, l: 'Je ne sais pas' }],
        },
        {
          id: 'H3',
          texte: 'Depuis combien de temps ?',
          type: 'select',
          options: [{ v: 0, l: 'Moins d’un mois' }, { v: 1, l: 'Plus d’un mois' }],
          conditionnel: 'H2=1',
        },
      ],
    },
    {
      id: 'B',
      questions: [
        { id: 'P1', texte: 'Poids', type: 'number', unit: 'kg' },
        { id: 'P2', texte: 'Nombre de repas par jour', type: 'number', unit: '' },
        {
          id: 'O1',
          texte: 'Mangez-vous du poisson ?',
          type: 'select',
          options: [{ v: 'oui', l: 'Oui' }, { v: 'non', l: 'Non' }],
        },
      ],
    },
  ],
};

const SANS_CONTEXTE = { definitionRetiree: false };

describe('lireReponses — parcours de la définition', () => {
  it('suit l’ordre de la définition, pas celui des clés enregistrées', () => {
    const lecture = lireReponses(DEF, { O1: 'oui', P1: 72.5, H1: 2 }, SANS_CONTEXTE);
    expect(lecture.lignes.map(l => l.question)).toEqual([
      'Vous sentez-vous triste ?',
      'Dormez-vous mal ?',
      'Depuis combien de temps ?',
      'Poids',
      'Nombre de repas par jour',
      'Mangez-vous du poisson ?',
    ]);
    expect(lecture.lignes.map(l => l.section)).toEqual(['Humeur', 'Humeur', 'Humeur', null, null, null]);
    expect(lecture.avertissement).toBeNull();
    expect(lecture.nonTraduites).toEqual([]);
  });

  it('traduit une option unique, que la valeur soit enregistrée en nombre ou en chaîne', () => {
    const { lignes } = lireReponses(DEF, { H1: '2', H2: 1, O1: 'non' }, SANS_CONTEXTE);
    expect(lignes[0].reponse).toBe('Souvent');
    expect(lignes[1].reponse).toBe('Oui');
    expect(lignes[5].reponse).toBe('Non');
  });

  it('un zéro est une réponse, jamais une absence', () => {
    const { lignes } = lireReponses(DEF, { H1: 0 }, SANS_CONTEXTE);
    expect(lignes[0].reponse).toBe('Jamais');
  });

  it('deux options de même valeur restent indiscernables — aucune n’est choisie', () => {
    const { lignes } = lireReponses(DEF, { H2: 0 }, SANS_CONTEXTE);
    expect(lignes[1].reponse).toBe('Non ou Je ne sais pas (indiscernables : même valeur enregistrée)');
  });

  it('une valeur hors des options est citée, jamais rendue nue', () => {
    const { lignes } = lireReponses(DEF, { H1: 7 }, SANS_CONTEXTE);
    expect(lignes[0].reponse).toBe('valeur enregistrée « 7 », hors des options actuelles');
  });

  it('une saisie chiffrée porte son unité quand la question en a une', () => {
    const { lignes } = lireReponses(DEF, { P1: 72.5, P2: 3 }, SANS_CONTEXTE);
    expect(lignes[3].reponse).toBe('72.5 kg');
    expect(lignes[4].reponse).toBe('3');
  });

  it('absent, null ou vide → « Sans réponse », et la question conditionnelle est dite', () => {
    const { lignes } = lireReponses(DEF, { H1: null, H2: '', P1: 60 }, SANS_CONTEXTE);
    expect(lignes[0].reponse).toBe('Sans réponse');
    expect(lignes[1].reponse).toBe('Sans réponse');
    expect(lignes[2].reponse).toBe('Sans réponse (question conditionnelle)');
    expect(lignes[4].reponse).toBe('Sans réponse');
  });
});

describe('lireReponses — ce qui ne se traduit pas', () => {
  it('les clés absentes de la définition partent en non traduites, triées', () => {
    const lecture = lireReponses(DEF, { H1: 1, ZZ9: 3, AA1: 'x', MM2: null }, SANS_CONTEXTE);
    expect(lecture.lignes).toHaveLength(6);
    expect(lecture.nonTraduites).toEqual([
      { cle: 'AA1', valeur: 'x' },
      { cle: 'MM2', valeur: 'Sans réponse' },
      { cle: 'ZZ9', valeur: '3' },
    ]);
    expect(lecture.avertissement).toBeNull();
  });

  it('aucun identifiant en commun → aucune ligne, tout en codes bruts, avec avertissement', () => {
    const lecture = lireReponses(DEF, { MO2: 3, MO1: 0 }, SANS_CONTEXTE);
    expect(lecture.lignes).toEqual([]);
    expect(lecture.nonTraduites).toEqual([
      { cle: 'MO1', valeur: '0' },
      { cle: 'MO2', valeur: '3' },
    ]);
    expect(lecture.avertissement).toBe(AVERTISSEMENT_SANS_RECOUVREMENT);
    expect(lecture.avertissement).toContain('ni des scores ni des réponses lisibles');
  });

  it('définition retirée → codes bruts, avertissement de retrait', () => {
    const lecture = lireReponses(null, { M2: 4, M1: 1 }, { definitionRetiree: true });
    expect(lecture.lignes).toEqual([]);
    expect(lecture.nonTraduites.map(n => n.cle)).toEqual(['M1', 'M2']);
    expect(lecture.avertissement).toBe(AVERTISSEMENT_DEFINITION_RETIREE);
  });

  it('définition introuvable → codes bruts, avertissement distinct', () => {
    const lecture = lireReponses(null, { X1: { a: 1 } }, SANS_CONTEXTE);
    expect(lecture.nonTraduites).toEqual([{ cle: 'X1', valeur: '{"a":1}' }]);
    expect(lecture.avertissement).toBe(AVERTISSEMENT_DEFINITION_INTROUVABLE);
  });

  it('aucune réponse enregistrée → rien n’est affirmé question par question', () => {
    for (const brut of [null, {}]) {
      const lecture = lireReponses(DEF, brut, SANS_CONTEXTE);
      expect(lecture.lignes).toEqual([]);
      expect(lecture.nonTraduites).toEqual([]);
      expect(lecture.avertissement).toBe(AVERTISSEMENT_REPONSES_ABSENTES);
    }
  });
});

describe('lireReponses — définition réelle du catalogue (Berlin, Q_SOM_03)', () => {
  const BERLIN: QuestionnaireDef = Q_SOM_03;

  it('« Non » et « Je ne sais pas » partagent la valeur 0 : l’ambiguïté est restituée', () => {
    const { lignes } = lireReponses(BERLIN, { BE1: 0, BE9: 31.5 }, SANS_CONTEXTE);
    const be1 = lignes.find(l => l.question === 'Ronflez-vous ?');
    expect(be1).toEqual({
      section: 'Catégorie 1 — Ronflements',
      question: 'Ronflez-vous ?',
      reponse: 'Non ou Je ne sais pas (indiscernables : même valeur enregistrée)',
    });
    expect(lignes[lignes.length - 1].reponse).toBe('31.5 kg/m²');
  });

  it('une valeur portée par une seule option se lit sans ambiguïté', () => {
    const { lignes } = lireReponses(BERLIN, { BE1: 1 }, SANS_CONTEXTE);
    expect(lignes[0].reponse).toBe('Oui');
    // Toutes les autres questions sont dites sans réponse, jamais « 0 ».
    expect(lignes.slice(1).every(l => l.reponse === 'Sans réponse')).toBe(true);
  });
});
