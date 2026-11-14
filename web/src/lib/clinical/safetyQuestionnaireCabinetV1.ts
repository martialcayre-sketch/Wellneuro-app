import type { ValidatedClinicalRuleRef } from '@/lib/clinical-engine/types';
import { sha256 } from './corpusSyntheseV1';
import {
  CONDUITE_SECURITE_QUESTIONNAIRE,
  LIMITATION_QUESTIONNAIRE_HORS_OPTIONS,
  LIMITATION_QUESTIONNAIRE_PROVENANCE,
} from './safetyQuestionnaireTextes';
import {
  LIMITATION_QUESTIONNAIRE_CABINET_DESIGNATION_INCONNUE,
  LIMITATION_QUESTIONNAIRE_CABINET_ILLISIBLE,
  MENTION_QUESTIONNAIRE_CABINET,
} from './safetyQuestionnaireCabinetTextes';

// Table de la QUESTION SUR LE SUICIDE des instruments du cabinet (`CAB_`) —
// [[D-515]] §2, lot de code de §6.2 (H59).
//
// UNE TABLE À PART, À CÔTÉ DE `SAF-QUEST-01` ET NON À SA PLACE. Celle-ci reste
// identique à l'octet, sa signature du 2026-10-10 aussi.
//
// CE QUE LA TABLE DIT, ET RIEN D'AUTRE : « à la question que le praticien a
// désignée, toute réponse autre que la valeur « non » qu'il a désignée appelle
// un adressage médical, comme la case « Idées noires ou suicidaires » de
// l'anamnèse ». C'est [[D-275]] §2 sans rien y ajouter : aucune gradation,
// aucun seuil, aucun score (`DC-19`, `DC-23`).
//
// ELLE NE PORTE AUCUNE QUESTION. Les questions sont celles des praticiens, une
// par instrument, et la règle les lit dans la COPIE prise sur l'assignation à
// l'envoi ([[D-515]] §4) — jamais dans l'instrument, qui reste modifiable.
// Leurs libellés ne sont ni relus ni signés ([[D-515]] §3) : le SHA ne couvre
// que le mécanisme et les textes fixes. Les textes vivent à part
// ([[D-251]]) : `safetyQuestionnaireCabinetTextes.ts`.

/**
 * Le mécanisme, en CODES ([[D-251]]). Chaque code nomme une clause de
 * [[D-515]] §2 et §7 ; en changer un change le SHA, donc referme le verrou.
 */
const MECANISME_SAF_QUEST_02 = {
  /** La source lue : la copie de l'assignation, jamais l'instrument (§4). */
  source: 'assignation.question_suicide_copie',
  /** Seule la question désignée est lue, comparée à la valeur « non » copiée (§1). */
  lecture: 'question-designee-contre-valeur-non',
  /** Toute autre valeur, hors options comprises, produit un constat (§2). */
  constat: 'toute-valeur-autre-que-non',
  /** A1 : toute passation non invalidée compte ; seul `INVALID` retire. */
  passations: 'a1-toutes-sauf-invalid',
  /** A2 : sans réponse lisible, une limitation, sans blocage. */
  illisible: 'a2-limitation',
  /** §7 : déclarée « oui » sans désignation copiée, une limitation, sans constat. */
  designationAbsente: 'd515-7-limitation',
} as const;

