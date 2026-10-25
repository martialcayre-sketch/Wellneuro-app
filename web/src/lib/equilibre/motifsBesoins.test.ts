import { afterEach, describe, expect, it, vi } from 'vitest';
import { BESOIN_SOURCES, BESOINS, MAX_RYTHME_CHRONO } from './constants';
import { questionnairesEcartesParValidite, type ReponseBrute } from './depuisPrisma';
import { ecartsDecisionBesoin, motifsNonMesureBesoin, type ContexteMotifs } from './motifsBesoins';
import { QUESTIONNAIRE_CATALOGUE } from '../questions';
import { calculerCouverturesTousLesBesoins } from './score';
import type { ReponsesParQuestionnaire } from './types';

// r3_08 (Q4) — le motif d'un besoin non mesuré, sur le vrai catalogue. Les
// deux branches résiduelles du moteur ont leur banc à moteur simulé
// (`evaluerCouvertureSource.test.ts`).

const SANS_CONTEXTE: ContexteMotifs = { ecartes: new Set(), datesRetenues: {} };

const ITEMS_STR_01 = [
  'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7',
  'B8', 'B9', 'B10', 'B11', 'B12', 'B13', 'B14',
  'C15', 'C16', 'C17', 'C18', 'C19', 'C20', 'C21',
];
const STR_01_COMPLET = Object.fromEntries(ITEMS_STR_01.map(id => [id, 0]));
const { C21: _manquant, ...STR_01_PARTIEL } = STR_01_COMPLET;
const ITEMS_HAD_D = ['D2', 'D4', 'D6', 'D8', 'D10', 'D12', 'D14'];
const HAD_D_COMPLET = Object.fromEntries(ITEMS_HAD_D.map(id => [id, '0']));

describe('motifsNonMesureBesoin — un motif par étage, jamais pour un besoin mesuré', () => {
  it('B2 est « hors score » ; B6, B7 et B11 n’ont aucun instrument au mapping', () => {
    expect(motifsNonMesureBesoin(2, {}, SANS_CONTEXTE)).toEqual([
      { motif: 'hors_score', idsQuestionnaire: [], dateDernierePassation: null },
    ]);
    // Dérivé du mapping, pas d'une liste recopiée : J3-12f changera des sources.
    const sansSource = BESOINS.map(b => b.id).filter(id => id !== 2 && (BESOIN_SOURCES[id] ?? []).length === 0);
    expect(sansSource).toEqual([6, 7, 11]);
    for (const id of sansSource) {
      expect(motifsNonMesureBesoin(id, {}, SANS_CONTEXTE)).toEqual([
        { motif: 'sans_instrument', idsQuestionnaire: [], dateDernierePassation: null },
      ]);
    }
  });

  it('aucune passation : une seule ligne, les questionnaires dans l’ordre du mapping, sans doublon', () => {
    expect(motifsNonMesureBesoin(9, {}, SANS_CONTEXTE)).toEqual([
      { motif: 'aucune_passation', idsQuestionnaire: ['Q_STR_01', 'Q_STR_02', 'Q_STR_03'], dateDernierePassation: null },
    ]);
    // Trois sous-scores d'un même questionnaire : un seul code.
    expect(motifsNonMesureBesoin(10, {}, SANS_CONTEXTE)).toEqual([
      { motif: 'aucune_passation', idsQuestionnaire: ['Q_INF_03'], dateDernierePassation: null },
    ]);
  });

  it('B3 : la forme du questionnaire qui ne sert pas le sous-score se dit, sans se lire « non passé »', () => {
    const attendu = MAX_RYTHME_CHRONO > 0 ? 'aucune_passation' : 'forme_sans_sous_score';
    expect(motifsNonMesureBesoin(3, {}, SANS_CONTEXTE)?.[0].motif).toBe(attendu);
  });

  it('une passation entièrement écartée par le filtre de validité n’est pas « aucune passation »', () => {
    const contexte: ContexteMotifs = { ecartes: new Set(['Q_STR_02']), datesRetenues: {} };
    expect(motifsNonMesureBesoin(9, {}, contexte)).toEqual([
      { motif: 'aucune_passation', idsQuestionnaire: ['Q_STR_01', 'Q_STR_03'], dateDernierePassation: null },
      { motif: 'passation_ecartee', idsQuestionnaire: ['Q_STR_02'], dateDernierePassation: null },
    ]);
  });

  it('recueil incomplet : daté de la passation retenue, une ligne par questionnaire', () => {
    const contexte: ContexteMotifs = {
      ecartes: new Set(),
      datesRetenues: { Q_STR_01: new Date('2026-10-12T08:00:00.000Z') },
    };
    expect(motifsNonMesureBesoin(9, { Q_STR_01: STR_01_PARTIEL }, contexte)).toEqual([
      { motif: 'recueil_incomplet', idsQuestionnaire: ['Q_STR_01'], dateDernierePassation: '2026-10-12T08:00:00.000Z' },
      { motif: 'aucune_passation', idsQuestionnaire: ['Q_STR_02', 'Q_STR_03'], dateDernierePassation: null },
    ]);
    // Un sous-score partiel (HAD-D, besoin 8) passe par le même motif.
    expect(motifsNonMesureBesoin(8, { Q_NEU_11: { D2: '0' } }, SANS_CONTEXTE)?.[0].motif).toBe('recueil_incomplet');
  });

  it('un besoin mesuré ne reçoit aucun motif, même si une autre de ses sources manque', () => {
    expect(motifsNonMesureBesoin(9, { Q_STR_01: STR_01_COMPLET }, SANS_CONTEXTE)).toBeNull();
    expect(motifsNonMesureBesoin(8, { Q_NEU_11: HAD_D_COMPLET }, SANS_CONTEXTE)).toBeNull();
  });
});

