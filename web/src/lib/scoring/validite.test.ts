import { afterEach, describe, expect, it } from 'vitest';

import {
  estExclueDuRaisonnement,
  filtrerPassationsExploitables,
  validitePassationsActive,
} from './validite';

const FLAG = 'WN_ENABLE_VALIDITE_PASSATIONS';

afterEach(() => {
  delete process.env[FLAG];
});

describe('validite — drapeau éteint (défaut)', () => {
  it("n'exclut rien, quel que soit le statut", () => {
    expect(validitePassationsActive()).toBe(false);
    for (const statut of ['VALID', 'AMBIGUOUS', 'INVALID', 'SUPERSEDED', 'HISTORICAL_ONLY']) {
      expect(estExclueDuRaisonnement(statut)).toBe(false);
    }
  });

  it('rend la liste inchangée (équivalence stricte du comportement actuel)', () => {
    const reponses = [
      { idQuestionnaire: 'Q_ALI_03', statutValidite: 'INVALID' },
      { idQuestionnaire: 'Q_ALI_01', statutValidite: 'VALID' },
    ];
    expect(filtrerPassationsExploitables(reponses)).toEqual(reponses);
  });
});

describe('validite — drapeau allumé', () => {
  it('exclut INVALID, SUPERSEDED et HISTORICAL_ONLY, garde VALID et AMBIGUOUS', () => {
    process.env[FLAG] = '1';
    expect(estExclueDuRaisonnement('INVALID')).toBe(true);
    expect(estExclueDuRaisonnement('SUPERSEDED')).toBe(true);
    expect(estExclueDuRaisonnement('HISTORICAL_ONLY')).toBe(true);
    expect(estExclueDuRaisonnement('VALID')).toBe(false);
    expect(estExclueDuRaisonnement('AMBIGUOUS')).toBe(false);
  });

  it('traite un statut absent comme VALID (ancien client, fixture, mock)', () => {
    process.env[FLAG] = '1';
    expect(estExclueDuRaisonnement(undefined)).toBe(false);
    expect(estExclueDuRaisonnement(null)).toBe(false);
    const sansChamp: Array<{ idQuestionnaire: string; statutValidite?: string | null }> = [
      { idQuestionnaire: 'Q_MOD_01' },
    ];
    expect(filtrerPassationsExploitables(sansChamp)).toEqual(sansChamp);
  });

  it("filtre une liste en préservant l'ordre des lignes conservées", () => {
    process.env[FLAG] = '1';
    const reponses = [
      { id: 'a', statutValidite: 'VALID' },
      { id: 'b', statutValidite: 'SUPERSEDED' },
      { id: 'c', statutValidite: 'AMBIGUOUS' },
      { id: 'd', statutValidite: 'INVALID' },
    ];
    expect(filtrerPassationsExploitables(reponses).map((r) => r.id)).toEqual(['a', 'c']);
  });

  it('ne mute jamais la liste reçue', () => {
    process.env[FLAG] = '1';
    const reponses = [{ id: 'a', statutValidite: 'INVALID' }];
    filtrerPassationsExploitables(reponses);
    expect(reponses).toHaveLength(1);
  });
});
