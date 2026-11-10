import { describe, expect, it } from 'vitest';
import { BESOIN_SOURCES, NIVEAU_PREUVE_PAR_SOURCE } from './constants';
import {
  construireHistoriqueEquilibre,
  construireReponsesParQuestionnaire,
  datesDesReponsesRetenues,
  questionnairesEcartesParValidite,
  rawAnswersLisibles,
  type ReponseBrute,
} from './depuisPrisma';
import { calculerNiveauPreuveBesoin } from './evidence';
import { estRemesure } from './momentumDuCycle';
import { calculerCouvertureBesoin, calculerCouvertureSource } from './score';

// [[D-438]], appliquée par [[D-474]] (t65). Fixtures synthétiques : ce banc prouve
// le mécanisme, il ne décrit aucun parcours (D-125).

const EPWORTH = BESOIN_SOURCES[5].find(s => s.idQuestionnaire === 'Q_SOM_02')!;
const MFI_GEN = BESOIN_SOURCES[5].find(s => s.idQuestionnaire === 'Q_SOM_07')!;

/** Les huit situations de l'Epworth cotées à la même valeur (0 à 3). */
function epworth(valeur: number): Record<string, number> {
  return Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`E${i + 1}`, valeur]));
}

/**
 * Les quatre items de la fatigue générale (M1, M5, M12, M16). M1 et M12 sont
 * inversés (6 − réponse) : `fatigue` = 1 rend GEN = 4, `fatigue` = 5 rend 20.
 */
function mfiGen(fatigue: number): Record<string, number> {
  return { M1: 6 - fatigue, M5: fatigue, M12: 6 - fatigue, M16: fatigue };
}

function passation(idQuestionnaire: string, rawAnswers: Record<string, number>, jour: string): ReponseBrute {
  return { idQuestionnaire, dateReponse: new Date(`${jour}T10:00:00.000Z`), scoresJson: { rawAnswers }, statutValidite: null };
}

describe('besoin 5 — les deux sources de D-438 §1', () => {
  it('sont au groupe repos, poids 1, inversées, niveau A', () => {
    expect(EPWORTH).toEqual({ idQuestionnaire: 'Q_SOM_02', max: 24, inverser: true, groupe: 'repos', poids: 1 });
    expect(MFI_GEN).toEqual({ idQuestionnaire: 'Q_SOM_07', sousScore: 'GEN', min: 4, max: 20, inverser: true, groupe: 'repos', poids: 1 });
    expect(NIVEAU_PREUVE_PAR_SOURCE.Q_SOM_02).toBe('A');
    expect(NIVEAU_PREUVE_PAR_SOURCE.Q_SOM_07).toBe('A');
  });

  it('Epworth : (24 − score) / 24', () => {
    expect(calculerCouvertureSource(EPWORTH, { Q_SOM_02: epworth(0) })).toBe(1);
    expect(calculerCouvertureSource(EPWORTH, { Q_SOM_02: epworth(3) })).toBe(0);
    // 8 × 1,5 n'est pas cotable ; 4 × 3 + 4 × 0 = 12, moitié de l'échelle.
    expect(calculerCouvertureSource(EPWORTH, { Q_SOM_02: { ...epworth(0), E1: 3, E2: 3, E3: 3, E4: 3 } })).toBe(0.5);
  });

  it('MFI-20 : (20 − GEN) / 16 — la borne basse 4, et non 0', () => {
    expect(calculerCouvertureSource(MFI_GEN, { Q_SOM_07: mfiGen(1) })).toBe(1);
    expect(calculerCouvertureSource(MFI_GEN, { Q_SOM_07: mfiGen(5) })).toBe(0);
    // GEN = 12, milieu de 4-20 : 0,5. Sans borne basse, 1 − 12/20 rendrait 0,4.
    expect(calculerCouvertureSource(MFI_GEN, { Q_SOM_07: mfiGen(3) })).toBe(0.5);
  });

  it('une étendue nulle ou renversée (min ≥ max) ne mesure rien, avant toute division', () => {
    expect(calculerCouvertureSource({ ...MFI_GEN, min: 20 }, { Q_SOM_07: mfiGen(3) })).toBeNull();
    expect(calculerCouvertureSource({ ...MFI_GEN, min: 25 }, { Q_SOM_07: mfiGen(3) })).toBeNull();
  });

  it('MFI-20 : seul GEN est lu, les quatre autres sous-échelles n’entrent pas', () => {
    const autres = { M2: 5, M8: 1, M14: 5, M20: 1, M7: 1, M11: 1, M13: 5, M19: 5 };
    expect(calculerCouvertureSource(MFI_GEN, { Q_SOM_07: { ...mfiGen(1), ...autres } })).toBe(1);
  });

  it('MFI-20 : une fatigue générale incomplète ne mesure rien (null, jamais 0)', () => {
    const { M16: _retire, ...troisItems } = mfiGen(5);
    expect(calculerCouvertureSource(MFI_GEN, { Q_SOM_07: troisItems })).toBeNull();
  });

  it('dans le repos, les deux pèsent autant : 1 et 0 donnent 0,5', () => {
    expect(calculerCouvertureBesoin(5, { Q_SOM_02: epworth(0), Q_SOM_07: mfiGen(5) })).toBe(0.5);
  });

  it('le niveau du besoin reste le plus faible des sources remplies (D-438 §4)', () => {
    expect(calculerNiveauPreuveBesoin(5, { Q_SOM_02: epworth(1), Q_SOM_07: mfiGen(2) })).toBe('A');
    expect(calculerNiveauPreuveBesoin(5, { Q_SOM_02: epworth(1), Q_MOD_01: {} })).toBe('A');
  });
});