// LE BANC D'ÉGALITÉ — un motif calculé par un second chemin divergerait de la
// valeur. Sur chaque jeu de réponses : motif nul ⇔ couverture non nulle, et
// tout non mesuré porte au moins un motif.
describe('motifsNonMesureBesoin — égalité null ⇔ motif contre calculerCouverturesTousLesBesoins', () => {
  const JEUX: Record<string, ReponsesParQuestionnaire> = {
    vide: {},
    'stress complet': { Q_STR_01: STR_01_COMPLET },
    'stress partiel': { Q_STR_01: STR_01_PARTIEL },
    'HAD-D complet': { Q_NEU_11: HAD_D_COMPLET },
    'HAD-D partiel': { Q_NEU_11: { D2: '0' } },
    mélange: { Q_STR_01: STR_01_PARTIEL, Q_NEU_11: HAD_D_COMPLET, Q_STR_02: {} },
  };

  for (const [nom, reponses] of Object.entries(JEUX)) {
    it(`jeu « ${nom} »`, () => {
      const couvertures = calculerCouverturesTousLesBesoins(reponses);
      for (const besoin of BESOINS) {
        const motifs = motifsNonMesureBesoin(besoin.id, reponses, SANS_CONTEXTE);
        if (couvertures[besoin.id] === null) {
          expect(motifs, `B${besoin.id}`).not.toBeNull();
          expect(motifs!.length, `B${besoin.id}`).toBeGreaterThan(0);
        } else {
          expect(motifs, `B${besoin.id}`).toBeNull();
        }
      }
    });
  }
});

// Un besoin dont toutes les sources sont lues mais dont aucun groupe ne pèse
// (`sommePoids <= 0`, `score.ts`) serait non mesuré SANS motif. La table ne le
// permet pas : ce banc le fige, plutôt que d'inventer un motif.
it('aucune source du mapping ne pèse zéro — un non mesuré a toujours un motif', () => {
  const poids = Object.values(BESOIN_SOURCES).flat().map(s => s.poids ?? 1);
  expect(poids.every(p => p > 0)).toBe(true);
});

