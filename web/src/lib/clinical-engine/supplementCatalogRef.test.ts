import { describe, expect, it } from 'vitest';
import { buildPatientProtocolView } from './patientProtocolView';
import {
  assertProtocolDraftSupplementStructure,
  assertSupplementCatalogRef,
  buildProtocolDraft,
} from './protocolDraft';
import { VERSION_PROTOCOL_DRAFT, VERSION_PROTOCOL_DRAFT_V3 } from './types';
import type {
  DecisionCard,
  ProtocolAction,
  ProtocolDiffusionApproval,
  ProtocolDraft,
  SupplementCatalogRef,
} from './types';

// Matrice d'acceptation/rejet du contrat V3 (C4 LOT-04) : la référence
// catalogue de compléments exige un payload V3 explicite, est validée
// structurellement en V3, et ne fuit jamais dans la vue patient. Les contrats
// V1/V2 restent inchangés.

function card(overrides: Partial<DecisionCard> = {}): DecisionCard {
  return {
    decisionCardId: 'card-1', snapshotId: 'snapshot-1', snapshotInputHash: 'snapshot-hash',
    reviewId: 'review-1', reviewInputHash: 'review-hash', createdAt: '2026-01-01T00:00:00.000Z',
    version: 'c1-decision-card-v1', status: 'draft',
    priorityCandidates: [{
      candidateId: 'priority-1', origin: 'engine', label: 'Priorité fixture', rank: 1,
      confidence: 'à_documenter', ruleId: 'RULE_FIXTURE', rationale: 'Fixture technique.',
      provenance: { responseIds: [], needIds: [], clinicalObjectCodes: [] }, limitations: [],
    }],
    proposedMainPriorityId: 'priority-1',
    selectedMainPriority: { candidateId: 'priority-1', selectedAt: '2026-01-01T00:00:00.000Z', selectedBy: 'practitioner', rationale: 'Choix fixture.' },
    counterfactuals: [], missingDataFindingIds: [], discordanceFindingIds: [], safetyFindingIds: [],
    abstention: { status: 'not_required', ruleIds: ['RULE_FIXTURE'], limitations: [] },
    limitations: [], inputHash: 'card-hash', ...overrides,
  };
}

function catalogRef(overrides: Partial<SupplementCatalogRef> = {}): SupplementCatalogRef {
  return {
    ingredientId: 'ing-magnesium',
    ruleId: 'rule-mg-01',
    ruleVersion: 1,
    justification: 'Justification praticien fixture.',
    ...overrides,
  };
}

function supplementAction(overrides: Partial<ProtocolAction> = {}): ProtocolAction {
  return {
    actionId: 'action-supp-1', type: 'supplement_exploration', title: 'Complément à explorer',
    idealPlan: 'Plan idéal fixture.', minimalPlan: 'Plan minimal fixture.',
    rescuePlan: 'Plan secours fixture.', limitations: [], ...overrides,
  };
}

function foodAction(overrides: Partial<ProtocolAction> = {}): ProtocolAction {
  return {
    actionId: 'action-food-1', type: 'food', title: 'Action alimentaire fixture',
    idealPlan: 'Plan idéal fixture.', minimalPlan: 'Plan minimal fixture.',
    rescuePlan: 'Plan secours fixture.', limitations: [], ...overrides,
  };
}

function build(actions: ProtocolAction[]) {
  return buildProtocolDraft({
    protocolDraftId: 'protocol-1', decisionCard: card(), createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z', purpose: 'Raison fixture.',
    followUpCriterion: 'Critère observable fixture.', actions,
    therapeuticLoad: { level: 'moderate', source: 'practitioner', justification: null },
  });
}

function draft(overrides: Partial<ProtocolDraft> = {}): ProtocolDraft {
  return {
    protocolDraftId: 'protocol-1', decisionCardId: 'card-1', decisionCardInputHash: 'card-hash',
    selectedPriorityId: 'priority-1', createdAt: '2026-01-02T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z',
    version: VERSION_PROTOCOL_DRAFT_V3, status: 'draft', purpose: 'Raison fixture.',
    followUpCriterion: 'Critère observable fixture.', adviceSheetRef: null,
    actions: [supplementAction({ supplementCatalogRef: catalogRef() })],
    therapeuticLoad: { level: 'moderate', source: 'practitioner', justification: null },
    review: null, limitations: [], inputHash: 'protocol-hash', ...overrides,
  };
}

