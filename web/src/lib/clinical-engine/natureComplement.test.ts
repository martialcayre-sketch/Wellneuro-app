import { describe, expect, it } from 'vitest';

import { buildProtocolDraft } from './protocolDraft';
import { projeterContenuPatient } from './contenuPatientProtocole';
import { reconstructProtocolDraft, recomputeDraftInputHash } from '../protocol/fromPrisma';
import { VERSION_PROTOCOL_DRAFT, VERSION_PROTOCOL_DRAFT_V3, VERSION_PROTOCOL_DRAFT_V4 } from './types';
import type { DecisionCard, ProtocolAction, ProtocolDraft } from './types';

// Contrat de la nature du complément ([[D-345]] §1 et §3, J3-12h, lot 1) :
// « ciblé » ou « multivitaminé en vente libre » sur une intention de
// complément V4, et les situations déclarées sur un complément ciblé. Liste
// fermée à l'écriture comme à la relecture ; clé absente = empreinte inchangée.

function card(): DecisionCard {
  return {
    decisionCardId: 'card-1', snapshotId: 'snapshot-1', snapshotInputHash: 'snapshot-hash',
    reviewId: 'review-1', reviewInputHash: 'review-hash', createdAt: '2026-01-01T00:00:00.000Z',
    version: 'c1-decision-card-v1', status: 'draft',
    priorityCandidates: [{
      candidateId: 'priority-1', origin: 'engine', label: 'Priorité fixture', rank: 1,
      confidence: 'à_documenter', ruleId: 'RULE_FIXTURE', rationale: 'Fixture technique.',
      provenance: { responseIds: [], needIds: [], clinicalObjectCodes: [] },
      limitationsRegleSignee: [], limitationsPerimetreClassement: [], limitations: [],
    }],
    proposedMainPriorityId: 'priority-1',
    selectedMainPriority: {
      candidateId: 'priority-1', selectedAt: '2026-01-01T00:00:00.000Z',
      selectedBy: 'practitioner', rationale: 'Choix fixture.',
    },
    counterfactuals: [], missingDataFindingIds: [], discordanceFindingIds: [], safetyFindingIds: [],
    abstention: { status: 'not_required', ruleIds: ['RULE_FIXTURE'], limitations: [] },
    limitations: [], inputHash: 'card-hash',
  };
}

function complement(overrides: Partial<ProtocolAction> = {}): ProtocolAction {
  return {
    actionId: 'action-1', type: 'supplement_exploration', title: 'Intention de complément fixture',
    idealPlan: 'Plan idéal fixture.', minimalPlan: 'Plan minimal fixture.',
    rescuePlan: 'Plan secours fixture.', limitations: [], interventionStatus: 'active', ...overrides,
  };
}

function build(actions: ProtocolAction[], version: ProtocolDraft['version'] = VERSION_PROTOCOL_DRAFT_V4) {
  return buildProtocolDraft({
    protocolDraftId: 'protocol-1', decisionCard: card(), createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z', purpose: 'Raison fixture.',
    followUpCriterion: 'Critère observable fixture.',
    therapeuticLoad: { level: 'moderate', source: 'practitioner', justification: null },
    actions, version,
  });
}

function forger(draft: ProtocolDraft, action: Record<string, unknown>): ProtocolDraft {
  const forge = { ...draft, actions: [action as unknown as ProtocolAction] };
  return { ...forge, inputHash: recomputeDraftInputHash(forge) };
}

