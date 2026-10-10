import type { ValidatedClinicalRuleRef } from '@/lib/clinical-engine/types';
import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';
import { sha256 } from './corpusSyntheseV1';
import {
  CONDUITE_SECURITE_QUESTIONNAIRE,
  LIMITATION_QUESTIONNAIRE_HORS_OPTIONS,
  LIMITATION_QUESTIONNAIRE_ILLISIBLE,
  LIMITATION_QUESTIONNAIRE_PROVENANCE,
} from './safetyQuestionnaireTextes';

// Table des QUESTIONS SUR LE SUICIDE des questionnaires — [[D-275]] §2, LOT-3.
//
// CE QUE LA TABLE DIT, ET RIEN D'AUTRE : « à ces quatre questions, toute
// réponse autre que la première — celle qui dit explicitement non — appelle
// un adressage médical, comme la case « Idées noires ou suicidaires » de
// l'anamnèse ». Elle ne gradue pas les réponses positives entre elles : « je
// pense que la mort me libérerait » et « j'ai des plans précis » produisent le
// même constat. Le praticien lit la réponse citée ; la machine ne la cote pas.
//
// AUCUN SEUIL, AUCUN SCORE (`DC-19`, `DC-23`). Chaque ligne porte les options
// de SA question, verbatim, et la valeur de la première. La règle n'en lit
// pas d'autre : ni total, ni sous-score, ni rang numérique. Une valeur de
// MADRS (0/2/4/6) et une valeur de BDI (0/1/2/3) ne sont jamais comparées.
//
// LES OPTIONS SONT LUES DANS LE CATALOGUE ET ENTRENT DANS LE SHA. Elles sont
// citées dans la `rationale` du constat et dans la lettre d'adressage : le sha
// doit couvrir ce qui est cité. Un libellé retouché ou une option ajoutée
// referme le verrou, et la sortie est de RE-SIGNER. Ni elles ni aucun texte ne
// sont écrits dans ce fichier ([[D-251]]) : les textes servis vivent dans
// `safetyQuestionnaireTextes.ts`, et entrent eux aussi dans le SHA.
//
// LA LISTE DES QUESTIONS EST CELLE DE L'ENCART (`QUESTION_SUICIDE_PAR_QUESTIONNAIRE`,
// [[D-275]] §1), et le banc l'exige dans les deux sens : une question qui
// afficherait l'encart sans produire de constat, ou l'inverse, rougit.
// Limite héritée du §1 : les instruments du cabinet (`CAB_`), hors catalogue,
// ne sont pas couverts.

export type OptionQuestionSecurite = {
  /** Valeur stockée dans `rawAnswers`, propre à l'instrument. */
  readonly v: number;
  /** Libellé verbatim du catalogue. Jamais paraphrasé. */
  readonly l: string;
};

export type QuestionSecurite = {
  readonly idQuestionnaire: string;
  readonly idQuestion: string;
  /** Nom court de l'instrument, tel que la lettre et la `rationale` le citent. */
  readonly instrument: string;
  /** Les options, verbatim et dans l'ordre du catalogue. La première dit non. */
  readonly options: readonly OptionQuestionSecurite[];
};

/**
 * Les quatre questions, en CODES seulement ([[D-251]] : une structure signée
 * neuve ne porte aucune phrase). Les options viennent du catalogue, ci-dessous.
 */
const QUESTIONS_SECURITE_V1: readonly Omit<QuestionSecurite, 'options'>[] = [
  { idQuestionnaire: 'Q_NEU_01', idQuestion: 'B7', instrument: 'BDI' },
  { idQuestionnaire: 'Q_NEU_02', idQuestion: 'Q010', instrument: 'MADRS' },
  { idQuestionnaire: 'Q_NEU_03', idQuestion: 'SIGH_Q019', instrument: 'SIGH-SAD-SA' },
  { idQuestionnaire: 'Q_NEU_12', idQuestion: 'IA9', instrument: 'IDTAS-AE' },
];

