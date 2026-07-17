import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildProtocolDraft } from './protocolDraft';
import { buildValidationErgoC1Fixture, estModeValidationErgoActif } from './validationErgoFixture';

describe('estModeValidationErgoActif', () => {
  it('n’est actif qu’en développement avec le paramètre exact « c1 »', () => {
    expect(estModeValidationErgoActif('development', 'c1')).toBe(true);

    expect(estModeValidationErgoActif('production', 'c1')).toBe(false);
    expect(estModeValidationErgoActif('test', 'c1')).toBe(false);
    expect(estModeValidationErgoActif(undefined, 'c1')).toBe(false);
    expect(estModeValidationErgoActif('development', undefined)).toBe(false);
    expect(estModeValidationErgoActif('development', '')).toBe(false);
    expect(estModeValidationErgoActif('development', 'C1')).toBe(false);
    expect(estModeValidationErgoActif('development', 'c1 ')).toBe(false);
    // Paramètre répété (?validationErgo=c1&validationErgo=c1) : refusé aussi.
    expect(estModeValidationErgoActif('development', ['c1'])).toBe(false);
    expect(estModeValidationErgoActif('development', ['c1', 'c1'])).toBe(false);
  });
});

describe('buildValidationErgoC1Fixture', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('refuse de construire la fixture en production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => buildValidationErgoC1Fixture()).toThrow('interdit en production');
  });

  it('construit une chaîne C1 cohérente et exploitable par le cockpit', () => {
    const { snapshot, review, decisionCard } = buildValidationErgoC1Fixture();

    expect(snapshot.assessmentEpisode.status).toBe('confirmed');
    expect(review.snapshotInputHash).toBe(snapshot.inputHash);
    expect(decisionCard.snapshotInputHash).toBe(snapshot.inputHash);
    expect(decisionCard.reviewInputHash).toBe(review.inputHash);

    // Épreuve 1 : le cockpit doit avoir de la matière à lire.
    expect(review.missingData.length).toBeGreaterThan(0);
    expect(review.discordances.length).toBeGreaterThan(0);
    expect(decisionCard.priorityCandidates.length).toBeGreaterThan(1);
    expect(decisionCard.counterfactuals.length).toBeGreaterThan(0);

    // Épreuve 2 : aucun bloqueur, priorité sélectionnée — le ProtocolMiniBuilder
    // doit être actif.
    expect(decisionCard.abstention.status).toBe('not_required');
    expect(decisionCard.safetyFindingIds).toEqual([]);
    expect(decisionCard.selectedMainPriority?.candidateId).toBe('ergo-priorite-1');
  });

  it('est déterministe : deux constructions produisent les mêmes hashes', () => {
    const first = buildValidationErgoC1Fixture();
    const second = buildValidationErgoC1Fixture();
    expect(second.snapshot.inputHash).toBe(first.snapshot.inputHash);
    expect(second.review.inputHash).toBe(first.review.inputHash);
    expect(second.decisionCard.inputHash).toBe(first.decisionCard.inputHash);
  });

  it('permet de construire un ProtocolDraft relu via le moteur (Épreuve 2)', () => {
    const { decisionCard } = buildValidationErgoC1Fixture();
    const draft = buildProtocolDraft({
      protocolDraftId: 'ergo-protocol-test',
      decisionCard,
      createdAt: '2026-07-05T08:00:00.000Z',
      updatedAt: '2026-07-05T08:00:00.000Z',
      purpose: 'Raison fixture',
      followUpCriterion: 'Critère fixture',
      actions: [{
        actionId: 'ergo-action-1', type: 'food', title: 'Action fixture',
        idealPlan: 'Idéal fixture', minimalPlan: 'Minimal fixture', rescuePlan: 'Secours fixture',
        limitations: [],
      }],
      therapeuticLoad: { level: 'light', source: 'practitioner', justification: null },
      review: { reviewedAt: '2026-07-05T08:00:00.000Z', reviewerRole: 'practitioner', confirmation: 'content_reviewed' },
    });
    expect(draft.status).toBe('practitioner_reviewed');
    expect(draft.decisionCardInputHash).toBe(decisionCard.inputHash);
    expect(draft.selectedPriorityId).toBe('ergo-priorite-1');
  });
});