// r3_10 (Q5) — l'écart avec la décision, sur le vrai catalogue. Le prédicat
// est celui du snapshot : ce banc ne le recopie pas, il en vérifie l'usage.
describe('ecartsDecisionBesoin — les routes mesurent, la décision écarte', () => {
  const itemsDe = (idQuestionnaire: string, section?: string): string[] =>
    (QUESTIONNAIRE_CATALOGUE[idQuestionnaire as keyof typeof QUESTIONNAIRE_CATALOGUE].sections as ReadonlyArray<{
      id: string;
      questions: ReadonlyArray<{ id: string }>;
    }>)
      .filter(s => section === undefined || s.id === section)
      .flatMap(s => s.questions.map(q => q.id));
  const repondus = (ids: string[]) => Object.fromEntries(ids.map(id => [id, '0']));
  const DATE = new Date('2026-10-12T08:00:00.000Z');

  it('HAD-D complète, un item A manquant : B8 mesuré, la passation n’entre pas dans la décision', () => {
    const contexte: ContexteMotifs = { ecartes: new Set(), datesRetenues: { Q_NEU_11: DATE } };
    expect(ecartsDecisionBesoin(8, { Q_NEU_11: HAD_D_COMPLET }, contexte)).toEqual([
      { idQuestionnaire: 'Q_NEU_11', dateDernierePassation: '2026-10-12T08:00:00.000Z' },
    ]);
  });

  it('passation entière complète : aucun écart', () => {
    expect(ecartsDecisionBesoin(8, { Q_NEU_11: repondus(itemsDe('Q_NEU_11')) }, SANS_CONTEXTE)).toBeNull();
    expect(ecartsDecisionBesoin(9, { Q_STR_01: STR_01_COMPLET }, SANS_CONTEXTE)).toBeNull();
  });

  it('un besoin non mesuré n’a jamais d’écart : l’écart ne va que des routes vers la décision', () => {
    expect(ecartsDecisionBesoin(8, { Q_NEU_11: { D2: '0' } }, SANS_CONTEXTE)).toBeNull();
    expect(ecartsDecisionBesoin(9, { Q_STR_01: STR_01_PARTIEL }, SANS_CONTEXTE)).toBeNull();
    expect(ecartsDecisionBesoin(2, {}, SANS_CONTEXTE)).toBeNull();
  });

  it('DNST : trois sous-scores d’un même questionnaire, une seule ligne ; ME non répondu', () => {
    const dnst = repondus(['DA', 'NA', 'SE'].flatMap(axe => itemsDe('Q_INF_03', axe)));
    expect(ecartsDecisionBesoin(10, { Q_INF_03: dnst }, SANS_CONTEXTE)).toEqual([
      { idQuestionnaire: 'Q_INF_03', dateDernierePassation: null },
    ]);
    // Le besoin 12 lit ME, absent : non mesuré, donc aucun écart.
    expect(ecartsDecisionBesoin(12, { Q_INF_03: dnst }, SANS_CONTEXTE)).toBeNull();
  });

  it('une source qui n’alimente pas la valeur ne porte pas l’écart', () => {
    // Seul l'axe DA est complet : NA et SE ne comptent pas, la ligne reste une.
    const dnst = repondus([...itemsDe('Q_INF_03', 'DA'), 'N1']);
    expect(ecartsDecisionBesoin(10, { Q_INF_03: dnst }, SANS_CONTEXTE)).toEqual([
      { idQuestionnaire: 'Q_INF_03', dateDernierePassation: null },
    ]);
  });

  it('agenda du sommeil clôturé, `null` compris : il compte au besoin 5 et entre dans la décision (D-359)', () => {
    const agenda = {
      ...Object.fromEntries(itemsDe('Q_SOM_09').map(id => [id, null])),
      AGD_NB_NUITS: 18,
      AGD_NB_NUITS_TST: 18,
      AGD_NB_NUITS_EFF: 18,
      AGD_INDICE_ELIGIBLE: 1,
      AGD_TIB_MOY: 480,
      AGD_TST_MOY: 470,
      AGD_EFF_MOY: 95,
      AGD_REG_ECT: 20,
      AGD_QUAL_MOY: 5,
    } as unknown as ReponsesParQuestionnaire[string];
    const reponses: ReponsesParQuestionnaire = { Q_SOM_09: agenda };
    // Le banc n'a de sens que si l'agenda alimente bien la valeur.
    expect(calculerCouverturesTousLesBesoins(reponses)[5]).not.toBeNull();
    expect(ecartsDecisionBesoin(5, reponses, SANS_CONTEXTE)).toBeNull();
  });

  it('sur chaque jeu : un écart n’existe que pour un besoin mesuré', () => {
    const jeux: ReponsesParQuestionnaire[] = [
      {},
      { Q_NEU_11: HAD_D_COMPLET, Q_STR_01: STR_01_PARTIEL },
      { Q_INF_03: repondus(itemsDe('Q_INF_03', 'ME')) },
    ];
    for (const reponses of jeux) {
      const couvertures = calculerCouverturesTousLesBesoins(reponses);
      for (const besoin of BESOINS) {
        if (couvertures[besoin.id] === null) expect(ecartsDecisionBesoin(besoin.id, reponses, SANS_CONTEXTE)).toBeNull();
      }
    }
  });
});

describe('questionnairesEcartesParValidite — le seul étage que la carte des réponses ne voit pas', () => {
  const brute = (idQuestionnaire: string, statutValidite: string | null, jour: number): ReponseBrute => ({
    idQuestionnaire,
    dateReponse: new Date(Date.UTC(2026, 9, jour)),
    scoresJson: { rawAnswers: { A1: 0 } },
    statutValidite,
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('drapeau allumé : un questionnaire dont toutes les passations sont exclues', () => {
    vi.stubEnv('WN_ENABLE_VALIDITE_PASSATIONS', '1');
    const ecartes = questionnairesEcartesParValidite([
      brute('Q_STR_01', 'INVALID', 1),
      brute('Q_STR_02', 'INVALID', 1),
      brute('Q_STR_02', 'VALID', 2),
    ]);
    expect([...ecartes]).toEqual(['Q_STR_01']);
  });

  it('drapeau éteint : rien n’est écarté', () => {
    vi.stubEnv('WN_ENABLE_VALIDITE_PASSATIONS', '');
    expect(questionnairesEcartesParValidite([brute('Q_STR_01', 'INVALID', 1)]).size).toBe(0);
  });
});
