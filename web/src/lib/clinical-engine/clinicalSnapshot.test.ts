import { describe, expect, it } from 'vitest';
import { VERSION_SCORE_EQUILIBRE } from '../equilibre/constants';
import { construireReponsesParQuestionnaire } from '../equilibre/depuisPrisma';
import { calculerEquilibre } from '../equilibre/score';
import { confirmAssessmentEpisode, proposeAssessmentEpisode } from './assessmentEpisode';
import { buildClinicalSnapshot } from './clinicalSnapshot';
import type { PatientContext, QuestionnaireResponseInput } from './types';

const RAW_ANSWERS = { P1: '2', P2: '2', P3: '1', P4: '1', P5: '1', P6: '1', P7: '1', P8: '1' };
const context: PatientContext = { mainReason: null, priorityGoal: null, expectations: [], constraints: [] };

function makeResponse(overrides: Partial<QuestionnaireResponseInput> = {}): QuestionnaireResponseInput {
  return {
    responseId: 'response-1',
    questionnaireId: 'Q_SOM_06',
    observedAt: '2026-01-01T00:00:00.000Z',
    scoresJson: { rawAnswers: RAW_ANSWERS },
    scoreVersion: 'questionnaire-fixture-v1',
    ...overrides,
  };
}

function confirmedEpisode(responses: QuestionnaireResponseInput[]) {
  const proposal = proposeAssessmentEpisode({
    assessmentEpisodeId: 'episode-1',
    patientId: 'patient-test',
    milestone: 'T0',
    targetAt: '2026-01-01T00:00:00.000Z',
    responses,
  });
  return confirmAssessmentEpisode(proposal, responses.map(response => response.responseId), '2026-01-02T00:00:00.000Z');
}

