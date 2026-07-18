import { canonicalSha256 } from '@/lib/clinical-engine/canonical';
import type { RecommendedPlateRef } from '@/lib/food-compass/types';
import { readFoodObservationEpisode } from './episode';
import type { TrialTrace } from './types';

export const JA_FEASIBILITY_CONTRACT_VERSION = 'ja-action-feasibility-v1' as const;

export type PublishedJaFeasibility = {
  contractVersion: typeof JA_FEASIBILITY_CONTRACT_VERSION;
  publicationStatus: 'published';
  episodeId: string;
  actionId: string;
  recommendedPlateRef: RecommendedPlateRef | null;
  facts: {
    tracesRecorded: number;
    opportunitiesObserved: number;
    feasibleDeclarations: number;
    adaptedDeclarations: number;
    blockedDeclarations: number;
    noOpportunityDeclarations: number;
  };
  limitations: string[];
  validatedBy: 'practitioner';
  validatedAt: string;
  sourceDraftId: string;
  sourceInputHash: string;
  inputHash: string;
};

function isoDate(value: string, label: string): string {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime()) || date.toISOString() !== value) {
    throw new TypeError(`${label} invalide.`);
  }
  return value;
}

function validateTrace(value: unknown, episodeId: string): TrialTrace {
  if (!value || typeof value !== 'object') throw new TypeError('Trace JA invalide.');
  const trace = value as TrialTrace;
  if (trace.episodeId !== episodeId
    || typeof trace.occasionPresentee !== 'boolean'
    || (trace.faisable !== null && typeof trace.faisable !== 'boolean')
    || !['fait', 'adapte', 'partiel_empeche', 'oublie_non_note'].includes(trace.issue)) {
    throw new TypeError('Trace JA incohérente avec l’épisode.');
  }
  return trace;
}

/**
 * Publication factuelle uniquement. Les comptes ne sont ni un score ni une
 * recommandation et ne modifient jamais le profil intrinsèque C5A.
 */
export function buildPublishedJaFeasibility(input: {
  sourceDraftId: string;
  sourceInputHash: string;
  reviewedAt: string;
  activationReviewedAt: string;
  episode: unknown;
  traces: unknown[];
}): PublishedJaFeasibility {
  const episode = readFoodObservationEpisode(input.episode);
  if (episode.content.regime !== 'essai') {
    throw new TypeError('La faisabilité publiée exige un épisode d’essai.');
  }
  const validatedAt = isoDate(input.reviewedAt, 'reviewedAt');
  if (validatedAt !== isoDate(input.activationReviewedAt, 'activation.reviewedAt')) {
    throw new TypeError('La validation praticien ne correspond pas à la publication JA.');
  }
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(input.sourceDraftId)
    || !/^[a-f0-9]{64}$/.test(input.sourceInputHash)) {
    throw new TypeError('Provenance JA invalide.');
  }
  const traces = input.traces.map(trace => validateTrace(trace, episode.episodeId));
  const facts = {
    tracesRecorded: traces.length,
    opportunitiesObserved: traces.filter(trace => trace.occasionPresentee).length,
    feasibleDeclarations: traces.filter(trace => trace.occasionPresentee && trace.faisable === true).length,
    adaptedDeclarations: traces.filter(trace => trace.occasionPresentee && trace.issue === 'adapte').length,
    blockedDeclarations: traces.filter(trace => trace.occasionPresentee && trace.faisable === false).length,
    noOpportunityDeclarations: traces.filter(trace => !trace.occasionPresentee).length,
  };
  const limitations = [
    'Constats déclaratifs de cet épisode, relus par le praticien ; aucune causalité n’est déduite.',
    'Cette faisabilité n’altère ni le profil intrinsèque ni son agrégat.',
  ];
  const withoutHash = {
    contractVersion: JA_FEASIBILITY_CONTRACT_VERSION,
    publicationStatus: 'published' as const,
    episodeId: episode.episodeId,
    actionId: episode.content.action.actionId,
    recommendedPlateRef: episode.content.action.recommendedPlateRef ?? null,
    facts,
    limitations,
    validatedBy: 'practitioner' as const,
    validatedAt,
    sourceDraftId: input.sourceDraftId,
    sourceInputHash: input.sourceInputHash,
  };
  return { ...withoutHash, inputHash: canonicalSha256(withoutHash) };
}
