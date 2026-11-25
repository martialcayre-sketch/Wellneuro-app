import { describe, expect, it } from 'vitest';
import { RAISONS_A_RELIRE, VERDICTS } from './liste';
import {
  LIBELLE_VIGNETTE,
  MENTION_VIGNETTE_A_RELIRE,
  ligneVignette,
  vignettesDesConstats,
  type BesoinLuPourVignette,
} from './vignette';

// La vignette du constat sur un besoin sans score ([[D-551]] §1 à §3) : les
// textes validés par le responsable au mot près, et chaque cas que §3 tranche.

const lu = (surcharge: Partial<BesoinLuPourVignette> = {}): BesoinLuPourVignette => ({
  besoin: 2,
  tete: { verdict: 'a_soutenir' },
  aRelire: [],
  ...surcharge,
});
const AUCUN_SCORE: ReadonlySet<number> = new Set();

describe('textes validés (1001-b), au mot près', () => {
  it('le libellé, la variante « à relire » et le tiret cadratin', () => {
    expect(LIBELLE_VIGNETTE).toBe('constat du praticien :');
    expect(MENTION_VIGNETTE_A_RELIRE).toBe('à relire');
    expect(ligneVignette({ verdict: 'a_soutenir', aRelire: false })).toBe('constat du praticien : à soutenir');
    expect(ligneVignette({ verdict: 'non_retenu', aRelire: true })).toBe('constat du praticien : non retenu — à relire');
    expect(ligneVignette({ verdict: 'non_evaluable', aRelire: false })).toBe('constat du praticien : non évaluable');
    expect(ligneVignette({ verdict: 'sans_objet', aRelire: false })).toBe('constat du praticien : sans objet');
  });

  it('aucun chiffre, quel que soit le verdict, « à relire » ou non', () => {
    for (const verdict of VERDICTS) {
      for (const aRelire of [false, true]) expect(ligneVignette({ verdict, aRelire })).not.toMatch(/\d/);
    }
  });
});

describe('vignettesDesConstats ([[D-551]] §3)', () => {
  it('un constat en vigueur sur un besoin constatable sans score donne sa vignette', () => {
    expect(vignettesDesConstats([lu({ besoin: 2 }), lu({ besoin: 11, tete: { verdict: 'sans_objet' } })], AUCUN_SCORE)).toEqual({
      2: { verdict: 'a_soutenir', aRelire: false },
      11: { verdict: 'sans_objet', aRelire: false },
    });
  });

  it('un besoin qui porte une source de score n’a plus de vignette', () => {
    expect(vignettesDesConstats([lu({ besoin: 6 }), lu({ besoin: 7 })], new Set([6]))).toEqual({
      7: { verdict: 'a_soutenir', aRelire: false },
    });
  });

  it('pas de tête (aucun constat, ou retrait) : pas de vignette', () => {
    expect(vignettesDesConstats([lu({ tete: null })], AUCUN_SCORE)).toEqual({});
  });

  it('un besoin hors des quatre constatables est ignoré', () => {
    expect(vignettesDesConstats([lu({ besoin: 1 }), lu({ besoin: 5 }), lu({ besoin: 12 })], AUCUN_SCORE)).toEqual({});
  });

  it('un verdict hors de la liste fermée, ou nul, est ignoré', () => {
    expect(vignettesDesConstats([lu({ tete: { verdict: 'satisfait' } }), lu({ besoin: 6, tete: { verdict: null } })], AUCUN_SCORE)).toEqual({});
  });

  it('chaque raison de relire de D-347 §5.1 et §5.2 garde la vignette, avec « à relire »', () => {
    const raisons = RAISONS_A_RELIRE.filter(r => r !== 'besoin_avec_score');
    expect(raisons.length).toBeGreaterThan(0);
    for (const raison of raisons) {
      expect(vignettesDesConstats([lu({ aRelire: [raison] })], AUCUN_SCORE)).toEqual({ 2: { verdict: 'a_soutenir', aRelire: true } });
    }
  });

  it('la seule raison « le besoin porte désormais un score » ne marque pas « à relire » : la vignette disparaît par ailleurs', () => {
    expect(vignettesDesConstats([lu({ aRelire: ['besoin_avec_score'] })], AUCUN_SCORE)).toEqual({
      2: { verdict: 'a_soutenir', aRelire: false },
    });
    expect(vignettesDesConstats([lu({ aRelire: ['besoin_avec_score'] })], new Set([2]))).toEqual({});
  });

  it('la vignette ne porte que le verdict et « à relire » (aucun autre champ ne sort)', () => {
    const [vignette] = Object.values(vignettesDesConstats([lu()], AUCUN_SCORE));
    expect(Object.keys(vignette).sort()).toEqual(['aRelire', 'verdict']);
  });
});
