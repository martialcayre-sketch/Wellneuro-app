import { describe, expect, it } from 'vitest';
import { ORIENTATION_RULES_V1 } from '@/lib/clinical/orientationRulesV1';
import { PRIORITY_RULES_V1 } from '@/lib/clinical/priorityRulesV1';
import { BESOIN_SOURCES } from '@/lib/equilibre/constants';
import {
  AMONTS_SIGNES,
  BESOINS,
  controlerLien,
  MODES_LIEN,
  NATURES_LEVIER,
} from './lienLeviers';

// Le contrat du lien besoin → leviers (D-338 §1, H84). Ce banc fige ses listes
// fermées, le contrôle d'un lien, et LIT — sans les toucher — les deux tables
// signées qui portent déjà une clé : leurs `needIds` doivent rester dans le
// vocabulaire du contrat.

describe('listes fermées du contrat (D-338 §1, arbitrages du 2026-10-22)', () => {
  it('cinq natures de levier', () => {
    expect(NATURES_LEVIER).toEqual(['regle', 'action', 'analyte', 'axe', 'fiche']);
  });

  it('trois modes de lien', () => {
    expect(MODES_LIEN).toEqual(['cle_signee', 'deduit_amont_signe', 'sans_objet']);
  });

  it('un seul amont signé, BESOIN_SOURCES', () => {
    expect(AMONTS_SIGNES).toEqual(['BESOIN_SOURCES']);
  });

  it('les douze besoins du contrat sont les clés de BESOIN_SOURCES', () => {
    expect(Object.keys(BESOIN_SOURCES).map(Number)).toEqual([...BESOINS]);
  });
});

describe('les tables signées existantes lues par le contrat, sans retouche', () => {
  const tables = [
    ['priorité', PRIORITY_RULES_V1.map((r) => ({ id: r.id, needIds: r.needIds }))],
    [
      'orientation',
      ORIENTATION_RULES_V1.filter((r) => r.needIds !== undefined).map((r) => ({
        id: r.id,
        needIds: r.needIds,
      })),
    ],
  ] as const;

  for (const [nom, regles] of tables) {
    it(`table de ${nom} : chaque needIds est une clé signée valide`, () => {
      expect(regles.length).toBeGreaterThan(0);
      for (const regle of regles) {
        const r = controlerLien({
          levier: { nature: 'regle', id: regle.id },
          mode: 'cle_signee',
          besoins: regle.needIds,
        });
        expect(r, regle.id).toEqual(expect.objectContaining({ ok: true }));
      }
    });
  }
});

describe('controlerLien', () => {
  const levier = { nature: 'action', id: 'ACT_EXEMPLE' };

  it('accepte une clé signée', () => {
    const r = controlerLien({ levier, mode: 'cle_signee', besoins: [1, 3] });
    expect(r).toEqual({ ok: true, lien: { levier, mode: 'cle_signee', besoins: [1, 3] } });
  });

  it('accepte une déduction qui nomme son amont signé', () => {
    const r = controlerLien({
      levier: { nature: 'axe', id: 'AXE_EXEMPLE' },
      mode: 'deduit_amont_signe',
      amont: 'BESOIN_SOURCES',
      besoins: [4],
    });
    expect(r.ok).toBe(true);
  });

  it('refuse une déduction sans amont, ou d’un amont inconnu', () => {
    for (const amont of [undefined, 'priorityRulesV1']) {
      const r = controlerLien({ levier, mode: 'deduit_amont_signe', amont, besoins: [4] });
      expect(r.ok).toBe(false);
    }
  });

  it('accepte un « sans objet » avec motif, refuse sans motif', () => {
    expect(controlerLien({ levier, mode: 'sans_objet', motif: 'Geste commun.' }).ok).toBe(true);
    for (const motif of [undefined, '', '   ', 3]) {
      const r = controlerLien({ levier, mode: 'sans_objet', motif });
      expect(r).toEqual({ ok: false, erreurs: ['Un levier « sans objet » porte un motif écrit.'] });
    }
  });

  it('refuse un « sans objet » qui porterait aussi des besoins', () => {
    const r = controlerLien({ levier, mode: 'sans_objet', motif: 'x', besoins: [2] });
    expect(r.ok).toBe(false);
  });

  it('refuse une liste de besoins vide, hors bornes, non entière ou en doublon', () => {
    for (const besoins of [[], [0], [13], [2.5], ['2'], [2, 2], undefined, 2]) {
      const r = controlerLien({ levier, mode: 'cle_signee', besoins });
      expect(r.ok, JSON.stringify(besoins)).toBe(false);
    }
  });

  it('refuse une nature de levier hors liste, un identifiant vide, un mode inconnu', () => {
    expect(controlerLien({ levier: { nature: 'complement', id: 'X' }, mode: 'cle_signee', besoins: [1] }).ok).toBe(false);
    expect(controlerLien({ levier: { nature: 'regle', id: ' ' }, mode: 'cle_signee', besoins: [1] }).ok).toBe(false);
    expect(controlerLien({ levier, mode: 'derive', besoins: [1] }).ok).toBe(false);
    expect(controlerLien({ mode: 'cle_signee', besoins: [1] }).ok).toBe(false);
    expect(controlerLien(null).ok).toBe(false);
  });
});
