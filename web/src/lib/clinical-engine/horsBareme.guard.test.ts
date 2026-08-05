// Banc des items HORS BARÈME face au prédicat de complétude — 2026-07-31.
//
// `hasExploitableRawAnswers` décide si une passation entre dans le bilan
// clinique. Il exige que TOUT item non écarté par sa condition soit renseigné —
// et c'est cette exigence qui rend l'ajout d'un item non coté dangereux.
//
// Le mot `conditionnel` est lu dans DEUX SENS OPPOSÉS dans le dépôt :
//   · `GenericQuestionnaire.tsx` — un item conditionnel est FACULTATIF, toujours ;
//   · `clinicalSnapshot.ts` — un item conditionnel est OBLIGATOIRE dès que sa
//     condition est remplie.
// Un item non coté marqué du seul `conditionnel` sort donc le questionnaire
// ENTIER du bilan quand le patient ne le renseigne pas, alors même que le
// formulaire l'y autorisait. Trouvé en revue adversariale sur le volet
// « conjoint » du PSQI ; ce banc tient la frontière.
import { describe, expect, it } from 'vitest';
import { confirmAssessmentEpisode, proposeAssessmentEpisode } from './assessmentEpisode';
import { buildClinicalSnapshot } from './clinicalSnapshot';
import type { PatientContext, QuestionnaireResponseInput } from './types';

const context: PatientContext = { mainReason: null, priorityGoal: null, expectations: [], constraints: [] };

/** Les 18 items du barème du PSQI, tels qu'une passation antérieure les porte. */
const PSQI_BAREME = {
  Q1: '23', Q2: '10', Q3: '7', Q4: '8',
  Q5a: '0', Q5b: '0', Q5c: '0', Q5d: '0', Q5e: '0',
  Q5f: '0', Q5g: '0', Q5h: '0', Q5i: '0', Q5j: '0',
  Q6: '1', Q7: '0', Q8: '0', Q9: '1',
};

function snapshotDe(rawAnswers: Record<string, string>) {
  const responses: QuestionnaireResponseInput[] = [{
    responseId: 'response-psqi',
    questionnaireId: 'Q_SOM_01',
    observedAt: '2026-01-01T00:00:00.000Z',
    scoresJson: { rawAnswers },
    scoreVersion: 'questionnaire-fixture-v1',
  }];
  const proposal = proposeAssessmentEpisode({
    assessmentEpisodeId: 'episode-1', patientId: 'patient-test', milestone: 'T0',
    targetAt: '2026-01-01T00:00:00.000Z', responses,
  });
  return buildClinicalSnapshot({
    snapshotId: 'snapshot-1', patientId: 'patient-test', asOf: '2026-01-02T00:00:00.000Z',
    assessmentEpisode: confirmAssessmentEpisode(proposal, ['response-psqi'], '2026-01-02T00:00:00.000Z'),
    patientContext: context, responses,
  });
}

/**
 * L'état RÉELLEMENT observable de la passation dans le snapshot : `calculated`
 * quand elle alimente le bilan, `to_verify` quand elle en est écartée. Le motif
 * est lu en plus — une passation peut être écartée pour d'autres raisons
 * (remplacée, obsolète), et confondre les motifs rendrait le banc muet sur
 * celui qui nous occupe.
 */
function etatDe(rawAnswers: Record<string, string>) {
  const ref = snapshotDe(rawAnswers).sourceRefs.find(r => r.responseId === 'response-psqi');
  return {
    statut: ref?.status,
    incomplete: (ref?.limitations ?? []).some(l => l.includes('rawAnswers complets')),
  };
}
const calculable = (rawAnswers: Record<string, string>) =>
  etatDe(rawAnswers).incomplete ? 'not_calculable' : 'calculable';

describe('items hors barème — leur absence n’invalide pas la passation', () => {
  it('une passation ANTÉRIEURE, sans le volet ajouté, reste calculable', () => {
    // Le cas rétroactif, et le plus coûteux : `Q10` n'a aucune condition, donc
    // le prédicat l'exigeait de toutes les passations déjà en base — qui ne
    // peuvent pas la porter, l'item n'existant pas quand elles ont été
    // enregistrées. Les quatre PSQI de production seraient tous devenus
    // `not_calculable`, et le besoin « repos » (poids 2) serait retombé.
    expect(calculable(PSQI_BAREME)).toBe('calculable');
  });

  it('un patient qui déclare un conjoint sans l’interroger reste calculable', () => {
    // Le cas nominal. La section invite explicitement à laisser 11a-e vides
    // faute d'avoir demandé, et le formulaire patient l'autorise : le bilan
    // clinique ne doit pas conclure l'inverse.
    expect(calculable({ ...PSQI_BAREME, Q10: '3' })).toBe('calculable');
  });

  it('le volet entièrement renseigné est calculable lui aussi', () => {
    expect(calculable({
      ...PSQI_BAREME, Q10: '3', Q11a: '2', Q11b: '1', Q11c: '0', Q11d: '0', Q11e: '0',
    })).toBe('calculable');
  });

  it('CONTRE-ÉPREUVE : un item DU BARÈME manquant rend toujours inexploitable', () => {
    // Sans elle, les trois cas ci-dessus passeraient aussi sur un prédicat qui
    // aurait cessé d'exiger quoi que ce soit. `Q6` porte à lui seul la
    // composante 1 : son absence doit continuer de fermer la passation.
    const { Q6: _retire, ...ampute } = PSQI_BAREME;
    expect(calculable(ampute)).toBe('not_calculable');
    // Et la passation sort effectivement du bilan, pas seulement du prédicat.
    expect(etatDe(ampute).statut).toBe('to_verify');
  });

  it('CONTRE-ÉPREUVE : la passation complète alimente bien le bilan', () => {
    // L'anti-vacuité de la précédente : `to_verify` doit être atteignable ET
    // `calculated` aussi, sinon le banc lit un champ qui vaut toujours pareil.
    expect(etatDe(PSQI_BAREME).statut).toBe('calculated');
  });
});
