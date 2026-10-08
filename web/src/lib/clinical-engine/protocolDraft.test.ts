import { describe, expect, it } from 'vitest';
import { buildProtocolDraft, reviseProtocolDraft } from './protocolDraft';
import { actionOrientation, ACTION_ID_ORIENTATION } from './orientationAdressage';
import { projeterContenuPatient } from './contenuPatientProtocole';
import { MAX_ACTIONS_PROTOCOLE_21J, type DecisionCard, type ProtocolAction } from './types';

function card(overrides: Partial<DecisionCard> = {}): DecisionCard {
  return {
    decisionCardId: 'card-1', snapshotId: 'snapshot-1', snapshotInputHash: 'snapshot-hash',
    reviewId: 'review-1', reviewInputHash: 'review-hash', createdAt: '2026-01-01T00:00:00.000Z',
    version: 'c1-decision-card-v1', status: 'draft',
    priorityCandidates: [{
      candidateId: 'priority-1', origin: 'engine', label: 'Priorité fixture', rank: 1,
      confidence: 'à_documenter', ruleId: 'RULE_FIXTURE', rationale: 'Fixture technique.',
      provenance: { responseIds: [], needIds: [], clinicalObjectCodes: [] }, limitationsRegleSignee: [], limitationsPerimetreClassement: [], limitations: [],
    }],
    proposedMainPriorityId: 'priority-1',
    selectedMainPriority: { candidateId: 'priority-1', selectedAt: '2026-01-01T00:00:00.000Z', selectedBy: 'practitioner', rationale: 'Choix fixture.' },
    counterfactuals: [], missingDataFindingIds: [], discordanceFindingIds: [], safetyFindingIds: [],
    abstention: { status: 'not_required', ruleIds: ['RULE_FIXTURE'], limitations: [] },
    limitations: [], inputHash: 'card-input-hash', ...overrides,
  };
}

function action(id = 'action-1', overrides: Partial<ProtocolAction> = {}): ProtocolAction {
  return {
    actionId: id, type: 'food', title: 'Action fixture', idealPlan: 'Plan idéal fixture.',
    minimalPlan: 'Plan minimal fixture.', rescuePlan: 'Plan secours fixture.', limitations: [], ...overrides,
  };
}

/** `n` actions distinctes, a1 à an — dérivées de la borne, jamais écrites à la main. */
function actions(n: number): ProtocolAction[] {
  return Array.from({ length: n }, (_, rang) => action(`a${rang + 1}`));
}

function build(overrides: Partial<Parameters<typeof buildProtocolDraft>[0]> = {}) {
  return buildProtocolDraft({
    protocolDraftId: 'protocol-1', decisionCard: card(), createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z', purpose: 'Raison fixture.',
    followUpCriterion: 'Critère observable fixture.', actions: [action()],
    therapeuticLoad: { level: 'moderate', source: 'practitioner', justification: null }, ...overrides,
  });
}