type QuestionCatalogue = { id: string; options?: { v: unknown; l: unknown }[] };

/**
 * Les options de la question, LUES DANS LE CATALOGUE — verbatim et dans
 * l'ordre. Elles entrent dans le SHA : un libellé retouché ou une option
 * ajoutée au catalogue referme le verrou, et `safetyQuestionnaire.guard.test.ts`
 * rougit avant la production (« la table livrée est signée »). Une question
 * introuvable rend `[]` : toute valeur devient alors « hors options », donc un
 * constat — jamais un silence.
 */
function optionsDuCatalogue(idQuestionnaire: string, idQuestion: string): OptionQuestionSecurite[] {
  const definition = (QUESTIONNAIRE_CATALOGUE as Record<string, { sections?: { questions?: QuestionCatalogue[] }[] }>)[idQuestionnaire];
  const question = (definition?.sections ?? [])
    .flatMap(section => section.questions ?? [])
    .find(candidate => candidate.id === idQuestion);
  return (question?.options ?? [])
    .filter((option): option is { v: number; l: string } => typeof option.v === 'number' && typeof option.l === 'string')
    .map(option => ({ v: option.v, l: option.l }));
}

export const SAFETY_QUESTIONNAIRE_V1: readonly QuestionSecurite[] = QUESTIONS_SECURITE_V1.map(question => ({
  ...question,
  options: optionsDuCatalogue(question.idQuestionnaire, question.idQuestion),
}));

export {
  CONDUITE_SECURITE_QUESTIONNAIRE,
  LIMITATION_QUESTIONNAIRE_HORS_OPTIONS,
  LIMITATION_QUESTIONNAIRE_ILLISIBLE,
  LIMITATION_QUESTIONNAIRE_PROVENANCE,
};

