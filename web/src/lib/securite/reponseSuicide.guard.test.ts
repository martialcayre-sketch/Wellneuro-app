import { describe, expect, it } from 'vitest';
import { ANAMNESE_SECTIONS } from '@/lib/consultation/anamnese';
import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';
import { SAFETY_SIGNALS_V1 } from '@/lib/clinical/safetySignalsV1';
import { SAFETY_QUESTIONNAIRE_V1 } from '@/lib/clinical/safetyQuestionnaireV1';
import {
  CASE_ANAMNESE_IDEES_SUICIDAIRES,
  CHAMP_ANAMNESE_SIGNAUX,
  MESSAGE_REPONSE_SUICIDE,
  SECTION_ANAMNESE_SIGNAUX,
  anamneseSignaleIdeesSuicidaires,
  estReponseSuicidePositive,
  questionnairePorteReponseSuicidePositive,
} from './urgenceSuicide';
import { transmissionAppelleAlerteSecurite } from './alerteSecuritePraticien';

// LA GARDE DU MESSAGE SUR RÉPONSE POSITIVE ([[D-277]]). Deux règles calculent
// « positive » : celle du navigateur (le message au patient) et celle du
// serveur (le courriel au praticien), qui est la lecture même de la table
// signée `SAF-QUEST-01`. Si elles divergeaient, le patient pourrait lire
// « votre praticien sera prévenu » sans qu'aucun courriel parte. Ce banc les
// confronte option par option, sur les quatre questions.

describe('réponse suicidaire positive — navigateur et serveur d’accord avec SAF-QUEST-01', () => {
  it('les quatre questions de la table sont couvertes', () => {
    expect(SAFETY_QUESTIONNAIRE_V1).toHaveLength(4);
    for (const question of SAFETY_QUESTIONNAIRE_V1) expect(question.options.length, question.idQuestion).toBeGreaterThan(1);
  });

  for (const question of SAFETY_QUESTIONNAIRE_V1) {
    describe(`${question.instrument} (${question.idQuestionnaire}.${question.idQuestion})`, () => {
      it('la première option (« non ») n’appelle rien ; toutes les autres appellent message et courriel', () => {
        question.options.forEach((option, index) => {
          const attendu = index !== 0;
          // Le navigateur reçoit des chaînes (`answers` du formulaire).
          expect(
            estReponseSuicidePositive(question.idQuestionnaire, question.idQuestion, String(option.v), question.options),
            `navigateur, option ${index}`,
          ).toBe(attendu);
          // Le serveur reçoit ce que le formulaire envoie : la même chaîne,
          // ou un nombre.
          expect(transmissionAppelleAlerteSecurite(question.idQuestionnaire, { [question.idQuestion]: String(option.v) }), `serveur, chaîne ${index}`).toBe(attendu);
          expect(transmissionAppelleAlerteSecurite(question.idQuestionnaire, { [question.idQuestion]: option.v }), `serveur, nombre ${index}`).toBe(attendu);
        });
      });

      it('une valeur hors options est positive des deux côtés (fail-closed)', () => {
        expect(estReponseSuicidePositive(question.idQuestionnaire, question.idQuestion, '99', question.options)).toBe(true);
        expect(transmissionAppelleAlerteSecurite(question.idQuestionnaire, { [question.idQuestion]: '99' })).toBe(true);
      });

      it('une réponse absente ou vide n’appelle rien des deux côtés', () => {
        for (const vide of [undefined, '', '   ']) {
          expect(estReponseSuicidePositive(question.idQuestionnaire, question.idQuestion, vide, question.options)).toBe(false);
          expect(transmissionAppelleAlerteSecurite(question.idQuestionnaire, vide === undefined ? {} : { [question.idQuestion]: vide })).toBe(false);
        }
      });

      it('le résumé lit la même question', () => {
        const options = (id: string) => (id === question.idQuestion ? question.options : undefined);
        expect(questionnairePorteReponseSuicidePositive(question.idQuestionnaire, { [question.idQuestion]: String(question.options[1].v) }, options)).toBe(true);
        expect(questionnairePorteReponseSuicidePositive(question.idQuestionnaire, { [question.idQuestion]: String(question.options[0].v) }, options)).toBe(false);
      });
    });
  }

  // Revue wn-reviewer : le navigateur affiche les options de la DÉFINITION
  // servie, et le formulaire transmet `parseFloat` de la chaîne choisie
  // (`GenericQuestionnaire`, `numericAnswers`). Ce banc rejoue ce trajet exact.
  it('options de la définition servie, valeur transmise par parseFloat : même conclusion des deux côtés', () => {
    for (const question of SAFETY_QUESTIONNAIRE_V1) {
      const def = (QUESTIONNAIRE_CATALOGUE as Record<string, { sections?: { questions?: { id: string; options?: { v: unknown }[] }[] }[] }>)[question.idQuestionnaire];
      const servie = (def.sections ?? []).flatMap(s => s.questions ?? []).find(q => q.id === question.idQuestion);
      expect(servie?.options?.length, question.idQuestion).toBeGreaterThan(1);
      for (const option of servie!.options!) {
        const choisie = String(option.v);
        expect(
          estReponseSuicidePositive(question.idQuestionnaire, question.idQuestion, choisie, servie!.options),
          `${question.instrument} ${choisie}`,
        ).toBe(transmissionAppelleAlerteSecurite(question.idQuestionnaire, { [question.idQuestion]: parseFloat(choisie) }));
      }
    }
  });

  it('une autre question du même questionnaire, ou un autre questionnaire, n’appelle rien', () => {
    const bdi = SAFETY_QUESTIONNAIRE_V1[0];
    expect(estReponseSuicidePositive(bdi.idQuestionnaire, 'B1', '3', bdi.options)).toBe(false);
    expect(estReponseSuicidePositive('Q_STR_04', bdi.idQuestion, '3', bdi.options)).toBe(false);
    expect(transmissionAppelleAlerteSecurite('Q_STR_04', { [bdi.idQuestion]: 3 })).toBe(false);
  });
});