describe('ClinicalSnapshot', () => {
  it('refuse un épisode non confirmé', () => {
    const responses = [makeResponse()];
    const proposal = proposeAssessmentEpisode({
      assessmentEpisodeId: 'episode-1', patientId: 'patient-test', milestone: 'T0',
      targetAt: '2026-01-01T00:00:00.000Z', responses,
    });

    expect(() => buildClinicalSnapshot({
      snapshotId: 'snapshot-1', patientId: 'patient-test', asOf: '2026-01-02T00:00:00.000Z',
      assessmentEpisode: proposal, patientContext: context, responses,
    })).toThrow('confirmé');
  });

  it('préserve le score, les unités, les versions et les cinq objets cliniques', () => {
    const responses = [makeResponse()];
    const snapshot = buildClinicalSnapshot({
      snapshotId: 'snapshot-1', patientId: 'patient-test', asOf: '2026-01-02T00:00:00.000Z',
      assessmentEpisode: confirmedEpisode(responses), patientContext: context, responses,
    });
    const direct = calculerEquilibre(construireReponsesParQuestionnaire([
      { idQuestionnaire: 'Q_SOM_06', dateReponse: new Date(responses[0].observedAt), scoresJson: responses[0].scoresJson },
    ]));

    expect(snapshot.balanceAssessment.global).toEqual({
      value: direct.scoreGlobal === null ? null : direct.scoreGlobal / 100,
      unit: 'ratio',
    });
    expect(snapshot.versions.balanceScore).toBe(VERSION_SCORE_EQUILIBRE);
    expect(snapshot.clinicalObjects).toHaveLength(5);
    expect(snapshot.clinicalObjects.find(object => object.code === 'MOMENTUM')?.measurement).toEqual({ value: null, unit: 'delta' });
    expect(snapshot.balanceAssessment.needs.find(need => need.needId === 2)?.evidence).toBe('A');
    expect(snapshot.balanceAssessment.needs.find(need => need.needId === 3)?.evidence).toBe('NON_MESURE');
  });

  it('ne transforme jamais une réponse historique inexploitable en zéro', () => {
    const responses = [makeResponse({ scoresJson: { global: 12 }, scoreVersion: null })];
    const snapshot = buildClinicalSnapshot({
      snapshotId: 'snapshot-1', patientId: 'patient-test', asOf: '2026-01-02T00:00:00.000Z',
      assessmentEpisode: confirmedEpisode(responses), patientContext: context, responses,
    });

    expect(snapshot.questionnaireFindings[0].evaluability).toBe('not_calculable');
    expect(snapshot.balanceAssessment.global.value).toBeNull();
    expect(snapshot.balanceAssessment.needs.every(need => need.measurement.value === null)).toBe(true);
    expect(snapshot.limitations).toContain('Version de scoring questionnaire inconnue pour au moins une réponse.');
  });

  it.each([
    { rawAnswers: {} },
    { rawAnswers: { P1: '2' } },
  ])('ne transforme jamais des rawAnswers vides ou partiels en zéro', scoresJson => {
    const responses = [makeResponse({ scoresJson })];
    const snapshot = buildClinicalSnapshot({
      snapshotId: 'snapshot-1', patientId: 'patient-test', asOf: '2026-01-02T00:00:00.000Z',
      assessmentEpisode: confirmedEpisode(responses), patientContext: context, responses,
    });

    expect(snapshot.questionnaireFindings[0].evaluability).toBe('not_calculable');
    expect(snapshot.balanceAssessment.global.value).toBeNull();
  });

  it('attribue à chaque objet uniquement ses sources effectives', () => {
    const responses = [makeResponse()];
    const snapshot = buildClinicalSnapshot({
      snapshotId: 'snapshot-1', patientId: 'patient-test', asOf: '2026-01-02T00:00:00.000Z',
      assessmentEpisode: confirmedEpisode(responses), patientContext: context, responses,
    });

    expect(snapshot.clinicalObjects.find(object => object.code === 'GLOBAL_BALANCE')?.sourceResponseIds).toEqual(['response-1']);
    expect(snapshot.clinicalObjects.filter(object => object.code !== 'GLOBAL_BALANCE').every(object => object.sourceResponseIds.length === 0)).toBe(true);
  });

  it('ne déclare que la réponse la plus récente comme source effective', () => {
    const responses = [
      makeResponse({ responseId: 'response-old', observedAt: '2026-01-01T00:00:00.000Z' }),
      makeResponse({ responseId: 'response-new', observedAt: '2026-01-02T00:00:00.000Z' }),
    ];
    const snapshot = buildClinicalSnapshot({
      snapshotId: 'snapshot-1', patientId: 'patient-test', asOf: '2026-01-03T00:00:00.000Z',
      assessmentEpisode: confirmedEpisode(responses), patientContext: context, responses,
    });

    expect(snapshot.clinicalObjects.find(object => object.code === 'GLOBAL_BALANCE')?.sourceResponseIds).toEqual(['response-new']);
    expect(snapshot.sourceRefs.find(source => source.responseId === 'response-old')).toMatchObject({
      status: 'to_verify',
      limitations: ['Réponse remplacée par une réponse plus récente au même questionnaire.'],
    });
    expect(snapshot.sourceRefs.find(source => source.responseId === 'response-new')?.status).toBe('calculated');
  });

  it('ne réutilise pas une ancienne réponse lorsque la plus récente est inexploitable', () => {
    const responses = [
      makeResponse({ responseId: 'response-old', observedAt: '2026-01-01T00:00:00.000Z' }),
      makeResponse({
        responseId: 'response-new', observedAt: '2026-01-02T00:00:00.000Z',
        scoresJson: { rawAnswers: { P1: '2' } },
      }),
    ];
    const snapshot = buildClinicalSnapshot({
      snapshotId: 'snapshot-1', patientId: 'patient-test', asOf: '2026-01-03T00:00:00.000Z',
      assessmentEpisode: confirmedEpisode(responses), patientContext: context, responses,
    });

    expect(snapshot.balanceAssessment.global.value).toBeNull();
    expect(snapshot.clinicalObjects.find(object => object.code === 'GLOBAL_BALANCE')?.sourceResponseIds).toEqual([]);
    expect(snapshot.sourceRefs.every(source => source.status === 'to_verify')).toBe(true);
  });

  it('porte explicitement la fraîcheur et les limitations des sources', () => {
    const responses = [makeResponse()];
    const snapshot = buildClinicalSnapshot({
      snapshotId: 'snapshot-1', patientId: 'patient-test', asOf: '2026-01-02T00:00:00.000Z',
      assessmentEpisode: confirmedEpisode(responses), patientContext: context, responses,
      staleResponseIds: ['response-1'],
    });

    expect(snapshot.completeness.staleSources).toEqual(['response-1']);
    expect(snapshot.sourceRefs[0].limitations).toContain('Source signalée comme obsolète par l’appelant.');
  });

  it('rejette une date non canonique et un épisode confirmé incohérent', () => {
    const responses = [makeResponse()];
    const episode = confirmedEpisode(responses);
    expect(() => buildClinicalSnapshot({
      snapshotId: 'snapshot-1', patientId: 'patient-test', asOf: '2026-01-02',
      assessmentEpisode: episode, patientContext: context, responses,
    })).toThrow('ISO canonique');

    const forgedResponse = makeResponse({ responseId: 'response-forged' });
    expect(() => buildClinicalSnapshot({
      snapshotId: 'snapshot-1', patientId: 'patient-test', asOf: '2026-01-02T00:00:00.000Z',
      assessmentEpisode: { ...episode, includedResponseIds: ['response-forged'] }, patientContext: context,
      responses: [...responses, forgedResponse],
    })).toThrow('absente des candidates');
  });

  it('produit un hash stable hors snapshotId et sensible aux entrées cliniques', () => {
    const responses = [makeResponse()];
    const base = {
      patientId: 'patient-test', asOf: '2026-01-02T00:00:00.000Z',
      assessmentEpisode: confirmedEpisode(responses), patientContext: context, responses,
    };
    const first = buildClinicalSnapshot({ snapshotId: 'snapshot-1', ...base });
    const renamed = buildClinicalSnapshot({ snapshotId: 'snapshot-2', ...base });
    const changed = buildClinicalSnapshot({
      snapshotId: 'snapshot-3', ...base,
      patientContext: { ...context, priorityGoal: 'objectif synthétique' },
    });
    const changedAnswers = [makeResponse({ scoresJson: { rawAnswers: { ...RAW_ANSWERS, P1: '3' } } })];
    const changedSource = buildClinicalSnapshot({
      snapshotId: 'snapshot-4',
      patientId: 'patient-test',
      asOf: '2026-01-02T00:00:00.000Z',
      assessmentEpisode: confirmedEpisode(changedAnswers),
      patientContext: context,
      responses: changedAnswers,
    });

    expect(first.inputHash).toBe(renamed.inputHash);
    expect(first.inputHash).not.toBe(changed.inputHash);
    expect(first.inputHash).not.toBe(changedSource.inputHash);
  });
});
