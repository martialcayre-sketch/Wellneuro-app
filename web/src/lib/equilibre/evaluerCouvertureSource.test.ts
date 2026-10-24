import { beforeEach, describe, expect, it, vi } from 'vitest';

// r3_08 (Q4) — chaque `null` de `calculerCouvertureSource` porte son étage.
// Moteur et liste de suspension simulés, comme `porteursSousScore.guard.test.ts` :
// les deux branches résiduelles (erreur du moteur, porteurs ambigus) ne sont
// produites par aucun moteur du catalogue aujourd'hui.
const { calculateScore } = vi.hoisted(() => ({ calculateScore: vi.fn() }));
vi.mock('../questions', () => ({ calculateScore }));
vi.mock('../questionnaires-catalog', () => ({ IDS_SUSPENDUS: new Set(['Q_SUSPENDU']) }));

import { calculerCouvertureSource, evaluerCouvertureSource } from './score';

const RACINE = { idQuestionnaire: 'Q_TEST', max: 10, inverser: false };
const SOUS_SCORE = { ...RACINE, sousScore: 'AXE' };
const REPONSES = { Q_TEST: { X1: 1 }, Q_SUSPENDU: { X1: 1 } };

describe('evaluerCouvertureSource — l’étage de chaque non mesuré', () => {
  beforeEach(() => {
    calculateScore.mockReset();
  });

  const cas: [string, () => unknown, object, string][] = [
    ['source suspendue', () => ({ total: 5 }), { ...RACINE, idQuestionnaire: 'Q_SUSPENDU' }, 'source_suspendue'],
    ['forme sans le sous-score (max à 0)', () => ({ total: 5 }), { ...SOUS_SCORE, max: 0 }, 'forme_sans_sous_score'],
    ['aucune passation', () => ({ total: 5 }), { ...RACINE, idQuestionnaire: 'Q_ABSENT' }, 'aucune_passation'],
    ['erreur rendue par le moteur', () => ({ error: 'moteur' }), RACINE, 'calcul_en_erreur'],
    ['total illisible', () => ({}), RACINE, 'calcul_en_erreur'],
    ['recueil partiel', () => ({ total: 5, missing: 2 }), RACINE, 'recueil_incomplet'],
    ['sous-score absent du résultat', () => ({ subScores: [] }), SOUS_SCORE, 'sous_score_absent_ou_double'],
    [
      'sous-score porté deux fois',
      () => ({
        subScores: [{ id: 'AXE', total: 4, repondus: 2, items: 2 }],
        scoresBesoins: [{ id: 'AXE', total: 4, repondus: 2, items: 2 }],
      }),
      SOUS_SCORE,
      'sous_score_absent_ou_double',
    ],
    ['sous-score partiel', () => ({ subScores: [{ id: 'AXE', total: 4, repondus: 1, items: 2 }] }), SOUS_SCORE, 'recueil_incomplet'],
  ];

  for (const [nom, resultat, source, motif] of cas) {
    it(`${nom} → ${motif}, et la valeur reste nulle`, () => {
      calculateScore.mockImplementation(resultat);
      const s = source as Parameters<typeof evaluerCouvertureSource>[0];
      expect(evaluerCouvertureSource(s, REPONSES)).toEqual({ motif });
      expect(calculerCouvertureSource(s, REPONSES)).toBeNull();
    });
  }

  it('une mesure lisible rend sa couverture, inchangée, par les deux fonctions', () => {
    calculateScore.mockReturnValue({ total: 4 });
    expect(evaluerCouvertureSource(RACINE, REPONSES)).toEqual({ couverture: 0.4 });
    expect(calculerCouvertureSource(RACINE, REPONSES)).toBe(0.4);
    expect(calculerCouvertureSource({ ...RACINE, inverser: true }, REPONSES)).toBeCloseTo(0.6, 10);
  });
});
