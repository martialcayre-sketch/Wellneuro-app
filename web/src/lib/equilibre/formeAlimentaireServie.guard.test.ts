import { describe, expect, it } from 'vitest';
import { Q_ALI_01, Q_ALI_01_SIIN_57, Q_ALI_01_COURT_14 } from '@/lib/questionnaires/alimentaire';
import { BESOIN_SOURCES, VERSION_SCORE_EQUILIBRE, BESOINS_FONDATIONS_CRITIQUES } from './constants';

// Cohérence de la forme alimentaire servie.
//
// Trois valeurs doivent basculer ENSEMBLE avec `WN_ALI_01_SIIN57` : la
// définition servie, le `max` du besoin 1, et l'étiquette de version du score.
// Si l'une reste en arrière, le défaut est silencieux et grave :
//
//   — `max` resté à 42 sur un total /90  → couverture saturée à 1,0 ;
//   — `max` passé à 90 sur un total /42  → couverture écrasée, et le besoin 1
//     étant une FONDATION CRITIQUE, le score global est plafonné à 50 ;
//   — étiquette figée              → des épisodes annoncés sous un barème qui
//     n'a pas été appliqué, et `resoudreComparaison` bloqué sans raison.
//
// Le test lit le drapeau plutôt que de présumer son état : il vaut dans les
// deux positions, et c'est ce qui le rend utile au moment de l'allumage.

const SIIN57_ACTIF = process.env.WN_ALI_01_SIIN57 === 'true';

function nbItems(def: { sections: Array<{ questions: unknown[] }> }): number {
  return def.sections.flatMap(s => s.questions).length;
}

describe('forme alimentaire servie', () => {
  it('sert la forme correspondant au drapeau', () => {
    expect(Q_ALI_01).toBe(SIIN57_ACTIF ? Q_ALI_01_SIIN_57 : Q_ALI_01_COURT_14);
    expect(nbItems(Q_ALI_01)).toBe(SIIN57_ACTIF ? 57 : 14);
  });

  it('le `max` du besoin 1 suit le barème réellement servi', () => {
    const source = BESOIN_SOURCES[1].find(s => s.idQuestionnaire === 'Q_ALI_01');
    expect(source, 'Q_ALI_01 n’est plus source du besoin 1').toBeDefined();
    expect(source!.max).toBe(Q_ALI_01.scoring.maxTotal);
    expect(source!.max).toBe(SIIN57_ACTIF ? 90 : 42);
  });

  it('l’étiquette de version suit le barème réellement servi', () => {
    expect(VERSION_SCORE_EQUILIBRE).toBe(SIIN57_ACTIF ? 'v6' : 'v5');
  });

  it('le besoin 1 reste une fondation critique — d’où l’exigence ci-dessus', () => {
    // Ce n'est pas décoratif : c'est ce qui transforme un `max` faux en
    // plafonnement du score global, et non en simple imprécision.
    expect([...BESOINS_FONDATIONS_CRITIQUES]).toContain(1);
  });

  it('aucune autre source du besoin 1 n’a été ajoutée en passant', () => {
    // Le lot ne change pas le mapping des besoins : il change la forme d'un
    // instrument. Le branchement des sous-catégories est un lot distinct.
    expect(BESOIN_SOURCES[1].map(s => s.idQuestionnaire)).toEqual(['Q_ALI_01']);
  });

  it('le besoin 2 n’a toujours aucune source — le branchement est un lot à part', () => {
    expect(BESOIN_SOURCES[2]).toEqual([]);
  });
});