describe('ProtocolDraft', () => {
  it('construit un brouillon déterministe lié à la priorité sélectionnée', () => {
    const first = build();
    const second = build({ protocolDraftId: 'protocol-2' });
    expect(first.status).toBe('draft');
    expect(first.selectedPriorityId).toBe('priority-1');
    expect(first.therapeuticLoad).toEqual({ level: 'moderate', source: 'practitioner', justification: null });
    expect(first.inputHash).toBe(second.inputHash);
  });

  it('garantit sept actions maximum et refuse les identifiants dupliqués', () => {
    // Entrées DÉRIVÉES de la borne ([[D-273]]) : un plafond qui bouge entraîne
    // le banc avec lui, au lieu de transformer un refus en acceptation.
    expect(MAX_ACTIONS_PROTOCOLE_21J).toBe(7);
    expect(build({ actions: actions(MAX_ACTIONS_PROTOCOLE_21J) }).actions).toHaveLength(MAX_ACTIONS_PROTOCOLE_21J);
    expect(() => build({ actions: actions(MAX_ACTIONS_PROTOCOLE_21J + 1) })).toThrow('sept actions maximum');
    expect(() => build({ actions: [action('a1'), action('a1')] })).toThrow('dupliquée');
  });

  it('refuse les champs requis vides et une charge excessive non justifiée', () => {
    expect(() => build({ purpose: ' ' })).toThrow('raison d’être');
    expect(() => build({ actions: [action('a1', { minimalPlan: '' })] })).toThrow('plan minimal');
    expect(() => build({ therapeuticLoad: { level: 'excessive', source: 'practitioner', justification: null } })).toThrow('justification');
    expect(build({ therapeuticLoad: { level: 'excessive', source: 'practitioner', justification: 'Choix explicite.' } }).therapeuticLoad.justification).toBe('Choix explicite.');
  });

  it('refuse les cartes sans sélection, en abstention ou avec sécurité', () => {
    expect(() => build({ decisionCard: card({ selectedMainPriority: null }) })).toThrow('priorité sélectionnée');
    expect(() => build({ decisionCard: card({ abstention: { status: 'required', ruleIds: ['R'], limitations: [] } }) })).toThrow('abstention');
    expect(() => build({ decisionCard: card({ safetyFindingIds: ['safety-1'] }) })).toThrow('sécurité');
  });

  it('interdit produit, forme, marque ou dose dans une intention de complément', () => {
    const supplement = { ...action('a1', { type: 'supplement_exploration' }), dose: 'interdite' } as ProtocolAction;
    expect(() => build({ actions: [supplement] })).toThrow('produit, forme, marque ou dose');
  });

  it('exige une revue praticien complète et remet toute révision en brouillon', () => {
    const reviewed = build({
      review: { reviewedAt: '2026-01-02T00:00:00.000Z', reviewerRole: 'practitioner', confirmation: 'content_reviewed' },
    });
    expect(reviewed.status).toBe('practitioner_reviewed');
    expect(() => build({ actions: [], review: { reviewedAt: '2026-01-02T00:00:00.000Z', reviewerRole: 'practitioner', confirmation: 'content_reviewed' } })).toThrow('au moins une action');
    expect(() => build({ review: { reviewedAt: '2026-01-02T00:00:00.000Z', reviewerRole: 'system', confirmation: 'content_reviewed' } as never })).toThrow('praticien');
    const revised = reviseProtocolDraft({ existing: reviewed, decisionCard: card(), updatedAt: '2026-01-03T00:00:00.000Z', purpose: 'Raison révisée.' });
    expect(revised.status).toBe('draft');
    expect(revised.review).toBeNull();
  });

  it('refuse les statuts actifs même via une entrée hors contrat', () => {
    const result = build();
    expect(result.status).toBe('draft');
    expect(JSON.stringify(result)).not.toMatch(/active|completed|stopped|sent/);
  });
});

