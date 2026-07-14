import { describe, expect, it } from 'vitest';
import { confirmAssessmentEpisode, proposeAssessmentEpisode } from './assessmentEpisode';
import type { QuestionnaireResponseInput } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;
const target = new Date('2026-01-22T00:00:00.000Z');

function response(responseId: string, offsetDays: number): QuestionnaireResponseInput {
  return {
    responseId,
    questionnaireId: 'Q_SOM_06',
    observedAt: new Date(target.getTime() + offsetDays * DAY_MS).toISOString(),
    scoresJson: { rawAnswers: { P1: '1' } },
    scoreVersion: null,
  };
}

describe('AssessmentEpisode', () => {
  it.each(['T0', 'J21', 'J42', 'J90'] as const)('propose un épisode %s avec les bornes ±8 jours incluses', milestone => {
    const episode = proposeAssessmentEpisode({
      assessmentEpisodeId: `episode-${milestone}`,
      patientId: 'patient-test',
      milestone,
      targetAt: target.toISOString(),
      responses: [response('borne-moins', -8), response('borne-plus', 8), response('hors', 9)],
    });

    expect(episode.status).toBe('proposed');
    expect(episode.window.toleranceDays).toBe(8);
    expect(episode.inWindowResponseIds).toEqual(['borne-moins', 'borne-plus']);
    expect(episode.outOfWindowResponseIds).toEqual(['hors']);
  });

  it('permet au praticien de corriger la composition avec une réponse hors fenêtre', () => {
    const proposal = proposeAssessmentEpisode({
      assessmentEpisodeId: 'episode-j21',
      patientId: 'patient-test',
      milestone: 'J21',
      targetAt: target.toISOString(),
      responses: [response('dans', 0), response('hors', 9)],
    });
    const confirmed = confirmAssessmentEpisode(proposal, ['hors'], '2026-01-23T00:00:00.000Z');

    expect(confirmed.status).toBe('confirmed');
    expect(confirmed.includedResponseIds).toEqual(['hors']);
    expect(confirmed.sourceDateRange?.min).toBe(response('hors', 9).observedAt);
  });

  it('rejette une réponse inconnue lors de la confirmation', () => {
    const proposal = proposeAssessmentEpisode({
      assessmentEpisodeId: 'episode-j21',
      patientId: 'patient-test',
      milestone: 'J21',
      targetAt: target.toISOString(),
      responses: [response('connue', 0)],
    });

    expect(() => confirmAssessmentEpisode(proposal, ['inconnue'], target.toISOString())).toThrow('Réponse inconnue');
  });

  it('rejette une date parseable mais non ISO canonique', () => {
    expect(() => proposeAssessmentEpisode({
      assessmentEpisodeId: 'episode-t0', patientId: 'patient-test', milestone: 'T0',
      targetAt: '2026-01-22', responses: [],
    })).toThrow('ISO canonique');
  });
});
