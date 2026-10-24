import { describe, expect, it } from 'vitest';
import { VERSION_SCORE_EQUILIBRE } from '../equilibre/constants';
import { construireReponsesParQuestionnaire } from '../equilibre/depuisPrisma';
import { calculerEquilibre } from '../equilibre/score';
import { confirmAssessmentEpisode, proposeAssessmentEpisode } from './assessmentEpisode';
import { buildClinicalSnapshot } from './clinicalSnapshot';
import type { PatientContext, QuestionnaireResponseInput } from './types';

// PSS-10 complet : source vivante du besoin 9, donc scoreGlobal non-null.
// Le Pichot tenait ce rôle avant v4 ; il n'est plus source de Mon équilibre.
const RAW_ANSWERS = {
  P1: '2', P2: '2', P3: '3', P4: '3', P5: '3',
  P6: '2', P7: '3', P8: '3', P9: '2', P10: '3',
};
const context: PatientContext = { mainReason: null, priorityGoal: null, expectations: [], constraints: [] };

function makeResponse(overrides: Partial<QuestionnaireResponseInput> = {}): QuestionnaireResponseInput {
  return {
    responseId: 'response-1',
    questionnaireId: 'Q_STR_02',
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
      { statutValidite: null, idQuestionnaire: 'Q_STR_02', dateReponse: new Date(responses[0].observedAt), scoresJson: responses[0].scoresJson },
    ]));

    expect(snapshot.balanceAssessment.global).toEqual({
      value: direct.scoreGlobal === null ? null : direct.scoreGlobal / 100,
      unit: 'ratio',
    });
    expect(snapshot.versions.balanceScore).toBe(VERSION_SCORE_EQUILIBRE);
    expect(snapshot.clinicalObjects).toHaveLength(5);
    expect(snapshot.clinicalObjects.find(object => object.code === 'MOMENTUM')?.measurement).toEqual({ value: null, unit: 'delta' });
    expect(snapshot.balanceAssessment.needs.find(need => need.needId === 9)?.evidence).toBe('A');
    // v4 : le besoin 2 (micronutriments) rejoint le besoin 3 parmi les non
    // mesurés — le Pichot n'en est plus la source.
    expect(snapshot.balanceAssessment.needs.find(need => need.needId === 2)?.evidence).toBe('NON_MESURE');
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

  // `not_interpretable` est un TROISIÈME état, pas un synonyme du deuxième.
  // Réutiliser `not_calculable` aurait fait dire « la réponse ne contient pas
  // de données brutes complètes et exploitables » d'une passation qui en porte
  // vingt — c'est exactement pour cela que le lot a préféré élargir le type
  // plutôt que de recycler la valeur voisine.
  it('une passation non interprétable est distinguée d’une réponse incomplète', () => {
    const responses = [makeResponse({
      questionnaireId: 'Q_SOM_07',
      // Réponses brutes COMPLÈTES et exploitables : c'est tout l'enjeu.
      scoresJson: { total: 45, rawAnswers: { M1: 2, M2: 3 } },
    })];
    const snapshot = buildClinicalSnapshot({
      snapshotId: 'snapshot-1', patientId: 'patient-test', asOf: '2026-01-02T00:00:00.000Z',
      assessmentEpisode: confirmedEpisode(responses), patientContext: context, responses,
    });

    const finding = snapshot.questionnaireFindings[0];
    expect(finding.evaluability).toBe('not_interpretable');
    expect(finding.evaluability).not.toBe('not_calculable');
    // La limitation porte le VRAI motif, pas celui des données manquantes.
    expect(finding.limitations[0]).toContain('MFI-20');
    expect(finding.limitations.join(' ')).not.toContain('rawAnswers');
  });

  it('contrôle négatif — un instrument courant reste `calculable`', () => {
    const responses = [makeResponse()];
    const snapshot = buildClinicalSnapshot({
      snapshotId: 'snapshot-1', patientId: 'patient-test', asOf: '2026-01-02T00:00:00.000Z',
      assessmentEpisode: confirmedEpisode(responses), patientContext: context, responses,
    });
    expect(snapshot.questionnaireFindings[0].evaluability).toBe('calculable');
  });

  it('attribue à chaque objet uniquement ses sources effectives', () => {
    const responses = [makeResponse()];
    const snapshot = buildClinicalSnapshot({
      snapshotId: 'snapshot-1', patientId: 'patient-test', asOf: '2026-01-02T00:00:00.000Z',
      assessmentEpisode: confirmedEpisode(responses), patientContext: context, responses,
    });

    // La fixture répond au PSS-10, source du besoin 9 : l'indice global et la
    // réserve d'adaptation (adossée à ce besoin) le revendiquent, les trois
    // autres objets n'ont aucune source — c'est bien « uniquement les sources
    // effectives », et non « une seule ».
    const porteurs = ['ADAPTATION_RESERVE', 'GLOBAL_BALANCE'];
    expect(snapshot.clinicalObjects.find(object => object.code === 'GLOBAL_BALANCE')?.sourceResponseIds).toEqual(['response-1']);
    expect(snapshot.clinicalObjects.find(object => object.code === 'ADAPTATION_RESERVE')?.sourceResponseIds).toEqual(['response-1']);
    expect(snapshot.clinicalObjects.filter(object => !porteurs.includes(object.code)).every(object => object.sourceResponseIds.length === 0)).toBe(true);
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

// J3-12g (D-357) : l'agenda du sommeil est complet au snapshot dès que la
// clôture l'a écrit. Agrégats synthétiques, valeurs techniques de banc.
const AGENDA_COMPLET = {
  AGD_NB_NUITS: 18, AGD_FENETRE_MOY: 480, AGD_TIB_MOY: 500, AGD_PRELIT_MOY: 20,
  AGD_TST_MOY: 420, AGD_EFF_MOY: 88, AGD_LAT_MED: 15, AGD_WASO_MOY: 20,
  AGD_TWAK_MOY: 10, AGD_REV_MOY: 1.2, AGD_REG_ECT: 30, AGD_QUAL_MOY: 3.5,
  AGD_FREQ_LAT30_SEM: 0.5, AGD_FREQ_WASO30_SEM: 0.5, AGD_FREQ_CRITERE_SEM: 1,
  AGD_NB_NUITS_AIDE: 0, AGD_NB_NUITS_TST: 18, AGD_NB_NUITS_EFF: 18,
  AGD_NB_NUITS_PRELIT: 18, AGD_NB_NUITS_REV: 18, AGD_NB_NUITS_TWAK: 18,
  AGD_NB_NUITS_LAT: 18, AGD_NB_NUITS_FREQ_WASO: 18, AGD_NB_NUITS_FREQ: 18,
  AGD_NB_NUITS_AIDE_CONNU: 18, AGD_NB_NUITS_WE: 5, AGD_INDICE_ELIGIBLE: 1,
};
const { AGD_NB_NUITS_LAT: _lat, AGD_NB_NUITS_FREQ_WASO: _freqWaso, ...AGENDA_AVANT_V4 } = AGENDA_COMPLET;

function snapshotAgenda(rawAnswers: Record<string, unknown>) {
  const responses = [makeResponse({ questionnaireId: 'Q_SOM_09', scoresJson: { rawAnswers } })];
  return buildClinicalSnapshot({
    snapshotId: 'snapshot-agenda', patientId: 'patient-test', asOf: '2026-01-02T00:00:00.000Z',
    assessmentEpisode: confirmedEpisode(responses), patientContext: context, responses,
  });
}

/** Ce que les routes lisent pour le besoin 5, sans le filtre du snapshot. */
function besoin5DesRoutes(rawAnswers: Record<string, unknown>): number | null {
  const direct = calculerEquilibre(construireReponsesParQuestionnaire([
    { statutValidite: null, idQuestionnaire: 'Q_SOM_09', dateReponse: new Date('2026-01-01T00:00:00.000Z'), scoresJson: { rawAnswers } },
  ]));
  return direct.strates.flatMap(strate => strate.besoins).find(b => b.besoin === 5)?.couverture ?? null;
}

describe('ClinicalSnapshot — agenda du sommeil (J3-12g, D-357)', () => {
  it.each([
    ['complet', AGENDA_COMPLET],
    ['clôturé avant les compteurs du contrat v4', AGENDA_AVANT_V4],
    ['à métriques non couvertes (null)', { ...AGENDA_COMPLET, AGD_TWAK_MOY: null, AGD_FREQ_LAT30_SEM: null }],
  ])('un agenda %s est calculable et compte au besoin 5 comme aux routes', (_cas, rawAnswers) => {
    const snapshot = snapshotAgenda(rawAnswers);
    const besoin5 = snapshot.balanceAssessment.needs.find(need => need.needId === 5);

    expect(snapshot.questionnaireFindings[0].evaluability).toBe('calculable');
    expect(snapshot.sourceRefs[0].status).toBe('calculated');
    expect(besoin5?.measurement.value).not.toBeNull();
    expect(besoin5?.measurement.value).toBe(besoin5DesRoutes(rawAnswers));
  });

  it('un agenda sous le seuil d’agrégation est calculable, sans indice : le besoin 5 reste non mesuré', () => {
    const snapshot = snapshotAgenda({ AGD_NB_NUITS: 5 });

    expect(snapshot.questionnaireFindings[0].evaluability).toBe('calculable');
    expect(snapshot.questionnaireFindings[0].limitations).toEqual([]);
    expect(snapshot.balanceAssessment.needs.find(need => need.needId === 5)?.measurement.value).toBeNull();
    expect(besoin5DesRoutes({ AGD_NB_NUITS: 5 })).toBeNull();
  });

  // Un agenda clôturé sans nuit plausible : c'est ce que la clôture a écrit,
  // il est donc complet — et ne mesure rien (DC-24).
  it('un agenda clôturé à zéro nuit est calculable et ne mesure pas le besoin 5', () => {
    const snapshot = snapshotAgenda({ AGD_NB_NUITS: 0 });

    expect(snapshot.questionnaireFindings[0].evaluability).toBe('calculable');
    expect(snapshot.balanceAssessment.needs.find(need => need.needId === 5)?.measurement.value).toBeNull();
  });

  it.each([
    ['sans rawAnswers', null],
    ['vide', {}],
    ['sans nombre de nuits', { ...AGENDA_COMPLET, AGD_NB_NUITS: undefined }],
    ['au nombre de nuits null', { ...AGENDA_COMPLET, AGD_NB_NUITS: null }],
    ['au nombre de nuits négatif', { ...AGENDA_COMPLET, AGD_NB_NUITS: -1 }],
    ['au nombre de nuits fractionnaire', { ...AGENDA_COMPLET, AGD_NB_NUITS: 14.5 }],
    ['au nombre de nuits en chaîne', { ...AGENDA_COMPLET, AGD_NB_NUITS: '18' }],
    ['à une valeur illisible', { ...AGENDA_COMPLET, AGD_TST_MOY: 'sept heures' }],
    ['à une valeur en chaîne numérique', { ...AGENDA_COMPLET, AGD_TST_MOY: '420' }],
    ['à une valeur imbriquée', { ...AGENDA_COMPLET, AGD_TST_MOY: { moyenne: 420 } }],
  ])('un agenda %s reste non calculable', (_cas, rawAnswers) => {
    const snapshot = snapshotAgenda(rawAnswers as Record<string, unknown>);
    expect(snapshot.questionnaireFindings[0].evaluability).toBe('not_calculable');
  });

  it('contrôle négatif — un `null` reste une réponse manquante pour un questionnaire ordinaire', () => {
    const responses = [makeResponse({ scoresJson: { rawAnswers: { ...RAW_ANSWERS, P1: null } } })];
    const snapshot = buildClinicalSnapshot({
      snapshotId: 'snapshot-1', patientId: 'patient-test', asOf: '2026-01-02T00:00:00.000Z',
      assessmentEpisode: confirmedEpisode(responses), patientContext: context, responses,
    });
    expect(snapshot.questionnaireFindings[0].evaluability).toBe('not_calculable');
  });
});
