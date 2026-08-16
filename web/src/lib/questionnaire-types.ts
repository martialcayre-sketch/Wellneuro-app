// Types du catalogue de questionnaires, partagés entre les renderers patient
// (page legacy /patient/[idAssignation] et pages portail). Ils décrivent la
// forme produite par QUESTIONNAIRE_CATALOGUE (@/lib/questions).

// v : numérique pour les scorings ; chaîne pour les items qualitatifs purs
// ('oui'/'non' des dépistages digestifs, héritage GAS) — le catalogue porte les deux.
export type QuestionOption = { v: number | string; l: string };

export type Question = {
  id: string;
  texte: string;
  type: 'likert' | 'number' | 'select';
  options?: QuestionOption[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  conditionnel?: string;
  /** Groupe d'appartenance d'un item pour les scorings `group_majority`
   * (ex. Q_STR_01 : A=dopaminergique, B=sérotoninergique, C=mixte). */
  groupe?: string;
  /**
   * Item SERVI mais HORS BARÈME : la source le pose, aucun score ne le lit.
   *
   * `conditionnel` ne dit pas cela et ne peut pas en tenir lieu — il est lu dans
   * deux sens opposés dans le dépôt. Le formulaire patient en fait un item
   * FACULTATIF (`GenericQuestionnaire`), tandis que le prédicat de complétude du
   * moteur clinique (`clinicalSnapshot.hasExploitableRawAnswers`) le rend
   * OBLIGATOIRE dès que sa condition est remplie. Un item non coté marqué du seul
   * `conditionnel` sortait donc le questionnaire entier du bilan clinique quand
   * le patient ne le renseignait pas — et un item non coté SANS condition
   * (le cas de `Q10` du PSQI) en sortait aussi toutes les passations
   * historiques, qui ne peuvent pas le porter.
   *
   * Ce drapeau nomme l'intention une bonne fois : ce que le patient répond ici
   * atteint le praticien par les réponses lisibles et la synthèse, jamais par un
   * score, et son absence n'invalide jamais l'instrument.
   */
  horsBareme?: boolean;
};

export type Section = { id: string; titre?: string; description?: string; questions: Question[] };

export type QuestionnaireDef = {
  id: string;
  titre: string;
  instructions?: string;
  /**
   * `'clinicien'` : instrument à faire passer en consultation ([[D-066]]).
   * Le portail patient l'affiche en bandeau — sans lui, le patient lisait des
   * consignes adressées au praticien et remplissait seul un test dont
   * l'auto-passation détruit la mesure (revue, finding B5).
   */
  administrationMode?: string;
  sections: Section[];
};

/** Bloc de scoring d'une entrée du catalogue. 33 variantes hétérogènes
 * (sum, subscore, psqi, karasek, had, eortc, group_majority…) : le type reste
 * volontairement permissif — les juges du contenu sont la certification des
 * 63 questionnaires et les tests de scoring, pas le compilateur. */
export type ScoringDef = { type: string; [k: string]: unknown };
