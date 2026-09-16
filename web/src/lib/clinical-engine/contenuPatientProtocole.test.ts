import { describe, expect, it } from 'vitest';
import { apercuContenuPatient, buildContenuPatientProtocole } from './contenuPatientProtocole';
import { buildPatientProtocolView } from './patientProtocolView';
import type {
  DecisionCard,
  ProtocolAction,
  ProtocolDiffusionApproval,
  ProtocolDraft,
} from './types';

function card(overrides: Partial<DecisionCard> = {}): DecisionCard {
  return {
    decisionCardId: 'card-1', snapshotId: 'snapshot-1', snapshotInputHash: 'snapshot-hash',
    reviewId: 'review-1', reviewInputHash: 'review-hash', createdAt: '2026-01-01T00:00:00.000Z',
    version: 'c1-decision-card-v1', status: 'draft',
    priorityCandidates: [{ candidateId: 'priority-1', origin: 'engine', label: 'Priorité fixture', rank: 1, confidence: 'à_documenter', ruleId: 'RULE_FIXTURE', rationale: 'Interne.', provenance: { responseIds: ['response-1'], needIds: [1], clinicalObjectCodes: [] }, limitationsRegleSignee: [], limitationsPerimetreClassement: [], limitations: ['Interne.'] }],
    proposedMainPriorityId: 'priority-1',
    selectedMainPriority: { candidateId: 'priority-1', selectedAt: '2026-01-01T00:00:00.000Z', selectedBy: 'practitioner', rationale: 'Choix interne.' },
    counterfactuals: [], missingDataFindingIds: [], discordanceFindingIds: [], safetyFindingIds: [],
    abstention: { status: 'not_required', ruleIds: ['RULE_FIXTURE'], limitations: [] },
    limitations: [], inputHash: 'card-hash', ...overrides,
  };
}

function action(overrides: Partial<ProtocolAction> = {}): ProtocolAction {
  return {
    actionId: 'action-1', type: 'food', title: 'Action fixture', idealPlan: 'Plan idéal interne.',
    minimalPlan: 'Plan minimal patient.', rescuePlan: 'Plan secours interne.', limitations: ['Interne.'],
    ...overrides,
  };
}

function protocol(overrides: Partial<ProtocolDraft> = {}): ProtocolDraft {
  return {
    protocolDraftId: 'protocol-1', decisionCardId: 'card-1', decisionCardInputHash: 'card-hash',
    selectedPriorityId: 'priority-1', createdAt: '2026-01-02T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z',
    version: 'c1-protocol-draft-v1', status: 'practitioner_reviewed', purpose: 'Raison fixture.',
    followUpCriterion: 'Critère J21 fixture.', adviceSheetRef: 'fiche-fixture',
    actions: [action()],
    therapeuticLoad: { level: 'moderate', source: 'practitioner', justification: 'Interne.' },
    review: { reviewedAt: '2026-01-03T00:00:00.000Z', reviewerRole: 'practitioner', confirmation: 'content_reviewed' },
    limitations: ['Limite protocole interne.'], inputHash: 'protocol-hash', ...overrides,
  };
}

function approval(): ProtocolDiffusionApproval {
  return {
    decisionCardInputHash: 'card-hash', protocolDraftInputHash: 'protocol-hash',
    approvedAt: '2026-01-04T00:00:00.000Z', approvedBy: 'practitioner',
    confirmation: 'content_approved_for_diffusion',
  };
}

