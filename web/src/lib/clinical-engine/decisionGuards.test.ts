import { describe, expect, it } from 'vitest';
import { isDecisionBloquee, type DecisionBloquanteLisible } from './decisionGuards';

function carte(surcharges: Partial<DecisionBloquanteLisible> = {}): DecisionBloquanteLisible {
  return {
    abstention: { status: 'not_required', ruleIds: ['RULE_VALIDATED'], limitations: [] },
    safetyFindingIds: [],
    ...surcharges,
  };
}

describe('isDecisionBloquee', () => {
  it('ne bloque pas une abstention écartée sans finding de sécurité', () => {
    expect(isDecisionBloquee(carte())).toBe(false);
  });

  it('bloque quand une abstention est requise', () => {
    expect(isDecisionBloquee(carte({ abstention: { status: 'required', ruleIds: ['RULE_A'], limitations: [] } }))).toBe(true);
  });

  // Le cœur de la garde : ne pas confondre « pas d'abstention » et « abstention
  // pas encore évaluée ». Seul `not_required` autorise à avancer.
  it("bloque quand l'abstention n'a pas été évaluée", () => {
    expect(isDecisionBloquee(carte({ abstention: { status: 'not_evaluated', ruleIds: [], limitations: [] } }))).toBe(true);
  });

  it('bloque dès qu’un finding de sécurité est présent', () => {
    expect(isDecisionBloquee(carte({ safetyFindingIds: ['SAFETY_1'] }))).toBe(true);
  });

  it('bloque quand les deux causes sont réunies', () => {
    expect(
      isDecisionBloquee(
        carte({ abstention: { status: 'required', ruleIds: ['RULE_A'], limitations: [] }, safetyFindingIds: ['SAFETY_1'] }),
      ),
    ).toBe(true);
  });

  // Absence de carte = rien à affirmer. Le blocage doit être constaté, pas supposé.
  it('ne bloque pas en l’absence de carte de décision', () => {
    expect(isDecisionBloquee(null)).toBe(false);
    expect(isDecisionBloquee(undefined)).toBe(false);
  });
});
