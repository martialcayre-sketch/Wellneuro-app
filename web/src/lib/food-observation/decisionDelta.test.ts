import { describe, expect, it } from 'vitest';
import {
  advanceDecisionFeedback,
  LONGUEUR_MAX_DELTA,
  recordDecisionDelta,
  startDecisionFeedback,
} from './decisionDelta';

const deltaBase = {
  deltaId: 'delta-1',
  episodeId: 'ep-1',
  decisionRef: 'decision-2026-08-12',
  description: 'Vos notes ont montré que le matin est plus faisable : la recommandation passe au petit-déjeuner.',
  traceIds: ['trace-2', 'trace-1', 'trace-2'],
};

describe('delta de décision instrumenté (A7-14)', () => {
  it('enregistre ce que les traces ont changé, avec les traces citées dédupliquées', () => {
    const delta = recordDecisionDelta(deltaBase);
    expect(delta.traceIds).toEqual(['trace-1', 'trace-2']);
    expect(delta.decisionRef).toBe('decision-2026-08-12');
  });

  it('reste court et concret (enseignement 5 JA-0T)', () => {
    expect(() =>
      recordDecisionDelta({ ...deltaBase, description: 'a'.repeat(LONGUEUR_MAX_DELTA + 1) })
    ).toThrow(/court/);
  });

  it('cite au moins une trace — sinon il n’y a pas de delta', () => {
    expect(() => recordDecisionDelta({ ...deltaBase, traceIds: [] })).toThrow(/au moins une trace/);
  });
});

describe('retour de décision : cycle relu → validé → envoyé', () => {
  function feedbackRelu() {
    return startDecisionFeedback({
      feedbackId: 'fb-1',
      deltaId: 'delta-1',
      reluAt: '2026-08-12T10:00:00.000Z',
    });
  }

  it('suit le cycle strictement ordonné, horodaté à chaque étape', () => {
    let feedback = feedbackRelu();
    feedback = advanceDecisionFeedback(feedback, 'valide', '2026-08-12T10:05:00.000Z');
    feedback = advanceDecisionFeedback(feedback, 'envoye', '2026-08-12T10:06:00.000Z');
    expect(feedback.stage).toBe('envoye');
    expect(feedback.historique.map(step => step.stage)).toEqual(['relu', 'valide', 'envoye']);
  });

  it('interdit de sauter une étape — jamais d’envoi sans validation', () => {
    expect(() =>
      advanceDecisionFeedback(feedbackRelu(), 'envoye', '2026-08-12T10:05:00.000Z')
    ).toThrow(/relu → validé → envoyé/);
  });

  it('interdit un horodatage antérieur à l’étape précédente', () => {
    expect(() =>
      advanceDecisionFeedback(feedbackRelu(), 'valide', '2026-08-12T09:00:00.000Z')
    ).toThrow(/chronologique/);
  });
});
