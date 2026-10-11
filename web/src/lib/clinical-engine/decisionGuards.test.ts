import { describe, expect, it } from 'vitest';
import {
  isDecisionBloquee,
  isGesteCandidatDisponible,
  isSelectionPrioriteDue,
  type DecisionBloquanteLisible,
  type SelectionPrioriteLisible,
} from './decisionGuards';

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

function carteSelection(surcharges: Partial<SelectionPrioriteLisible> = {}): SelectionPrioriteLisible {
  return {
    ...carte(),
    priorityCandidates: [{
      candidateId: 'p1', origin: 'engine', label: 'Priorité', rank: 1, confidence: 'à_documenter',
      ruleId: 'RULE_VALIDATED', rationale: 'Banc.',
      provenance: { responseIds: [], needIds: [], clinicalObjectCodes: [] },
      limitationsRegleSignee: [], limitationsPerimetreClassement: [], limitations: [],
    }],
    selectedMainPriority: null,
    ...surcharges,
  };
}

describe('isSelectionPrioriteDue', () => {
  it('le geste est dû quand rien n’est retenu et qu’un candidat est classé', () => {
    expect(isSelectionPrioriteDue(carteSelection())).toBe(true);
  });

  it('n’est plus dû une fois une priorité retenue', () => {
    expect(isSelectionPrioriteDue(carteSelection({
      selectedMainPriority: {
        candidateId: 'p1', selectedAt: '2026-01-01T00:00:00.000Z',
        selectedBy: 'practitioner', rationale: 'Banc.',
      },
    }))).toBe(false);
  });

  // UN CONSTAT DE SÉCURITÉ RETIRE TOUT GESTE ([[D-279]] §2) : ni candidat, ni
  // priorité posée. Le réclamer serait envoyer le praticien sur une phase
  // muette — le cul-de-sac déplacé d'un cran.
  it('n’est pas dû quand un constat de sécurité est ouvert : aucun geste n’est offert', () => {
    expect(isSelectionPrioriteDue(carteSelection({ safetyFindingIds: ['SAFETY_1'] }))).toBe(false);
    expect(isSelectionPrioriteDue(carteSelection({ safetyFindingIds: ['SAFETY_1'], priorityCandidates: [] }))).toBe(false);
  });

  // D-279 : SANS CANDIDAT, OU SOUS RECUEIL INCOMPLET, LE GESTE RESTE DÛ — la
  // priorité posée par le praticien l'est. Avant, ces deux dossiers restaient
  // sans protocole.
  it('reste dû sans candidat classé : la priorité posée par le praticien est offerte', () => {
    expect(isSelectionPrioriteDue(carteSelection({ priorityCandidates: [] }))).toBe(true);
  });

  it('reste dû sous abstention pour recueil incomplet, sans constat de sécurité', () => {
    expect(isSelectionPrioriteDue(carteSelection({
      abstention: { status: 'required', ruleIds: ['RULE_A'], limitations: [] },
      priorityCandidates: [],
    }))).toBe(true);
  });

  it('le choix d’un CANDIDAT reste fermé sous abstention ou sans candidat (règle de D-127 inchangée)', () => {
    expect(isGesteCandidatDisponible(carteSelection())).toBe(true);
    expect(isGesteCandidatDisponible(carteSelection({
      abstention: { status: 'required', ruleIds: ['RULE_A'], limitations: [] },
    }))).toBe(false);
    expect(isGesteCandidatDisponible(carteSelection({ priorityCandidates: [] }))).toBe(false);
    expect(isGesteCandidatDisponible(carteSelection({ safetyFindingIds: ['SAFETY_1'] }))).toBe(false);
  });

  // Même discipline que la garde sœur : une absence de carte ne se lit pas.
  it('n’affirme rien en l’absence de carte de décision', () => {
    expect(isSelectionPrioriteDue(null)).toBe(false);
    expect(isSelectionPrioriteDue(undefined)).toBe(false);
  });
});
