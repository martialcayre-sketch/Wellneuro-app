import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ANAMNESE_SECTIONS } from '@/lib/consultation/anamnese';
import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';
import { SAFETY_SIGNALS_V1 } from '@/lib/clinical/safetySignalsV1';
import { SAFETY_QUESTIONNAIRE_V1 } from '@/lib/clinical/safetyQuestionnaireV1';
import {
  SAFETY_QUESTIONNAIRE_CABINET_METADATA,
  SAFETY_QUESTIONNAIRE_CABINET_SHA256,
} from '@/lib/clinical/safetyQuestionnaireCabinetV1';
import { designationSuicideCabinetServie, type DesignationCabinetLue } from '@/lib/clinical-engine/safetyFindings';
import {
  CASE_ANAMNESE_IDEES_SUICIDAIRES,
  CHAMP_ANAMNESE_SIGNAUX,
  MESSAGE_REPONSE_SUICIDE,
  SECTION_ANAMNESE_SIGNAUX,
  anamneseSignaleIdeesSuicidaires,
  estReponseSuicideCabinetPositive,
  estReponseSuicidePositive,
  questionnaireCabinetPorteReponseSuicidePositive,
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

// ─── [[D-515]] — LES INSTRUMENTS DU CABINET (lot de code §6.2, PR 3) ─────────
//
// La question n'est pas au catalogue : le praticien l'a désignée, l'envoi en a
// COPIÉ l'identifiant, la valeur « non » et les options sur l'assignation. Le
// serveur décide deux choses à partir de cette seule copie :
//   — ce qu'il SERT au navigateur (`designationSuicideCabinetServie`), qui
//     ouvre ou non le message de [[D-277]] §1 ;
//   — si la transmission APPELLE le courriel (`transmissionAppelleAlerteSecurite`).
// Le patient ne doit jamais lire « votre praticien sera prévenu » sans que le
// courriel soit appelé, ni l'inverse. Le banc rejoue le trajet exact : la
// chaîne choisie dans le formulaire, le `parseFloat` qu'il transmet
// (`GenericQuestionnaire`, `numericAnswers`), et la désignation telle que la
// base la rend — sur chaque combinaison de drapeau, de signature et de copie.
describe('[[D-515]] — instrument du cabinet : navigateur et serveur d’accord avec SAF-QUEST-02', () => {
  const ID_QUESTIONNAIRE = 'CAB_BANC_SUICIDE';
  const OPTIONS = [{ v: 0, l: 'Jamais' }, { v: 1, l: 'Parfois' }, { v: 3, l: 'Souvent' }];
  // La valeur « non » est celle de la COPIE, pas le rang : une échelle
  // inversée met le « non » en dernier.
  const DESIGNATIONS: Record<string, DesignationCabinetLue> = {
    'non en premier': {
      poseQuestionSuicide: true,
      titreAssignation: 'Humeur du cabinet',
      questionSuicideId: 'Q2',
      questionSuicideOptionNon: 0,
      questionSuicideCopie: { instrument: 'Humeur du cabinet', enonce: 'Idées noires', options: OPTIONS },
    },
    'non en dernier': {
      poseQuestionSuicide: true,
      titreAssignation: 'Humeur du cabinet',
      questionSuicideId: 'Q2',
      questionSuicideOptionNon: 3,
      questionSuicideCopie: { instrument: 'Humeur du cabinet', enonce: 'Idées noires', options: OPTIONS },
    },
  };
  const NON_LUES: Record<string, DesignationCabinetLue> = {
    'copie « non »': { ...DESIGNATIONS['non en premier'], poseQuestionSuicide: false },
    'non déclarée': { ...DESIGNATIONS['non en premier'], poseQuestionSuicide: null },
    'désignation inconnue (§7)': { ...DESIGNATIONS['non en premier'], questionSuicideId: null, questionSuicideOptionNon: null, questionSuicideCopie: null },
    'valeur « non » hors des options copiées': { ...DESIGNATIONS['non en premier'], questionSuicideOptionNon: 2 },
  };
  // Ce que le formulaire choisit, puis transmet : chaque option, une valeur
  // hors options, des décimales, et ce qu'il ne transmet pas.
  const CHOIX = ['0', '1', '3', '2', '99', '1.5', '3.0', '-1', '', '   ', 'abc', 'Infinity'];
  const ETAT_LIVRE = { ...SAFETY_QUESTIONNAIRE_CABINET_METADATA };

  function signer(): void {
    SAFETY_QUESTIONNAIRE_CABINET_METADATA.validationExterne = true;
    SAFETY_QUESTIONNAIRE_CABINET_METADATA.dateValidation = '2026-11-14T00:00:00.000Z';
    SAFETY_QUESTIONNAIRE_CABINET_METADATA.sourceReference = 'Signature simulée par le banc — jamais servie en production.';
    SAFETY_QUESTIONNAIRE_CABINET_METADATA.shaPerimetre = SAFETY_QUESTIONNAIRE_CABINET_SHA256;
  }

  /** `GenericQuestionnaire`, `numericAnswers` : `parseFloat`, et rien de ce qui n'est pas un nombre. */
  function transmises(answers: Record<string, string>): Record<string, number> {
    const sortie: Record<string, number> = {};
    for (const [k, v] of Object.entries(answers)) {
      const n = parseFloat(v);
      if (!isNaN(n)) sortie[k] = n;
    }
    // Le corps part en JSON : `Infinity` y devient `null`.
    return JSON.parse(JSON.stringify(sortie)) as Record<string, number>;
  }

  function navigateur(designation: DesignationCabinetLue, answers: Record<string, string>): { sousLaQuestion: boolean; auResume: boolean } {
    const servie = designationSuicideCabinetServie(ID_QUESTIONNAIRE, designation) ?? undefined;
    return {
      sousLaQuestion: Object.keys(answers).some(id => estReponseSuicideCabinetPositive(servie, id, answers[id])),
      auResume: questionnaireCabinetPorteReponseSuicidePositive(servie, answers),
    };
  }

  function serveur(designation: DesignationCabinetLue, answers: Record<string, string>): boolean {
    return transmissionAppelleAlerteSecurite(ID_QUESTIONNAIRE, transmises(answers), designation);
  }

  beforeEach(() => {
    process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB = 'true';
  });
  afterEach(() => {
    Object.assign(SAFETY_QUESTIONNAIRE_CABINET_METADATA, ETAT_LIVRE);
    delete process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB;
  });

  for (const [nom, designation] of Object.entries(DESIGNATIONS)) {
    it(`table signée, ${nom} : toute valeur transmise autre que la valeur « non » copiée appelle message ET courriel`, () => {
      signer();
      expect(designationSuicideCabinetServie(ID_QUESTIONNAIRE, designation)).toEqual({
        idQuestion: 'Q2', valeurNon: designation.questionSuicideOptionNon,
      });
      for (const choix of CHOIX) {
        const n = parseFloat(choix);
        const attendu = Number.isFinite(n) && n !== designation.questionSuicideOptionNon;
        const answers = { Q1: '3', Q2: choix };
        expect(navigateur(designation, answers), `navigateur ${JSON.stringify(choix)}`).toEqual({ sousLaQuestion: attendu, auResume: attendu });
        expect(serveur(designation, answers), `serveur ${JSON.stringify(choix)}`).toBe(attendu);
      }
    });
  }

  it('table signée : une autre question de l’instrument, même « positive », n’appelle rien', () => {
    signer();
    const designation = DESIGNATIONS['non en premier'];
    const answers = { Q1: '3', Q3: '3' };
    expect(navigateur(designation, answers)).toEqual({ sousLaQuestion: false, auResume: false });
    expect(serveur(designation, answers)).toBe(false);
  });

  it('table NON signée (état livré) : ni désignation servie, ni message, ni courriel', () => {
    for (const designation of Object.values(DESIGNATIONS)) {
      expect(designationSuicideCabinetServie(ID_QUESTIONNAIRE, designation)).toBeNull();
      for (const choix of CHOIX) {
        const answers = { Q2: choix };
        expect(navigateur(designation, answers)).toEqual({ sousLaQuestion: false, auResume: false });
        expect(serveur(designation, answers), JSON.stringify(choix)).toBe(false);
      }
    }
  });

  it('drapeau éteint, même signée : ni désignation servie, ni message', () => {
    signer();
    delete process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB;
    for (const designation of Object.values(DESIGNATIONS)) {
      expect(designationSuicideCabinetServie(ID_QUESTIONNAIRE, designation)).toBeNull();
      expect(navigateur(designation, { Q2: '1' })).toEqual({ sousLaQuestion: false, auResume: false });
    }
  });

  // Contre-revue Codex de la PR 3, P1 : le message est décidé à l'ouverture
  // de la page (GET), le courriel à la transmission (POST). Le drapeau peut
  // changer entre les deux. Dans tous les cas, un message lu doit être suivi
  // du courriel ; un courriel sans message (drapeau allumé entre-temps) est
  // le sens admis. Le courriel ne lit donc pas le drapeau courant : la copie
  // « oui » n'est écrite que drapeau allumé.
  for (const auGet of [true, false]) {
    for (const auPost of [true, false]) {
      it(`table signée, drapeau ${auGet ? 'allumé' : 'éteint'} à l’ouverture puis ${auPost ? 'allumé' : 'éteint'} à la transmission : un message lu est toujours suivi du courriel`, () => {
        signer();
        for (const designation of Object.values(DESIGNATIONS)) {
          for (const choix of CHOIX) {
            const answers = { Q2: choix };
            if (auGet) process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB = 'true';
            else delete process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB;
            const lu = navigateur(designation, answers);
            if (auPost) process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB = 'true';
            else delete process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB;
            const courriel = serveur(designation, answers);
            const n = parseFloat(choix);
            const attendu = Number.isFinite(n) && n !== designation.questionSuicideOptionNon;
            expect(courriel, `courriel ${JSON.stringify(choix)}`).toBe(attendu);
            if (lu.sousLaQuestion || lu.auResume) expect(courriel, `message lu sans courriel ${JSON.stringify(choix)}`).toBe(true);
          }
        }
      });
    }
  }

  for (const [nom, designation] of Object.entries(NON_LUES)) {
    for (const drapeau of [true, false]) {
      it(`table signée, drapeau ${drapeau ? 'allumé' : 'éteint'}, ${nom} : ni désignation servie, ni message, ni courriel`, () => {
        signer();
        if (!drapeau) delete process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB;
        expect(designationSuicideCabinetServie(ID_QUESTIONNAIRE, designation)).toBeNull();
        for (const choix of CHOIX) {
          expect(navigateur(designation, { Q2: choix })).toEqual({ sousLaQuestion: false, auResume: false });
          expect(serveur(designation, { Q2: choix }), JSON.stringify(choix)).toBe(false);
        }
      });
    }
  }

  it('table signée : un questionnaire du catalogue ne reçoit pas de désignation, et une copie passée n’y change rien', () => {
    signer();
    const designation = DESIGNATIONS['non en dernier'];
    expect(designationSuicideCabinetServie('Q_NEU_01', designation)).toBeNull();
    // BDI : la table signée SAF-QUEST-01 décide, B7 = 0 est son « non ».
    expect(transmissionAppelleAlerteSecurite('Q_NEU_01', { B7: 0, Q2: 0 }, designation)).toBe(false);
    expect(transmissionAppelleAlerteSecurite('Q_NEU_01', { B7: 1 }, designation)).toBe(true);
  });

  it('sans désignation passée, une transmission du cabinet n’appelle jamais le courriel', () => {
    signer();
    expect(transmissionAppelleAlerteSecurite(ID_QUESTIONNAIRE, { Q2: 3 })).toBe(false);
  });
});