describe('SupplementCatalogRef — contrat protocole V3', () => {
  it('rejette une référence catalogue à la construction V1', () => {
    expect(() => build([supplementAction({ supplementCatalogRef: catalogRef() })]))
      .toThrow('payload protocole V3 explicite');
  });

  it('rejette une référence catalogue portée par un payload V1 ou V2', () => {
    expect(() => assertProtocolDraftSupplementStructure(draft({ version: 'c1-protocol-draft-v1' })))
      .toThrow('payload protocole V3 explicite');
    expect(() => assertProtocolDraftSupplementStructure(draft({ version: 'c1-protocol-draft-v2' })))
      .toThrow('payload protocole V3 explicite');
  });

  it('accepte un payload V3 sans référence catalogue', () => {
    const sansRef = draft({ actions: [supplementAction(), foodAction()] });
    expect(() => assertProtocolDraftSupplementStructure(sansRef)).not.toThrow();
  });

  it('accepte un payload V3 avec une référence valide, avec ou sans productId', () => {
    expect(() => assertProtocolDraftSupplementStructure(draft())).not.toThrow();
    const avecProduit = draft({
      actions: [supplementAction({ supplementCatalogRef: catalogRef({ productId: 'prod-001' }) })],
    });
    expect(() => assertProtocolDraftSupplementStructure(avecProduit)).not.toThrow();
  });

  it('rejette une référence incomplète : champs requis vides', () => {
    expect(() => assertSupplementCatalogRef(catalogRef({ ingredientId: ' ' }))).toThrow('ingredientId');
    expect(() => assertSupplementCatalogRef(catalogRef({ ruleId: '' }))).toThrow('ruleId');
    expect(() => assertSupplementCatalogRef(catalogRef({ justification: '  ' }))).toThrow('justification');
    expect(() => assertSupplementCatalogRef(catalogRef({ productId: ' ' }))).toThrow('productId');
    // productId: null est distinct de undefined (accepté) et de ' ' (vide) :
    // typeof null !== 'string' → rejet.
    expect(() => assertSupplementCatalogRef(catalogRef({ productId: null as unknown as string }))).toThrow('productId');
  });

  it('rejette un ruleVersion qui n’est pas un entier strictement positif', () => {
    expect(() => assertSupplementCatalogRef(catalogRef({ ruleVersion: 0 }))).toThrow('entier strictement positif');
    expect(() => assertSupplementCatalogRef(catalogRef({ ruleVersion: -1 }))).toThrow('entier strictement positif');
    expect(() => assertSupplementCatalogRef(catalogRef({ ruleVersion: 1.5 }))).toThrow('entier strictement positif');
    expect(() => assertSupplementCatalogRef(catalogRef({ ruleVersion: '1' as unknown as number }))).toThrow('entier strictement positif');
    // Number.isInteger écarte NaN et Infinity — bornes non finies verrouillées.
    expect(() => assertSupplementCatalogRef(catalogRef({ ruleVersion: Number.NaN }))).toThrow('entier strictement positif');
    expect(() => assertSupplementCatalogRef(catalogRef({ ruleVersion: Number.POSITIVE_INFINITY }))).toThrow('entier strictement positif');
  });

  it('rejette tout champ inconnu dans la référence', () => {
    const inconnue = { ...catalogRef(), dose: '200 mg' } as SupplementCatalogRef;
    expect(() => assertSupplementCatalogRef(inconnue)).toThrow('champ inconnu');
    const dansDraft = draft({ actions: [supplementAction({ supplementCatalogRef: inconnue })] });
    expect(() => assertProtocolDraftSupplementStructure(dansDraft)).toThrow('champ inconnu');
  });

  it('rejette toujours les champs libres interdits, V3 comprise', () => {
    const libre = { ...supplementAction({ supplementCatalogRef: catalogRef() }), dose: 'interdite' } as ProtocolAction;
    expect(() => assertProtocolDraftSupplementStructure(draft({ actions: [libre] })))
      .toThrow('produit, forme, marque ou dose');
    const libreSansRef = { ...supplementAction(), marque: 'interdite' } as ProtocolAction;
    expect(() => assertProtocolDraftSupplementStructure(draft({ actions: [libreSansRef] })))
      .toThrow('produit, forme, marque ou dose');
  });

  it('rejette une référence posée sur une action qui n’est pas une intention de complément', () => {
    const surFood = draft({ actions: [foodAction({ supplementCatalogRef: catalogRef() })] });
    expect(() => assertProtocolDraftSupplementStructure(surFood)).toThrow('intention de complément');
  });

  it('laisse la construction V1 inchangée : version V1, jamais de référence portée', () => {
    const result = build([supplementAction()]);
    expect(result.version).toBe(VERSION_PROTOCOL_DRAFT);
    expect(JSON.stringify(result)).not.toContain('supplementCatalogRef');
  });

  it('ne fait fuiter ni la référence ni les plans praticien dans la vue patient', () => {
    const reviewed = draft({
      status: 'practitioner_reviewed',
      review: { reviewedAt: '2026-01-03T00:00:00.000Z', reviewerRole: 'practitioner', confirmation: 'content_reviewed' },
      actions: [supplementAction({
        idealPlan: 'Plan idéal interne.', rescuePlan: 'Plan secours interne.',
        supplementCatalogRef: catalogRef({ productId: 'prod-001', justification: 'Justification praticien interne.' }),
      })],
    });
    const approval: ProtocolDiffusionApproval = {
      decisionCardInputHash: 'card-hash', protocolDraftInputHash: 'protocol-hash',
      approvedAt: '2026-01-04T00:00:00.000Z', approvedBy: 'practitioner',
      confirmation: 'content_approved_for_diffusion',
    };
    const view = buildPatientProtocolView({ decisionCard: card(), protocolDraft: reviewed, approval });
    expect(view.actions[0]).toEqual({
      actionId: 'action-supp-1', type: 'supplement_exploration',
      title: 'Complément à explorer', minimalPlan: 'Plan minimal fixture.',
    });
    const serialized = JSON.stringify(view);
    expect(serialized).not.toMatch(/supplementCatalogRef|ingredientId|ruleId|ruleVersion|prod-001|Justification praticien|Plan idéal|Plan secours|dose/);
  });
});
