import { describe, expect, it } from 'vitest';
import { buildDecisionCard } from './decisionCard';
import { identifiantPrioriteLibre } from './prioriteLibreServeur';
import type { ClinicalReview, ClinicalSnapshot, DecisionPriorityCandidate } from './types';

function snapshot(): ClinicalSnapshot {
  return {
    snapshotId: 'snapshot-test', patientId: 'patient-test', asOf: '2026-01-02T00:00:00.000Z',
    assessmentEpisode: {
      assessmentEpisodeId: 'episode-test', patientId: 'patient-test', milestone: 'T0',
      targetAt: '2026-01-01T00:00:00.000Z',
      window: { start: '2025-12-24T00:00:00.000Z', end: '2026-01-09T00:00:00.000Z', toleranceDays: 8 },
      candidateResponses: [], inWindowResponseIds: [], outOfWindowResponseIds: [], includedResponseIds: [],
      sourceDateRange: null, status: 'confirmed', confirmedAt: '2026-01-02T00:00:00.000Z',
    },
    patientContext: { mainReason: null, priorityGoal: null, expectations: [], constraints: [] },
    questionnaireFindings: [],
    balanceAssessment: {
      global: { value: null, unit: 'ratio' }, globalBeforeCap: { value: null, unit: 'ratio' }, strata: [],
      needs: [{ needId: 1, strata: 'CORPS', measurement: { value: null, unit: 'ratio' }, evaluability: 'not_measured', evidence: 'NON_MESURE', questionnaireIds: [] }],
      criticalFoundations: [], limitations: [],
    },
    clinicalObjects: [], completeness: { availableDomains: [], missingDomains: [], staleSources: [], sourceDateRange: null },
    sourceRefs: [], versions: { snapshotSchema: 'v1', questionnaireScoring: [], balanceScore: 'v1', needMapping: 'v1', clinicalObjects: 'v1' },
    limitations: [], inputHash: 'snapshot-hash',
  };
}

function review(abstention: ClinicalReview['abstention'] = { status: 'not_required', ruleIds: ['RULE_VALIDATED'], limitations: [] }): ClinicalReview {
  return {
    reviewId: 'review-test', snapshotId: 'snapshot-test', snapshotInputHash: 'snapshot-hash',
    createdAt: '2026-01-03T00:00:00.000Z', version: 'c1-clinical-review-v1',
    rules: [{
      ruleId: 'RULE_VALIDATED', version: 'fixture-v1', lifecycle: 'clinically_validated',
      validation: { validatedAt: '2026-01-01T00:00:00.000Z', validatorRole: 'practitioner', sourceReference: 'fixture-technique' },
    }],
    missingData: [], discordances: [], safetyFindings: [], abstention, limitations: [], inputHash: 'review-hash',
  };
}

function candidate(overrides: Partial<DecisionPriorityCandidate> = {}): DecisionPriorityCandidate {
  return {
    candidateId: 'candidate-1', origin: 'engine', label: 'Priorité de test', rank: 1, confidence: 'à_documenter',
    ruleId: 'RULE_VALIDATED', rationale: 'Justification technique de fixture.',
    provenance: { responseIds: [], needIds: [1], clinicalObjectCodes: [] }, limitationsRegleSignee: [], limitationsPerimetreClassement: [], limitations: [], ...overrides,
  };
}

