// TEXTES SERVIS PAR `SAF-QUEST-02` — [[D-515]] §3, lot de code de §6.2 (H59).
//
// HORS DE LA STRUCTURE SIGNÉE, ET C'EST LA RÈGLE ([[D-251]]) : une structure
// signée neuve ne porte que des codes, et `aucunePhraseStructureSignee.guard.test.ts`
// le vérifie. Ces textes restent pourtant DANS le périmètre signé :
// `safetyQuestionnaireCabinetV1.ts` les importe et les fait entrer dans son SHA.
// En retoucher un referme le verrou, comme s'il vivait dans la table.
//
// RÉDIGÉS PAR L'ASSISTANT, NON SIGNÉS. Le responsable les relit sur la surface
// de relecture de `SAF-QUEST-02` (PR 4 du lot), et la signature les couvre
// ([[D-515]] §3). Ni la conduite ni les deux textes repris de `SAF-QUEST-01`
// ne sont réécrits : ils sont importés, signés le 2026-10-10.

/**
 * La mention qui désigne la question et la réponse comme écrites par le
 * praticien ([[D-515]] §3 et §5) — dans le dossier (limitation du constat) et
 * dans la lettre. La signature couvre CE texte, pas les libellés cités.
 */
export const MENTION_QUESTIONNAIRE_CABINET =
  'L’instrument, l’énoncé de la question et le libellé de la réponse sont ceux d’un'
  + ' questionnaire écrit par le praticien du cabinet, cités tels qu’ils ont été envoyés'
  + ' au patient : ils n’ont pas fait l’objet d’une relecture clinique.';

/**
 * A2 sur la question désignée : aucune réponse lisible — limitation, sans
 * blocage. `{n}` et `{instrument}` sont les seules substitutions.
 */
export const LIMITATION_QUESTIONNAIRE_CABINET_ILLISIBLE =
  '{n} passation(s) de {instrument} ne portent aucune réponse lisible à la question que le'
  + ' praticien a désignée comme portant sur le suicide : rien n’est conclu, et la question'
  + ' reste à poser au patient.';

/**
 * [[D-515]] §7 : un instrument déclaré « oui » dont l'assignation ne porte pas
 * la désignation — limitation, sans constat ni blocage. `{n}` et `{instrument}`
 * sont les seules substitutions.
 */
export const LIMITATION_QUESTIONNAIRE_CABINET_DESIGNATION_INCONNUE =
  '{n} passation(s) de {instrument} n’ont pas pu être lues : l’instrument est déclaré poser'
  + ' une question sur le suicide, mais la question désignée n’a pas pu être relue dans la copie prise à l’envoi.'
  + ' Rien n’est conclu, ni « non » ni constat, et la question reste à poser au patient.';