describe('passations non interprétables — hors du moteur ([[D-474]])', () => {
  const AVANT = passation('Q_SOM_07', mfiGen(5), '2026-07-20');
  const APRES = passation('Q_SOM_07', mfiGen(1), '2026-08-01');

  it('un MFI-20 antérieur au 2026-07-31 ne fournit aucune réponse', () => {
    expect(rawAnswersLisibles(AVANT)).toBeNull();
    expect(construireReponsesParQuestionnaire([AVANT])).toEqual({});
    expect(datesDesReponsesRetenues([AVANT])).toEqual({});
    expect(calculerCouvertureBesoin(5, construireReponsesParQuestionnaire([AVANT]))).toBeNull();
  });

  it('il se dit écarté, pas « aucune passation »', () => {
    expect(questionnairesEcartesParValidite([AVANT]).has('Q_SOM_07')).toBe(true);
    expect(questionnairesEcartesParValidite([AVANT, APRES]).has('Q_SOM_07')).toBe(false);
  });

  it('un MFI-20 postérieur est une mesure ordinaire', () => {
    expect(rawAnswersLisibles(APRES)).toEqual(mfiGen(1));
    expect(construireReponsesParQuestionnaire([AVANT, APRES])).toEqual({ Q_SOM_07: mfiGen(1) });
    expect(calculerCouvertureBesoin(5, construireReponsesParQuestionnaire([APRES]))).toBe(1);
  });

  it('il ne compte pas comme remesure au momentum', () => {
    // Clé `besoin:rang` de `BESOIN_SOURCES`, celle que `sourcesMesurees` émet.
    const mesureesAncre = new Set([`5:${BESOIN_SOURCES[5].indexOf(MFI_GEN)}`]);
    // Témoin : la même source, lisible, EST une remesure — le refus vient de la garde.
    expect(estRemesure(APRES, mesureesAncre)).toBe(true);
    expect(estRemesure(AVANT, mesureesAncre)).toBe(false);
  });

  it('il ne rouvre aucun jalon de l’historique (règle de nouveauté)', () => {
    // Ancre au 2026-07-01 sur l'Epworth ; seul un MFI-20 ancien arrive ensuite.
    const ancre = passation('Q_SOM_02', epworth(1), '2026-07-01');
    const sansLui = construireHistoriqueEquilibre([ancre], new Date('2026-07-01T00:00:00.000Z'));
    const avecLui = construireHistoriqueEquilibre([ancre, AVANT], new Date('2026-07-01T00:00:00.000Z'));
    expect(avecLui).toEqual(sansLui);
  });

  it('une passation invalide et une non interprétable : écarté, et rien n’est lu (drapeau de validité allumé, comme en production)', () => {
    process.env.WN_ENABLE_VALIDITE_PASSATIONS = '1';
    try {
      const invalide: ReponseBrute = { ...APRES, statutValidite: 'INVALID' };
      expect(questionnairesEcartesParValidite([AVANT, invalide]).has('Q_SOM_07')).toBe(true);
      expect(construireReponsesParQuestionnaire([AVANT, invalide])).toEqual({});
    } finally {
      delete process.env.WN_ENABLE_VALIDITE_PASSATIONS;
    }
  });

  it('un instrument hors registre n’est pas touché', () => {
    const epw = passation('Q_SOM_02', epworth(1), '2026-03-01');
    expect(rawAnswersLisibles(epw)).toEqual(epworth(1));
  });
});