describe('DecisionCard', () => {
  it('reste prudente sans évaluation explicite de l’abstention', () => {
    const card = buildDecisionCard({
      decisionCardId: 'card-1', createdAt: '2026-01-04T00:00:00.000Z', snapshot: snapshot(),
      review: review({ status: 'not_evaluated', ruleIds: [], limitations: [] }),
      candidates: [candidate()], proposedMainPriorityId: 'candidate-1',
    });
    expect(card.proposedMainPriorityId).toBeNull();
    expect(card.limitations.join(' ')).toContain('Aucune priorité');
  });

  it('normalise candidats et provenance et produit un hash stable hors identifiant', () => {
    const input = {
      createdAt: '2026-01-04T00:00:00.000Z', snapshot: snapshot(), review: review(),
      candidates: [
        candidate({ candidateId: 'candidate-2', rank: 2 }),
        candidate({ provenance: { responseIds: [], needIds: [1, 1], clinicalObjectCodes: [] }, limitations: ['B', 'A', 'A'] }),
      ],
      proposedMainPriorityId: 'candidate-1',
    };
    const first = buildDecisionCard({ decisionCardId: 'card-1', ...input });
    const second = buildDecisionCard({ decisionCardId: 'card-2', ...input });
    expect(first.inputHash).toBe(second.inputHash);
    expect(first.priorityCandidates.map(item => item.candidateId)).toEqual(['candidate-1', 'candidate-2']);
    expect(first.priorityCandidates[0].provenance.needIds).toEqual([1]);
    expect(first.priorityCandidates[0].limitations).toEqual(['A', 'B']);
  });

  it('refuse une règle candidate, une provenance inconnue et les doublons', () => {
    const candidateReview = { ...review(), rules: [{ ruleId: 'RULE_VALIDATED', version: 'v1', lifecycle: 'candidate' as const }] };
    expect(() => buildDecisionCard({
      decisionCardId: 'card-1', createdAt: '2026-01-04T00:00:00.000Z', snapshot: snapshot(),
      review: candidateReview, candidates: [candidate()],
    })).toThrow('règle candidate');
    expect(() => buildDecisionCard({
      decisionCardId: 'card-1', createdAt: '2026-01-04T00:00:00.000Z', snapshot: snapshot(), review: review(),
      candidates: [candidate({ provenance: { responseIds: ['unknown'], needIds: [], clinicalObjectCodes: [] } })],
    })).toThrow('source absente');
    expect(() => buildDecisionCard({
      decisionCardId: 'card-1', createdAt: '2026-01-04T00:00:00.000Z', snapshot: snapshot(), review: review(),
      candidates: [candidate(), candidate()],
    })).toThrow('dupliqué');
  });

  it('refuse une proposition, une sélection ou un contre-factuel hors candidats', () => {
    const base = { decisionCardId: 'card-1', createdAt: '2026-01-04T00:00:00.000Z', snapshot: snapshot(), review: review(), candidates: [candidate()] };
    expect(() => buildDecisionCard({ ...base, proposedMainPriorityId: 'unknown' })).toThrow('proposée');
    expect(() => buildDecisionCard({
      ...base, selectedMainPriority: { candidateId: 'unknown', selectedAt: '2026-01-04T00:00:00.000Z', selectedBy: 'practitioner', rationale: 'Choix fixture.' },
    })).toThrow('sélectionnée');
    expect(() => buildDecisionCard({
      ...base, counterfactuals: [{ counterfactualId: 'cf-1', candidateId: 'unknown', condition: 'Condition fixture.', expectedImpact: 'Impact fixture.', provenance: { responseIds: [], needIds: [], clinicalObjectCodes: [] }, limitations: [] }],
    })).toThrow('contre-factuel');
  });

  it('bloque la sélection en présence d’une abstention ou d’un constat de sécurité', () => {
    const selection = { candidateId: 'candidate-1', selectedAt: '2026-01-04T00:00:00.000Z', selectedBy: 'practitioner' as const, rationale: 'Choix fixture.' };
    expect(() => buildDecisionCard({
      decisionCardId: 'card-1', createdAt: '2026-01-04T00:00:00.000Z', snapshot: snapshot(),
      review: review({ status: 'required', ruleIds: ['RULE_VALIDATED'], limitations: [] }), candidates: [candidate()], selectedMainPriority: selection,
    })).toThrow('bloqueurs');
  });
});

