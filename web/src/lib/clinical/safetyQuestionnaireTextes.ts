import { SAFETY_SIGNAL_CONDUITES } from './safetySignalsV1';

// TEXTES SERVIS PAR `SAF-QUEST-01` — [[D-275]] §2, LOT-3.
//
// HORS DE LA STRUCTURE SIGNÉE, ET C'EST LA RÈGLE ([[D-251]], BP-01 de
// [[D-266]]) : une structure signée neuve ne porte que des codes, et
// `aucunePhraseStructureSignee.guard.test.ts` le vérifie. Ces textes restent
// pourtant DANS le périmètre signé : `safetyQuestionnaireV1.ts` les importe et
// les fait entrer dans son SHA. En retoucher un referme le verrou, comme s'il
// vivait dans la table.

/**
 * La conduite servie dans chaque constat — RECOPIÉE du rang `adressage` de la
 * table d'anamnèse, signée le 2026-08-23. Aucun texte neuf : la réponse de
 * questionnaire appelle le même geste que la case cochée à l'anamnèse.
 */
export const CONDUITE_SECURITE_QUESTIONNAIRE = SAFETY_SIGNAL_CONDUITES.adressage;

/** Ce que le praticien lit sur chaque constat : son origine. */
export const LIMITATION_QUESTIONNAIRE_PROVENANCE =
  'Ce constat provient d’une réponse de questionnaire. Toute passation non invalidée compte,'
  + ' même hors de l’épisode confirmé : une réponse « non » ultérieure ne le lève pas,'
  + ' seule une lettre d’adressage qui le couvre, ou l’invalidation de la passation, le fait.';

/** A2 : une valeur présente que les options ne connaissent pas — constat quand même. */
export const LIMITATION_QUESTIONNAIRE_HORS_OPTIONS =
  'La valeur enregistrée ne correspond à aucune option de la question : faute de savoir'
  + ' ce qu’elle dit, elle est traitée comme une réponse autre que « non » plutôt qu’ignorée.';

/**
 * A2 : une question sans réponse lisible — limitation, sans blocage. `{n}` et
 * `{instrument}` sont les seules substitutions.
 */
export const LIMITATION_QUESTIONNAIRE_ILLISIBLE =
  '{n} passation(s) de {instrument} ne portent aucune réponse lisible à la question sur'
  + ' le suicide : rien n’est conclu, et la question reste à poser au patient.';
