import { TOLERANCE_JOURS_JALON } from '../equilibre/constants';
import type {
  AssessmentResponseRef,
  ConfirmedAssessmentEpisode,
  ProposedAssessmentEpisode,
  QuestionnaireResponseInput,
  SourceDateRange,
} from './types';
import type { JalonMomentum } from '../equilibre/types';

const JOUR_MS = 24 * 60 * 60 * 1000;

function isoDate(value: string, field: string): string {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime()) || date.toISOString() !== value) {
    throw new TypeError(`${field} doit être une date ISO canonique valide.`);
  }
  return date.toISOString();
}

function toRef(response: QuestionnaireResponseInput): AssessmentResponseRef {
  if (!response.responseId.trim() || !response.questionnaireId.trim()) {
    throw new TypeError('Chaque réponse doit avoir un identifiant et un questionnaire.');
  }
  return {
    responseId: response.responseId,
    questionnaireId: response.questionnaireId,
    observedAt: isoDate(response.observedAt, 'observedAt'),
    scoreVersion: response.scoreVersion,
  };
}

function dateRange(refs: AssessmentResponseRef[]): SourceDateRange | null {
  if (refs.length === 0) return null;
  const dates = refs.map(ref => ref.observedAt).sort();
  return { min: dates[0], max: dates[dates.length - 1] };
}

export function proposeAssessmentEpisode(input: {
  assessmentEpisodeId: string;
  patientId: string;
  milestone: JalonMomentum;
  targetAt: string;
  responses: QuestionnaireResponseInput[];
}): ProposedAssessmentEpisode {
  if (!input.assessmentEpisodeId.trim() || !input.patientId.trim()) {
    throw new TypeError('assessmentEpisodeId et patientId sont requis.');
  }
  const targetAt = isoDate(input.targetAt, 'targetAt');
  const targetMs = new Date(targetAt).getTime();
  const toleranceMs = TOLERANCE_JOURS_JALON * JOUR_MS;
  const candidateResponses = input.responses.map(toRef).sort((a, b) => a.responseId.localeCompare(b.responseId));
  if (new Set(candidateResponses.map(ref => ref.responseId)).size !== candidateResponses.length) {
    throw new TypeError('Les identifiants de réponse doivent être uniques.');
  }

  const inWindowResponseIds = candidateResponses
    .filter(ref => Math.abs(new Date(ref.observedAt).getTime() - targetMs) <= toleranceMs)
    .map(ref => ref.responseId);
  const inWindow = new Set(inWindowResponseIds);
  const outOfWindowResponseIds = candidateResponses.filter(ref => !inWindow.has(ref.responseId)).map(ref => ref.responseId);
  const includedRefs = candidateResponses.filter(ref => inWindow.has(ref.responseId));

  return {
    assessmentEpisodeId: input.assessmentEpisodeId,
    patientId: input.patientId,
    milestone: input.milestone,
    targetAt,
    window: {
      start: new Date(targetMs - toleranceMs).toISOString(),
      end: new Date(targetMs + toleranceMs).toISOString(),
      toleranceDays: TOLERANCE_JOURS_JALON,
    },
    candidateResponses,
    inWindowResponseIds,
    outOfWindowResponseIds,
    includedResponseIds: inWindowResponseIds,
    sourceDateRange: dateRange(includedRefs),
    status: 'proposed',
  };
}

export function confirmAssessmentEpisode(
  proposal: ProposedAssessmentEpisode,
  includedResponseIds: string[],
  confirmedAt: string
): ConfirmedAssessmentEpisode {
  const candidates = new Map(proposal.candidateResponses.map(ref => [ref.responseId, ref]));
  const uniqueIds = [...new Set(includedResponseIds)].sort();
  const unknown = uniqueIds.filter(id => !candidates.has(id));
  if (unknown.length > 0) throw new TypeError(`Réponse inconnue dans la confirmation : ${unknown.join(', ')}.`);
  const includedRefs = uniqueIds.map(id => candidates.get(id)!);

  return {
    ...proposal,
    status: 'confirmed',
    includedResponseIds: uniqueIds,
    sourceDateRange: dateRange(includedRefs),
    confirmedAt: isoDate(confirmedAt, 'confirmedAt'),
  };
}
