import { describe, expect, it } from 'vitest';

import {
  COMPARABLE_DEPUIS,
  comparerPassations,
  debutDuCycleEnCours,
  phraseEcart,
  type PassationLue,
} from './comparaisonPassations';

function p(date: string, score: number | null, extra: Partial<PassationLue> = {}, scoresJson: unknown = { maxTotal: 70 }): PassationLue {
  return {
    idQuestionnaire: 'Q_MOD_03',
    titre: 'Mes plaintes actuelles et troubles ressentis',
    dateReponse: new Date(date),
    statutValidite: 'VALID',
    scorePrincipal: score,
    scoresJson,
    ...extra,
  };
}

describe('comparerPassations (D-406)', () => {
  it('compare les deux plus récentes : a la plus ancienne, b la plus récente, écart b − a', () => {
    const { paires, nonComparees } = comparerPassations(
      [p('2026-10-01T08:00:00Z', 20), p('2026-09-01T08:00:00Z', 50), p('2026-10-20T08:00:00Z', 24.5)],
      null,
    );
    expect(nonComparees).toEqual([]);
    expect(paires).toEqual([
      {
        idQuestionnaire: 'Q_MOD_03',
        titre: 'Mes plaintes actuelles et troubles ressentis',
        a: { date: '2026-10-01T08:00:00.000Z', score: 20 },
        b: { date: '2026-10-20T08:00:00.000Z', score: 24.5 },
        maximum: 70,
        ecart: 4.5,
      },
    ]);
  });

  it('arrondit l’écart au centième (aucun résidu flottant)', () => {
    const { paires } = comparerPassations([p('2026-09-01T08:00:00Z', 0.1), p('2026-09-02T08:00:00Z', 0.3)], null);
    expect(paires[0].ecart).toBe(0.2);
  });

  it('une seule passation : rien, ni paire ni motif', () => {
    expect(comparerPassations([p('2026-09-01T08:00:00Z', 20)], null)).toEqual({ paires: [], nonComparees: [] });
  });

  it('seules VALID et AMBIGUOUS comptent', () => {
    const r = comparerPassations(
      [
        p('2026-09-01T08:00:00Z', 20, { statutValidite: 'AMBIGUOUS' }),
        p('2026-09-02T08:00:00Z', 22, { statutValidite: 'SUPERSEDED' }),
        p('2026-09-03T08:00:00Z', 23, { statutValidite: 'INVALID' }),
        p('2026-09-04T08:00:00Z', 24, { statutValidite: 'HISTORICAL_ONLY' }),
      ],
      null,
    );
    expect(r).toEqual({ paires: [], nonComparees: [] });
  });

  it('le cycle en cours exclut ce qui précède ou égale son début', () => {
    const debut = new Date('2026-09-10T00:00:00Z');
    const passations = [p('2026-09-10T00:00:00Z', 20), p('2026-09-20T08:00:00Z', 22), p('2026-09-30T08:00:00Z', 25)];
    const { paires } = comparerPassations(passations, debut);
    expect(paires[0].a.score).toBe(22);
    expect(comparerPassations(passations.slice(0, 2), debut)).toEqual({ paires: [], nonComparees: [] });
  });

  describe('motifs, dans l’ordre', () => {
    it('version non établie : instrument hors registre', () => {
      const r = comparerPassations(
        [p('2026-09-01T08:00:00Z', 1, { idQuestionnaire: 'Q_NEU_11' }), p('2026-09-02T08:00:00Z', 2, { idQuestionnaire: 'Q_NEU_11' })],
        null,
      );
      expect(r.nonComparees).toEqual([{ idQuestionnaire: 'Q_NEU_11', titre: 'Mes plaintes actuelles et troubles ressentis', motif: 'version_non_etablie' }]);
    });

    it('version non établie : une passation antérieure à la date du registre', () => {
      const r = comparerPassations([p('2026-08-10T23:59:59Z', 20), p('2026-09-02T08:00:00Z', 22)], null);
      expect(r.nonComparees[0].motif).toBe('version_non_etablie');
      expect(comparerPassations([p('2026-08-11T00:00:00Z', 20), p('2026-09-02T08:00:00Z', 22)], null).paires).toHaveLength(1);
    });

    it('PSQI : comparable à partir du 2026-09-14 seulement', () => {
      expect(COMPARABLE_DEPUIS.get('Q_SOM_01')?.toISOString()).toBe('2026-09-14T00:00:00.000Z');
      const psqi = (date: string) => p(date, 8, { idQuestionnaire: 'Q_SOM_01' }, { maxTotal: 21 });
      expect(comparerPassations([psqi('2026-09-13T08:00:00Z'), psqi('2026-09-20T08:00:00Z')], null).nonComparees[0].motif).toBe('version_non_etablie');
      expect(comparerPassations([psqi('2026-09-14T08:00:00Z'), psqi('2026-09-20T08:00:00Z')], null).paires).toHaveLength(1);
    });

    it('interprétation retirée prime : MFI-20 antérieur à sa reconstruction', () => {
      const mfi = (date: string) => p(date, 40, { idQuestionnaire: 'Q_SOM_07' });
      expect(comparerPassations([mfi('2026-07-21T08:00:00Z'), mfi('2026-07-22T08:00:00Z')], null).nonComparees[0].motif).toBe('interpretation_retiree');
    });

    it('une passation est incomplète : score absent, items manquants déclarés', () => {
      const cas: PassationLue[] = [
        p('2026-09-01T08:00:00Z', null),
        p('2026-09-01T08:00:00Z', 20, {}, { maxTotal: 70, missing: 2 }),
        p('2026-09-01T08:00:00Z', 20, {}, { maxTotal: 70, missingIds: ['Q003'] }),
      ];
      for (const incomplete of cas) {
        const r = comparerPassations([incomplete, p('2026-09-02T08:00:00Z', 22)], null);
        expect(r.nonComparees[0].motif).toBe('incomplete');
      }
      const complete = p('2026-09-01T08:00:00Z', 20, {}, { maxTotal: 70, missing: 0, missingIds: [] });
      expect(comparerPassations([complete, p('2026-09-02T08:00:00Z', 22)], null).paires).toHaveLength(1);
    });

    it('grille différente : maximums distincts, ou un seul connu', () => {
      // Le cas réel est la variante courte d'une enquête (42) face à sa forme
      // source (90) ; la règle ne dépend pas de l'instrument.
      const courte = p('2026-09-01T08:00:00Z', 20, {}, { maxTotal: 42 });
      const longue = p('2026-09-02T08:00:00Z', 60, {}, { maxTotal: 90 });
      expect(comparerPassations([courte, longue], null).nonComparees[0].motif).toBe('grille_differente');
      const sansMax = p('2026-09-01T08:00:00Z', 20, {}, {});
      expect(comparerPassations([sansMax, longue], null).nonComparees[0].motif).toBe('grille_differente');
    });

    it('aucun maximum connu des deux côtés : paire, maximum nul', () => {
      const { paires } = comparerPassations([p('2026-09-01T08:00:00Z', 20, {}, {}), p('2026-09-02T08:00:00Z', 22, {}, {})], null);
      expect(paires[0].maximum).toBeNull();
    });
  });
});

