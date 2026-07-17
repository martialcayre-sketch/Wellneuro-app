import type { DecisionDelta, DecisionFeedback, DecisionFeedbackStage } from './types';
import { canonicalIso, nonEmpty } from './validation';

/**
 * Delta de décision instrumenté (A7-14) : ce que les traces du patient ont
 * changé dans une décision praticien. Le retour au patient est court et
 * concret (enseignement 5 JA-0T) — il conditionne l'envie de continuer.
 */
export const LONGUEUR_MAX_DELTA = 280;

export function recordDecisionDelta(input: {
  deltaId: string;
  episodeId: string;
  decisionRef: string;
  description: string;
  traceIds: string[];
}): DecisionDelta {
  nonEmpty(input.deltaId, 'deltaId');
  nonEmpty(input.episodeId, 'episodeId');
  nonEmpty(input.decisionRef, 'decisionRef');
  nonEmpty(input.description, 'description');
  if (input.description.length > LONGUEUR_MAX_DELTA) {
    throw new TypeError(
      `Le retour de décision est court et concret : ${LONGUEUR_MAX_DELTA} caractères au maximum.`
    );
  }
  if (input.traceIds.length === 0) {
    throw new TypeError('Un delta de décision cite au moins une trace.');
  }
  return {
    deltaId: input.deltaId,
    episodeId: input.episodeId,
    decisionRef: input.decisionRef,
    description: input.description,
    traceIds: [...new Set(input.traceIds)].sort(),
  };
}

/** Cycle strictement ordonné du retour de décision : relu → validé → envoyé. */
const ORDRE_RETOUR: DecisionFeedbackStage[] = ['relu', 'valide', 'envoye'];

export function startDecisionFeedback(input: {
  feedbackId: string;
  deltaId: string;
  reluAt: string;
}): DecisionFeedback {
  nonEmpty(input.feedbackId, 'feedbackId');
  nonEmpty(input.deltaId, 'deltaId');
  canonicalIso(input.reluAt, 'reluAt');
  return {
    feedbackId: input.feedbackId,
    deltaId: input.deltaId,
    stage: 'relu',
    historique: [{ stage: 'relu', at: input.reluAt }],
  };
}

export function advanceDecisionFeedback(
  feedback: DecisionFeedback,
  stage: DecisionFeedbackStage,
  at: string
): DecisionFeedback {
  canonicalIso(at, 'at');
  const currentIndex = ORDRE_RETOUR.indexOf(feedback.stage);
  if (ORDRE_RETOUR[currentIndex + 1] !== stage) {
    throw new TypeError(
      `Le retour de décision suit le cycle relu → validé → envoyé (reçu : ${feedback.stage} → ${stage}).`
    );
  }
  const last = feedback.historique[feedback.historique.length - 1];
  if (last && at < last.at) {
    throw new TypeError('L’historique du retour de décision est chronologique.');
  }
  return {
    ...feedback,
    stage,
    historique: [...feedback.historique, { stage, at }],
  };
}