export type SafetyQuestionnaireMetadata = {
  version: string;
  validationExterne: boolean;
  /** ISO canonique le jour de la signature — devient `validation.validatedAt`. */
  dateValidation: string | null;
  /** Ce que le praticien a relu et signé, en une phrase opposable. */
  sourceReference: string;
  /**
   * SHA du périmètre relu à la signature — patron [[D-063]]. LITTÉRAL FIGÉ,
   * jamais la constante calculée : la comparaison serait tautologique.
   */
  shaPerimetre: string | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// À LIRE AVANT DE SIGNER
//
// CE QUE LE SHA COUVRE : `SAFETY_QUESTIONNAIRE_V1` (questions, instruments,
// options verbatim), la conduite recopiée et les trois textes de limitation.
// Retoucher l'un d'eux referme le verrou.
//
// CE QUE LA SIGNATURE ASSUME ([[D-275]] §2, arbitrages du 2026-10-09) :
//
//   1. TOUTE RÉPONSE AUTRE QUE LA PREMIÈRE PRODUIT LE MÊME CONSTAT, sans
//      gradation. Le constat cite la réponse ; il ne la cote pas.
//   2. A1 — TOUTE PASSATION NON INVALIDÉE COMPTE, pas seulement la dernière ni
//      celle de l'épisode. Un « non » ultérieur ne lève rien ; une nouvelle
//      réponse positive appelle une nouvelle lettre. Invalider la passation la
//      retire : seconde sortie, assumée.
//   3. A2 — UNE QUESTION SANS RÉPONSE LISIBLE produit une limitation, sans
//      blocage. Une valeur présente hors des options produit un constat.
//   4. L'INHIBITION EST TOTALE : priorité et protocole suspendus jusqu'à la
//      lettre. Un dossier sans consultation porteuse n'a pas de levée tant
//      qu'elle n'existe pas (il n'a pas non plus de T0 à débloquer).
//   5. LE VERROU A LE SENS INVERSE DES AUTRES, comme SAF-ANAM-01 : non signée,
//      la table ne produit aucun constat, et la revue dit « Règle candidate
//      inactive : SAF-QUEST-01. ».
// ─────────────────────────────────────────────────────────────────────────────

export const SAFETY_QUESTIONNAIRE_METADATA: SafetyQuestionnaireMetadata = {
  version: 'safety-questionnaire-nnpp2-v1',
  // SIGNÉE le 2026-10-10 — déclaration de conformité du responsable rendue en
  // séance, après lecture de la surface produite avant la demande ([[D-195]]).
  validationExterne: true,
  dateValidation: '2026-10-10T00:00:00.000Z',
  // Un CODE, pas une phrase ([[D-251]]) : la décision et la surface relue.
  sourceReference: 'D-275 §2 SURFACE_RELECTURE_SAF_QUEST_01_2026-10-10',
  // SURTOUT PAS `shaPerimetre: SAFETY_QUESTIONNAIRE_SHA256` — la constante est
  // déclarée APRÈS cet objet, et la comparaison serait tautologique.
  shaPerimetre: 'eb3504852852183d3f41f2564de1c966c2650750c099c30f2d4a358e1ce21a3e',
};

export const SAFETY_QUESTIONNAIRE_SHA256 = sha256(
  JSON.stringify({
    questions: SAFETY_QUESTIONNAIRE_V1,
    conduite: CONDUITE_SECURITE_QUESTIONNAIRE,
    limitations: [
      LIMITATION_QUESTIONNAIRE_PROVENANCE,
      LIMITATION_QUESTIONNAIRE_HORS_OPTIONS,
      LIMITATION_QUESTIONNAIRE_ILLISIBLE,
    ],
  }),
);

/** Identifiant unique de la règle de sécurité des questionnaires. */
export const REGLE_SECURITE_QUESTIONNAIRE = 'SAF-QUEST-01';

/** Le verrou de signature, auto-portant — patron `tableSignauxSecuriteSignee()`. */
export function tableSecuriteQuestionnaireSignee(): boolean {
  const dateValidation = SAFETY_QUESTIONNAIRE_METADATA.dateValidation;
  return SAFETY_QUESTIONNAIRE_METADATA.validationExterne
    && dateValidation !== null
    && !Number.isNaN(new Date(dateValidation).getTime())
    && new Date(dateValidation).toISOString() === dateValidation
    && SAFETY_QUESTIONNAIRE_METADATA.sourceReference.trim().length > 0
    && SAFETY_QUESTIONNAIRE_METADATA.shaPerimetre === SAFETY_QUESTIONNAIRE_SHA256;
}

/**
 * La règle en `ValidatedClinicalRuleRef`, ou `null` quand elle n'est pas
 * signée. UNE SEULE RÈGLE POUR LES QUATRE QUESTIONS : l'arbitrage est un.
 */
export function regleSecuriteQuestionnaireValidee(): ValidatedClinicalRuleRef | null {
  if (!tableSecuriteQuestionnaireSignee()) return null;
  return {
    ruleId: REGLE_SECURITE_QUESTIONNAIRE,
    version: SAFETY_QUESTIONNAIRE_METADATA.version,
    lifecycle: 'clinically_validated',
    validation: {
      validatedAt: SAFETY_QUESTIONNAIRE_METADATA.dateValidation as string,
      validatorRole: 'practitioner',
      sourceReference: SAFETY_QUESTIONNAIRE_METADATA.sourceReference,
    },
  };
}

/** La question de sécurité de ce questionnaire, ou `undefined`. */
export function questionSecuriteDe(idQuestionnaire: string): QuestionSecurite | undefined {
  return SAFETY_QUESTIONNAIRE_V1.find(question => question.idQuestionnaire === idQuestionnaire);
}

/** Les questionnaires que la table lit — pour borner une requête. */
export const QUESTIONNAIRES_SECURITE: readonly string[] = SAFETY_QUESTIONNAIRE_V1.map(
  question => question.idQuestionnaire,
);