// L'ORIENTATION VERS LE MÉDECIN ([[D-257]] §8, LOT-05).
describe('ProtocolDraft — orientation sur signal adressé', () => {
  const ADRESSEE = card({ safetyFindingAdresseIds: ['safety:anamnese:aaaaaaaaaaaaaaaa'] });
  const avecOrientation = (...autres: ProtocolAction[]) => [actionOrientation(false), ...autres];

  it('signal adressé : l’orientation ouvre le protocole, hors de la borne', () => {
    const draft = build({ decisionCard: ADRESSEE, actions: avecOrientation(...actions(MAX_ACTIONS_PROTOCOLE_21J)) });
    expect(draft.actions).toHaveLength(MAX_ACTIONS_PROTOCOLE_21J + 1);
    expect(draft.actions[0].actionId).toBe(ACTION_ID_ORIENTATION);
    expect(() => build({
      decisionCard: ADRESSEE, actions: avecOrientation(...actions(MAX_ACTIONS_PROTOCOLE_21J + 1)),
    })).toThrow('sept actions maximum');
  });

  it('signal adressé sans orientation, ou orientation ailleurs qu’en tête : refus', () => {
    expect(() => build({ decisionCard: ADRESSEE, actions: [action('a1')] })).toThrow('s’ouvrir sur l’orientation');
    expect(() => build({ decisionCard: ADRESSEE, actions: [action('a1'), actionOrientation(false)] }))
      .toThrow('s’ouvrir sur l’orientation');
  });

  it('le texte signé ne se modifie pas', () => {
    for (const champ of ['title', 'idealPlan', 'minimalPlan', 'rescuePlan'] as const) {
      const alteree = { ...actionOrientation(false), [champ]: 'Texte réécrit.' };
      expect(() => build({ decisionCard: ADRESSEE, actions: [alteree, action('a1')] })).toThrow('texte signé');
    }
    expect(() => build({
      decisionCard: ADRESSEE, actions: [{ ...actionOrientation(false), limitations: ['ajout'] }, action('a1')],
    })).toThrow('texte signé');
  });

  it('sans signal adressé, l’identifiant réservé est refusé — pas d’action de plus déguisée', () => {
    expect(() => build({ actions: avecOrientation(action('a1')) })).toThrow('lorsqu’un signal d’alerte a été adressé');
    // Une orientation ORDINAIRE, choisie par le praticien, reste possible et compte dans la borne.
    expect(build({ actions: [action('a1', { type: 'medical_referral' })] }).actions).toHaveLength(1);
  });

  it('sans signal adressé, rien ne change : empreinte identique à avant le lot', () => {
    expect(build().inputHash).toBe(build({ decisionCard: card({ safetyFindingAdresseIds: undefined }) }).inputHash);
  });

  it('en contrat V4, l’orientation porte `active`', () => {
    const draft = build({
      decisionCard: ADRESSEE, version: 'c1-protocol-draft-v4',
      actions: [actionOrientation(true), action('a1', { interventionStatus: 'active' })],
    } as never);
    expect(draft.actions[0].interventionStatus).toBe('active');
  });

  it('l’aperçu patient porte l’orientation en tête, hors borne', () => {
    const draft = build({ decisionCard: ADRESSEE, actions: avecOrientation(action('a1'), action('a2'), action('a3')) });
    const contenu = projeterContenuPatient({ protocolDraft: draft, candidate: ADRESSEE.priorityCandidates[0] });
    expect(contenu.actions.map(a => a.actionId)).toEqual([ACTION_ID_ORIENTATION, 'a1', 'a2', 'a3']);
    expect(contenu.actions[0]).toEqual({
      actionId: ACTION_ID_ORIENTATION, type: 'medical_referral', title: 'Consulter votre médecin',
      minimalPlan: 'Appeler le cabinet de votre médecin pour fixer ce rendez-vous.',
    });
  });
});

// Revue du 2026-10-03 (P2-1, Q4).
describe('ProtocolDraft — orientation, statut et action praticien', () => {
  const ADRESSEE = card({ safetyFindingAdresseIds: ['safety:anamnese:aaaaaaaaaaaaaaaa'] });
  const V4 = 'c1-protocol-draft-v4';

  it('en V4, l’orientation ne se suspend pas : tout statut autre qu’`active` est refusé', () => {
    for (const statut of ['differee', 'contre_indiquee', 'non_indiquee_actuellement'] as const) {
      expect(() => build({
        decisionCard: ADRESSEE, version: V4,
        actions: [{ ...actionOrientation(true), interventionStatus: statut }, action('a1', { interventionStatus: 'active' })],
      } as never)).toThrow('ne se suspend pas');
    }
    expect(() => build({
      decisionCard: ADRESSEE, version: V4,
      actions: [
        { ...actionOrientation(true), interventionStatus: 'conditionnelle_biologie', waitFor: { type: 'biologie', cible: 'bilan' } },
        action('a1', { interventionStatus: 'active' }),
      ],
    } as never)).toThrow('ne se suspend pas');
  });

  it('l’orientation seule ne fait pas un protocole', () => {
    expect(() => build({ decisionCard: ADRESSEE, actions: [actionOrientation(false)] }))
      .toThrow('au moins une action du praticien');
  });
});