describe('debutDuCycleEnCours (D-406 §3)', () => {
  it('sans ancre ou avec une seule : aucun début, tout le dossier', () => {
    expect(debutDuCycleEnCours([])).toBeNull();
    expect(debutDuCycleEnCours([{ rang: 0, confirmedAt: new Date('2026-09-01T00:00:00Z') }])).toBeNull();
  });

  it('la confirmation de l’ancre qui précède celle de rang le plus haut — le rang ordonne, pas la date', () => {
    const t0 = new Date('2026-09-01T00:00:00Z');
    const t1 = new Date('2026-08-01T00:00:00Z');
    const t2 = new Date('2026-07-01T00:00:00Z');
    expect(debutDuCycleEnCours([{ rang: 2, confirmedAt: t2 }, { rang: 0, confirmedAt: t0 }, { rang: 1, confirmedAt: t1 }])).toBe(t1);
  });
});

describe('phraseEcart', () => {
  it('textes validés : hausse, baisse, singulier, même score', () => {
    expect(phraseEcart(0)).toBe('même score');
    expect(phraseEcart(1)).toBe('en hausse de 1 point');
    expect(phraseEcart(-4)).toBe('en baisse de 4 points');
    expect(phraseEcart(4.5)).toBe('en hausse de 4,5 points');
    expect(phraseEcart(-0.5)).toBe('en baisse de 0,5 point');
  });
});