describe('Nature du complément — écriture', () => {
  it('accepte « ciblé » et « multivitaminé en vente libre » sur une intention V4', () => {
    expect(build([complement({ natureComplement: 'cible' })]).actions[0].natureComplement).toBe('cible');
    expect(build([complement({ natureComplement: 'multivitamine_vente_libre' })]).actions[0].natureComplement)
      .toBe('multivitamine_vente_libre');
  });

  it('ne pose aucune valeur par défaut : absente, la clé n’est pas écrite', () => {
    const action = build([complement()]).actions[0];
    expect('natureComplement' in action).toBe(false);
    expect('situationsComplement' in action).toBe(false);
  });

  it('refuse une valeur hors liste', () => {
    expect(() => build([complement({ natureComplement: 'autre' as never })]))
      .toThrow('Nature de complément inconnue');
  });

  it('refuse la nature hors V4', () => {
    expect(() => build([complement({ natureComplement: 'cible', interventionStatus: undefined })],
      VERSION_PROTOCOL_DRAFT)).toThrow('exige un payload protocole V4');
    expect(() => build([complement({ natureComplement: 'cible', interventionStatus: undefined })],
      VERSION_PROTOCOL_DRAFT_V3)).toThrow('exige un payload protocole V4');
  });

  it('refuse la nature sur une action qui n’est pas une intention de complément', () => {
    expect(() => build([complement({ type: 'food', natureComplement: 'cible' })]))
      .toThrow('ne vise qu’une intention de complément');
  });

  it('dédoublonne et trie les situations ; une liste vide n’écrit pas la clé', () => {
    const action = build([complement({ natureComplement: 'cible', situationsComplement: ['S-MG-2', 'S-MG-1', 'S-MG-2'] })]).actions[0];
    expect(action.situationsComplement).toEqual(['S-MG-1', 'S-MG-2']);
    const vide = build([complement({ natureComplement: 'cible', situationsComplement: [] })]).actions[0];
    expect('situationsComplement' in vide).toBe(false);
  });

  it('refuse une situation sans « ciblé » ou hors liste', () => {
    expect(() => build([complement({ natureComplement: 'multivitamine_vente_libre', situationsComplement: ['S-MG-1'] })]))
      .toThrow('ne se déclare que sur un complément ciblé');
    expect(() => build([complement({ situationsComplement: ['S-MG-1'] })]))
      .toThrow('ne se déclare que sur un complément ciblé');
    expect(() => build([complement({ natureComplement: 'cible', situationsComplement: ['S-XX-9' as never] })]))
      .toThrow('Situation de complément inconnue');
  });
});

describe('Nature du complément — empreintes et relecture', () => {
  it('une action sans nature garde l’empreinte d’avant le champ', () => {
    const sans = build([complement()]);
    const avec = build([complement({ natureComplement: 'cible' })]);
    expect(sans.inputHash).not.toBe(avec.inputHash);
    // L'empreinte d'une action sans nature ne dépend pas de l'existence du
    // champ : la clé absente n'entre pas dans la forme canonique.
    const forgee = forger(sans, { ...sans.actions[0], natureComplement: undefined });
    expect(forgee.inputHash).toBe(sans.inputHash);
  });

  it('relit un payload V4 porteur d’une nature et de situations', () => {
    const draft = build([complement({ natureComplement: 'cible', situationsComplement: ['S-MG-1'] })]);
    expect(reconstructProtocolDraft(draft, draft.inputHash).actions[0].situationsComplement).toEqual(['S-MG-1']);
  });

  it.each([
    ['une nature hors liste', { natureComplement: 'autre' }],
    ['une situation hors liste', { natureComplement: 'cible', situationsComplement: ['S-XX-9'] }],
    ['une situation sur un multivitaminé', { natureComplement: 'multivitamine_vente_libre', situationsComplement: ['S-MG-1'] }],
    ['une liste de situations vide', { natureComplement: 'cible', situationsComplement: [] }],
    ['une liste désordonnée', { natureComplement: 'cible', situationsComplement: ['S-MG-2', 'S-MG-1'] }],
    ['une liste dupliquée', { natureComplement: 'cible', situationsComplement: ['S-MG-1', 'S-MG-1'] }],
  ])('refuse à la relecture %s', (_cas, champs) => {
    const draft = build([complement()]);
    const forge = forger(draft, { ...draft.actions[0], ...champs });
    expect(() => reconstructProtocolDraft(forge, forge.inputHash)).toThrow('Structure ou référence du protocole invalide.');
  });

  it('la vue patient ne porte ni la nature ni les situations', () => {
    const draft = build([complement({ natureComplement: 'cible', situationsComplement: ['S-MG-2'] })]);
    const vue = projeterContenuPatient({ protocolDraft: draft, priorityLabel: 'Priorité fixture' });
    expect(Object.keys(vue.actions[0]).sort()).toEqual(['actionId', 'minimalPlan', 'title', 'type']);
  });

  it('refuse à la relecture une nature dans un payload V1', () => {
    const draft = build([complement({ interventionStatus: undefined })], VERSION_PROTOCOL_DRAFT);
    const forge = forger(draft, { ...draft.actions[0], natureComplement: 'cible' });
    expect(() => reconstructProtocolDraft(forge, forge.inputHash)).toThrow('Structure ou référence du protocole invalide.');
  });
});
