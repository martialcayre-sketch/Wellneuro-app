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
};

export type Section = { id: string; titre?: string; description?: string; questions: Question[] };

export type QuestionnaireDef = {
  id: string;
  titre: string;
  instructions?: string;
  sections: Section[];
};

/** Bloc de scoring d'une entrée du catalogue. 33 variantes hétérogènes
 * (sum, subscore, psqi, karasek, had, eortc, group_majority…) : le type reste
 * volontairement permissif — les juges du contenu sont la certification des
 * 63 questionnaires et les tests de scoring, pas le compilateur. */
export type ScoringDef = { type: string; [k: string]: unknown };