// D-279 — LA PRIORITÉ POSÉE PAR LE PRATICIEN. Elle ne se vérifie pas contre le
// classement mais contre elle-même ; seul un constat de sécurité la refuse.
describe('DecisionCard — priorité posée par le praticien (D-279)', () => {
  const libre = { domaine: 'sommeil' as const, libelle: 'Retrouver un sommeil réparateur' };
  const selectionLibre = {
    candidateId: identifiantPrioriteLibre(libre), selectedAt: '2026-01-04T00:00:00.000Z',
    selectedBy: 'practitioner' as const, rationale: 'Aucun axe proposé ; le patient place le sommeil en tête.', libre,
  };
  const base = { decisionCardId: 'card-1', createdAt: '2026-01-04T00:00:00.000Z', snapshot: snapshot() };
  const avecConstat = (): ClinicalReview => ({
    ...review(),
    safetyFindings: [{ findingId: 'SAFETY_1' }] as unknown as ClinicalReview['safetyFindings'],
  });

  it('est acceptée sans aucun candidat classé', () => {
    const card = buildDecisionCard({ ...base, review: review(), candidates: [], selectedMainPriority: selectionLibre });
    expect(card.priorityCandidates).toEqual([]);
    expect(card.selectedMainPriority).toEqual(selectionLibre);
  });

  it('est acceptée aux côtés des candidats, qui restent servis', () => {
    const card = buildDecisionCard({ ...base, review: review(), candidates: [candidate()], selectedMainPriority: selectionLibre });
    expect(card.priorityCandidates.map(item => item.candidateId)).toEqual(['candidate-1']);
    expect(card.selectedMainPriority?.libre).toEqual(libre);
  });

  it('est acceptée sous abstention pour recueil incomplet — les candidats, eux, restent retirés', () => {
    const card = buildDecisionCard({
      ...base, review: review({ status: 'required', ruleIds: ['RULE_VALIDATED'], limitations: [] }),
      candidates: [], selectedMainPriority: selectionLibre,
    });
    expect(card.selectedMainPriority?.candidateId).toBe(selectionLibre.candidateId);
    expect(card.proposedMainPriorityId).toBeNull();
  });

  it('est refusée dès qu’un constat de sécurité est ouvert', () => {
    expect(() => buildDecisionCard({ ...base, review: avecConstat(), candidates: [], selectedMainPriority: selectionLibre }))
      .toThrow('constats de sécurité');
  });

  it('refuse un identifiant qui ne dérive pas du domaine et du libellé', () => {
    expect(() => buildDecisionCard({
      ...base, review: review(), selectedMainPriority: { ...selectionLibre, libre: { ...libre, libelle: 'Autre libellé' } },
    })).toThrow('identifiant');
    expect(() => buildDecisionCard({
      ...base, review: review(), selectedMainPriority: { ...selectionLibre, libre: { ...libre, domaine: 'digestion' } },
    })).toThrow('identifiant');
  });

  it('refuse un domaine hors liste, un libellé vide ou non normalisé, une forme libre sans libellé', () => {
    const avec = (l: { domaine: string; libelle: string }) => ({
      ...selectionLibre,
      candidateId: identifiantPrioriteLibre(l as typeof libre),
      libre: l as typeof libre,
    });
    expect(() => buildDecisionCard({ ...base, review: review(), selectedMainPriority: avec({ domaine: 'anxiete', libelle: 'X' }) }))
      .toThrow('liste fermée');
    expect(() => buildDecisionCard({ ...base, review: review(), selectedMainPriority: avec({ domaine: 'sommeil', libelle: '' }) }))
      .toThrow('libellé');
    expect(() => buildDecisionCard({ ...base, review: review(), selectedMainPriority: avec({ domaine: 'sommeil', libelle: '  Dormir  ' }) }))
      .toThrow('libellé');
    expect(() => buildDecisionCard({ ...base, review: review(), selectedMainPriority: avec({ domaine: 'sommeil', libelle: 'x'.repeat(201) }) }))
      .toThrow('libellé');
    const { libre: _retire, ...sansLibre } = selectionLibre;
    expect(() => buildDecisionCard({ ...base, review: review(), selectedMainPriority: sansLibre })).toThrow('liste fermée');
  });

  // LES BESOINS VISÉS ([[D-338]] §3) entrent dans la carte avec la priorité
  // posée : les corriger seuls fait dériver la carte, comme corriger le motif,
  // sans changer l'identifiant. Absents, ils ne laissent aucune clé — et
  // l'empreinte d'une carte à priorité posée d'avant la colonne ne bouge pas.
  it('porte les besoins visés d’une priorité posée, sans toucher l’empreinte quand il n’y en a pas', () => {
    const sans = buildDecisionCard({ ...base, review: review(), candidates: [], selectedMainPriority: selectionLibre });
    const avecBesoins = { ...selectionLibre, libre: { ...libre, besoinsVises: [5, 9] } };
    const avec = buildDecisionCard({ ...base, review: review(), candidates: [], selectedMainPriority: avecBesoins });
    expect(avec.selectedMainPriority?.libre?.besoinsVises).toEqual([5, 9]);
    expect(avec.selectedMainPriority?.candidateId).toBe(sans.selectedMainPriority?.candidateId);
    expect(avec.inputHash).not.toBe(sans.inputHash);
    const indefinis = buildDecisionCard({
      ...base, review: review(), candidates: [],
      selectedMainPriority: { ...selectionLibre, libre: { ...libre, besoinsVises: undefined } },
    });
    expect(indefinis.inputHash).toBe(sans.inputHash);
  });

  it('refuse des besoins visés vides, non rangés, doublés ou hors des douze', () => {
    for (const besoinsVises of [[], [9, 5], [5, 5], [0], [13]]) {
      expect(() => buildDecisionCard({
        ...base, review: review(), candidates: [],
        selectedMainPriority: { ...selectionLibre, libre: { ...libre, besoinsVises } },
      })).toThrow('besoins visés');
    }
  });

  it('refuse un candidat du moteur qui porterait un libellé libre', () => {
    expect(() => buildDecisionCard({
      ...base, review: review(), candidates: [candidate()],
      selectedMainPriority: { ...selectionLibre, candidateId: 'candidate-1' },
    })).toThrow('candidat du moteur');
  });

  // L'EMPREINTE DES CARTES DÉJÀ ANCRÉES NE BOUGE PAS : une sélection de
  // candidat ne porte AUCUNE clé `libre`, et une clé `undefined` ne compte pas.
  it('laisse inchangée l’empreinte d’une carte à candidat retenu', () => {
    const selection = { candidateId: 'candidate-1', selectedAt: '2026-01-04T00:00:00.000Z', selectedBy: 'practitioner' as const, rationale: 'Choix fixture.' };
    const card = buildDecisionCard({ ...base, review: review(), candidates: [candidate()], selectedMainPriority: selection });
    expect(Object.keys(card.selectedMainPriority ?? {})).not.toContain('libre');
    const indefinie = buildDecisionCard({
      ...base, review: review(), candidates: [candidate()], selectedMainPriority: { ...selection, libre: undefined },
    });
    expect(indefinie.inputHash).toBe(card.inputHash);
  });
});
