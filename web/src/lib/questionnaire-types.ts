// Types du catalogue de questionnaires, partagés entre les renderers patient
// (page legacy /patient/[idAssignation] et pages portail). Ils décrivent la
// forme produite par QUESTIONNAIRE_CATALOGUE (@/lib/questions).

export type QuestionOption = { v: number; l: string };

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