describe('ContenuPatientProtocole — l’aperçu et la diffusion projettent le MÊME contenu', () => {
  // L'INVARIANT DU LOT. Deux descriptions de ce que le patient lit avaient déjà
  // divergé une fois ([[D-200]] dette 1) : l'aperçu du cockpit ignorait
  // `interventionStatus`. Ce banc rougit dès qu'un champ patient n'est plus
  // projeté à l'identique des deux côtés.
  it('rend, champ pour champ, ce que la vue diffusée porte', () => {
    const decisionCard = card();
    const protocolDraft = protocol({
      actions: [action(), action({ actionId: 'action-2', type: 'biological_exploration', title: 'Bilan', interventionStatus: 'conditionnelle_biologie' })],
    });
    const contenu = buildContenuPatientProtocole({ decisionCard, protocolDraft });
    const vue = buildPatientProtocolView({ decisionCard, protocolDraft, approval: approval() });

    expect(contenu.priorityLabel).toBe(vue.priorityLabel);
    expect(contenu.purpose).toBe(vue.purpose);
    expect(contenu.followUpCriterion).toBe(vue.followUpCriterion);
    expect(contenu.adviceSheetRef).toBe(vue.adviceSheetRef);
    expect(contenu.limitations).toEqual(vue.limitations);
    expect(contenu.actions).toEqual(vue.actions);
  });

  it('n’atteste rien : aucun champ de diffusion, aucune signature', () => {
    const contenu = buildContenuPatientProtocole({ decisionCard: card(), protocolDraft: protocol() });
    expect(Object.keys(contenu).sort()).toEqual([
      'actions', 'adviceSheetRef', 'followUpCriterion', 'limitations', 'priorityLabel', 'purpose',
    ]);
  });

  it('accompagne une intervention non ferme de sa phrase d’attente', () => {
    const contenu = buildContenuPatientProtocole({
      decisionCard: card(),
      protocolDraft: protocol({
        actions: [action({ type: 'biological_exploration', interventionStatus: 'conditionnelle_biologie' })],
      }),
    });
    expect(contenu.actions[0].attente).toBe('En attente de confirmation par votre bilan.');
    expect(contenu.actions[0].interventionStatus).toBe('conditionnelle_biologie');
  });
});

describe('ContenuPatientProtocole — un refus porte son motif', () => {
  it('refuse un protocole non relu, et le dit', () => {
    const refus = apercuContenuPatient({
      decisionCard: card(),
      protocolDraft: protocol({ status: 'draft', review: null }),
    });
    expect(refus.ok).toBe(false);
    expect(refus.ok === false && refus.motif).toBe('contrat_refuse');
    expect(refus.ok === false && refus.detail).toContain('relu par le praticien');
  });

  it('refuse un bloqueur de sécurité et une abstention requise', () => {
    expect(apercuContenuPatient({
      decisionCard: card({ safetyFindingIds: ['safety-1'] }), protocolDraft: protocol(),
    }).ok).toBe(false);
    expect(apercuContenuPatient({
      decisionCard: card({ abstention: { status: 'required', ruleIds: [], limitations: [] } }),
      protocolDraft: protocol(),
    }).ok).toBe(false);
  });

  // CE QUE L'APERÇU ÉCRIT À LA MAIN LAISSAIT PASSER. Ses conditions recopiées
  // ne comptaient pas les actions : un protocole sans action déverrouillait un
  // aperçu vide, un protocole à quatre actions en montrait quatre.
  it('refuse zéro action comme quatre', () => {
    expect(apercuContenuPatient({ decisionCard: card(), protocolDraft: protocol({ actions: [] }) }).ok).toBe(false);
    expect(apercuContenuPatient({
      decisionCard: card(),
      protocolDraft: protocol({
        actions: [1, 2, 3, 4].map(n => action({ actionId: `action-${n}` })),
      }),
    }).ok).toBe(false);
  });

  it('refuse un statut d’intervention inconnu plutôt que de le taire', () => {
    const refus = apercuContenuPatient({
      decisionCard: card(),
      protocolDraft: protocol({
        actions: [action({ interventionStatus: 'statut_inconnu' as ProtocolAction['interventionStatus'] })],
      }),
    });
    expect(refus.ok === false && refus.detail).toContain('Statut d’intervention patient inconnu');
  });
});
