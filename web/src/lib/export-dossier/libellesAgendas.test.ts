import { describe, expect, it, vi } from 'vitest';

// `cloture.ts` importe Prisma : la base est neutralisée, seules ses fonctions
// pures servent ici d'étalon.
vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import { PSEUDO_ITEM_NB_JOURS, pseudoItemAgendaAli, rawAnswersDepuisAgregats } from '@/lib/agenda-alimentaire/cloture';
import type { AgregatsAgendaAli } from '@/lib/agenda-alimentaire/agregats';
import type { QuestionnaireDef } from '@/lib/questionnaire-types';
import { Q_ALI_09 } from '@/lib/questionnaires/alimentaire';
import { Q_SOM_09 } from '@/lib/questionnaires/sommeil';
import {
  LECTURE_SANS_UNITE_SOMMEIL,
  LEGENDE_AGREGATS_SOMMEIL,
  LIBELLES_AGREGATS_ALI,
  OUI_NON,
  definitionLectureAgendaAli,
  definitionLectureAgendaSommeil,
  estPseudoItemAgenda,
  pseudoItemAli,
} from './libellesAgendas';
import { NON_CALCULE } from './reponsesExport';

const CLES = Object.keys(LIBELLES_AGREGATS_ALI) as Array<keyof AgregatsAgendaAli>;

describe('libellesAgendas — alignement sur la clôture', () => {
  it('la règle de dérivation recopiée rend exactement les pseudo-items de la clôture', () => {
    for (const cle of CLES) expect(pseudoItemAli(cle), cle).toBe(pseudoItemAgendaAli(cle));
    expect(pseudoItemAli('nbJours')).toBe(PSEUDO_ITEM_NB_JOURS);
  });

  it('chaque pseudo-item écrit par la clôture a sa question de lecture, et réciproquement', () => {
    const agregats = Object.fromEntries(CLES.map(cle => [cle, 1])) as unknown as AgregatsAgendaAli;
    const ecrits = Object.keys(rawAnswersDepuisAgregats(agregats, 21)).sort();
    const lus = (definitionLectureAgendaAli(Q_ALI_09 as QuestionnaireDef)?.sections ?? [])
      .flatMap(section => section.questions.map(q => q.id))
      .sort();
    expect(lus).toEqual(ecrits);
    expect(lus).toContain(Object.keys(rawAnswersDepuisAgregats(null, 3))[0]);
  });

  it('chaque libellé est une phrase française, jamais un code', () => {
    for (const cle of CLES) {
      const { texte, unite } = LIBELLES_AGREGATS_ALI[cle];
      expect(texte, cle).not.toMatch(/AGA_|[a-z][A-Z]/);
      expect(unite, cle).not.toBe('');
      // « » est réservé aux textes saisis par une personne (préambule).
      expect(texte, cle).not.toMatch(/[«»]/);
    }
  });
});

describe('definitionLectureAgendaAli', () => {
  it('ne concerne que Q_ALI_09 tant que le catalogue ne lui déclare aucune question', () => {
    expect(definitionLectureAgendaAli(Q_SOM_09)).toBeNull();
    const avecQuestion: QuestionnaireDef = {
      ...(Q_ALI_09 as QuestionnaireDef),
      sections: [{ id: 'S', questions: [{ id: 'X', texte: 'X', type: 'number' }] }],
    };
    expect(definitionLectureAgendaAli(avecQuestion)).toBeNull();
    const lue = definitionLectureAgendaAli(Q_ALI_09 as QuestionnaireDef);
    expect(lue?.titre).toBe(Q_ALI_09.titre);
    expect(lue?.instructions).toBe(Q_ALI_09.instructions);
    expect(lue?.sections[0].questions[0]).toEqual({
      id: 'AGA_NB_JOURS',
      texte: 'Nombre de journées renseignées',
      type: 'number',
      unit: 'journées',
    });
  });
});

describe('definitionLectureAgendaSommeil (NF5, N15)', () => {
  const CATALOGUE = Q_SOM_09 as QuestionnaireDef;
  const DESCRIPTION_CATALOGUE = CATALOGUE.sections[0].description;

  it('ne concerne que Q_SOM_09', () => {
    expect(definitionLectureAgendaSommeil(Q_ALI_09 as QuestionnaireDef)).toBeNull();
    expect(definitionLectureAgendaSommeil({ id: 'Q_SOM_03', titre: 'Berlin', sections: [] })).toBeNull();
  });

  it('remplace la seule légende : questions, bornes et unités restent celles du catalogue, intouché', () => {
    const lue = definitionLectureAgendaSommeil(CATALOGUE);
    expect(lue?.sections.map(s => s.description)).toEqual([LEGENDE_AGREGATS_SOMMEIL]);
    expect(lue?.sections.map(s => s.questions)).toEqual(CATALOGUE.sections.map(s => s.questions));
    expect(lue?.instructions).toBe(CATALOGUE.instructions);
    expect(CATALOGUE.sections[0].description).toBe(DESCRIPTION_CATALOGUE);
  });

  it('la légende parle la langue du document : jamais « null », le terme que le préambule définit', () => {
    expect(LEGENDE_AGREGATS_SOMMEIL).toBe(
      'Valeurs calculées à partir des nuits renseignées ; une métrique non couverte est écrite ' +
        '« Non calculé : données insuffisantes », jamais 0.',
    );
    expect(LEGENDE_AGREGATS_SOMMEIL).toContain(`« ${NON_CALCULE} »`);
    expect(LEGENDE_AGREGATS_SOMMEIL).not.toMatch(/\bnull\b/i);
  });

  it('chaque pseudo-item SANS unité du catalogue a sa lecture, et la table ne nomme rien d’autre', () => {
    const questions = CATALOGUE.sections.flatMap(s => s.questions);
    const sansUnite = questions.filter(q => q.type === 'number' && !q.unit).map(q => q.id).sort();
    expect([...LECTURE_SANS_UNITE_SOMMEIL.keys()].sort()).toEqual(sansUnite);
    // Une échelle s'écrit avec les bornes de la DÉFINITION : elles doivent y être.
    for (const [id, lecture] of LECTURE_SANS_UNITE_SOMMEIL) {
      const question = questions.find(q => q.id === id);
      if (lecture === 'echelle') {
        expect(typeof question?.min, id).toBe('number');
        expect(typeof question?.max, id).toBe('number');
      }
    }
    expect(LECTURE_SANS_UNITE_SOMMEIL.get('AGD_QUAL_MOY')).toBe('echelle');
    expect(LECTURE_SANS_UNITE_SOMMEIL.get('AGD_INDICE_ELIGIBLE')).toBe('oui-non');
  });

  it('oui / non : les deux seules valeurs que la clôture écrit pour un drapeau', () => {
    expect([...OUI_NON]).toEqual([
      ['1', 'oui'],
      ['0', 'non'],
    ]);
  });
});

describe('estPseudoItemAgenda', () => {
  it('reconnaît les pseudo-items des deux agendas, et eux seuls', () => {
    expect(estPseudoItemAgenda('AGD_TST_MOY')).toBe(true);
    expect(estPseudoItemAgenda('AGA_JEUNE_MEDIAN')).toBe(true);
    for (const id of ['AGDX', 'AL1', 'Q1', 'agd_tst', 'fatigue']) expect(estPseudoItemAgenda(id), id).toBe(false);
  });
});