describe('la case de l’anamnèse', () => {
  it('est bien une option du champ lu, dans la section de l’encart', () => {
    const section = ANAMNESE_SECTIONS.find(s => s.id === SECTION_ANAMNESE_SIGNAUX);
    const champ = (section?.champs ?? []).find(c => c.id === CHAMP_ANAMNESE_SIGNAUX);
    expect(champ && 'options' in champ ? champ.options : []).toContain(CASE_ANAMNESE_IDEES_SUICIDAIRES);
  });

  it('est le libellé du signal d’alerte signé de rang « adressage »', () => {
    const signal = SAFETY_SIGNALS_V1.find(s => s.libelle === CASE_ANAMNESE_IDEES_SUICIDAIRES);
    expect(signal?.rang).toBe('adressage');
  });

  it('n’est lue que cochée', () => {
    expect(anamneseSignaleIdeesSuicidaires([CASE_ANAMNESE_IDEES_SUICIDAIRES])).toBe(true);
    expect(anamneseSignaleIdeesSuicidaires(['Fièvre prolongée / sueurs nocturnes'])).toBe(false);
    expect(anamneseSignaleIdeesSuicidaires(undefined)).toBe(false);
    expect(anamneseSignaleIdeesSuicidaires(CASE_ANAMNESE_IDEES_SUICIDAIRES)).toBe(false);
  });
});

describe('le texte signé du message au patient ([[D-277]] §1)', () => {
  it('est tenu mot pour mot', () => {
    expect(MESSAGE_REPONSE_SUICIDE).toEqual({
      titre: 'Vous venez d’indiquer des idées de mort ou de suicide.',
      ecoute: 'Vous pouvez en parler dès maintenant, gratuitement, 24 h sur 24 : appelez le 3114.',
      danger: 'Si vous pensez passer à l’acte ou si vous êtes en danger, appelez le 15 ou le 112.',
      praticien: 'Votre praticien sera prévenu de cette réponse quand vous transmettrez vos réponses, mais il ne pourra pas vous répondre immédiatement.',
    });
  });
});