export type SafetyQuestionnaireCabinetMetadata = {
  version: string;
  validationExterne: boolean;
  /** ISO canonique le jour de la signature — devient `validation.validatedAt`. */
  dateValidation: string | null;
  /** Ce que le praticien a relu et signé, en un CODE ([[D-251]]). */
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
// CE QUE LE SHA COUVRE : le mécanisme ci-dessus, la conduite recopiée, la
// mention « écrit par le praticien », les deux limitations propres (réponse
// illisible, désignation inconnue) et les deux limitations reprises de
// `SAF-QUEST-01` (provenance, hors options). Retoucher l'un d'eux referme le
// verrou.
//
// CE QUE LA SIGNATURE NE COUVRE PAS ([[D-515]] §3) : le nom de l'instrument,
// l'énoncé de la question et les libellés des options, écrits par le
// praticien. Ils sont cités tels quels, sous la mention.
//
// LE VERROU A LE SENS INVERSE DES AUTRES, comme `SAF-QUEST-01` : non signée,
// la table ne produit aucun constat, et la revue dit « Règle candidate
// inactive : SAF-QUEST-02. » sur les seuls dossiers qu'une réponse concerne.
// ─────────────────────────────────────────────────────────────────────────────

export const SAFETY_QUESTIONNAIRE_CABINET_METADATA: SafetyQuestionnaireCabinetMetadata = {
  version: 'safety-questionnaire-cabinet-nnpp2-v1',
  // NON SIGNÉE : la signature suit sur sa surface de relecture ([[D-195]],
  // [[D-515]] §3), dans la PR 4 du lot.
  validationExterne: false,
  dateValidation: null,
  // Un CODE, pas une phrase ([[D-251]]).
  sourceReference: 'D-515 §2',
  // SURTOUT PAS la constante calculée — la comparaison serait tautologique.
  shaPerimetre: null,
};

export const SAFETY_QUESTIONNAIRE_CABINET_SHA256 = sha256(
  JSON.stringify({
    mecanisme: MECANISME_SAF_QUEST_02,
    conduite: CONDUITE_SECURITE_QUESTIONNAIRE,
    mention: MENTION_QUESTIONNAIRE_CABINET,
    limitations: [
      LIMITATION_QUESTIONNAIRE_PROVENANCE,
      LIMITATION_QUESTIONNAIRE_HORS_OPTIONS,
      LIMITATION_QUESTIONNAIRE_CABINET_ILLISIBLE,
      LIMITATION_QUESTIONNAIRE_CABINET_DESIGNATION_INCONNUE,
    ],
  }),
);

/** Identifiant unique de la règle de sécurité des instruments du cabinet. */
export const REGLE_SECURITE_QUESTIONNAIRE_CABINET = 'SAF-QUEST-02';

/** Le verrou de signature, auto-portant — patron `tableSecuriteQuestionnaireSignee()`. */
export function tableSecuriteQuestionnaireCabinetSignee(): boolean {
  const dateValidation = SAFETY_QUESTIONNAIRE_CABINET_METADATA.dateValidation;
  return SAFETY_QUESTIONNAIRE_CABINET_METADATA.validationExterne
    && dateValidation !== null
    && !Number.isNaN(new Date(dateValidation).getTime())
    && new Date(dateValidation).toISOString() === dateValidation
    && SAFETY_QUESTIONNAIRE_CABINET_METADATA.sourceReference.trim().length > 0
    && SAFETY_QUESTIONNAIRE_CABINET_METADATA.shaPerimetre === SAFETY_QUESTIONNAIRE_CABINET_SHA256;
}

/** La règle en `ValidatedClinicalRuleRef`, ou `null` quand elle n'est pas signée. */
export function regleSecuriteQuestionnaireCabinetValidee(): ValidatedClinicalRuleRef | null {
  if (!tableSecuriteQuestionnaireCabinetSignee()) return null;
  return {
    ruleId: REGLE_SECURITE_QUESTIONNAIRE_CABINET,
    version: SAFETY_QUESTIONNAIRE_CABINET_METADATA.version,
    lifecycle: 'clinically_validated',
    validation: {
      validatedAt: SAFETY_QUESTIONNAIRE_CABINET_METADATA.dateValidation as string,
      validatorRole: 'practitioner',
      sourceReference: SAFETY_QUESTIONNAIRE_CABINET_METADATA.sourceReference,
    },
  };
}

export {
  LIMITATION_QUESTIONNAIRE_CABINET_DESIGNATION_INCONNUE,
  LIMITATION_QUESTIONNAIRE_CABINET_ILLISIBLE,
  MENTION_QUESTIONNAIRE_CABINET,
};
