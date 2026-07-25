import type { QuestionnaireDef, QuestionOption } from '@/lib/questionnaire-types';

export type ReponseQuestionnaireLisible = {
  idQuestion: string;
  libelleQuestion: string | null;
  libelleReponse: string | null;
  valeurBrute: string;
  section: string | null;
};

function valeurBruteLisible(valeur: unknown): string {
  if (valeur === null || valeur === undefined || valeur === '') return '—';
  if (typeof valeur === 'string' || typeof valeur === 'number' || typeof valeur === 'boolean') {
    return String(valeur);
  }
  try {
    return JSON.stringify(valeur);
  } catch {
    return 'Valeur non affichable';
  }
}

function optionCorrespondante(options: QuestionOption[] | undefined, valeur: unknown): QuestionOption | null {
  if (!options) return null;
  return options.find(option => {
    if (option.v === valeur) return true;
    if (typeof option.v === 'number' && typeof valeur === 'string' && valeur.trim() !== '') {
      return Number(valeur) === option.v;
    }
    return false;
  }) ?? null;
}

export function construireReponsesLisibles(
  definition: QuestionnaireDef | null,
  rawAnswers: Record<string, unknown> | null,
): ReponseQuestionnaireLisible[] {
  if (!rawAnswers) return [];

  const questions = new Map(
    (definition?.sections ?? []).flatMap(section =>
      section.questions.map(question => [
        question.id,
        { question, section: section.titre ?? null },
      ] as const),
    ),
  );

  return Object.entries(rawAnswers).map(([idQuestion, valeur]) => {
    const trouvee = questions.get(idQuestion);
    const option = optionCorrespondante(trouvee?.question.options, valeur);
    const valeurBrute = valeurBruteLisible(valeur);
    const libelleNombre =
      trouvee?.question.type === 'number' && trouvee.question.unit
        ? `${valeurBrute} ${trouvee.question.unit}`.trim()
        : null;

    return {
      idQuestion,
      libelleQuestion: trouvee?.question.texte ?? null,
      libelleReponse: option?.l ?? libelleNombre,
      valeurBrute,
      section: trouvee?.section ?? null,
    };
  });
}
