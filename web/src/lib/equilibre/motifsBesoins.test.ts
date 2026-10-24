import { afterEach, describe, expect, it, vi } from 'vitest';
import { BESOIN_SOURCES, BESOINS, MAX_RYTHME_CHRONO } from './constants';
import { questionnairesEcartesParValidite, type ReponseBrute } from './depuisPrisma';
import { motifsNonMesureBesoin, type ContexteMotifs } from './motifsBesoins';
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
