// Export PDF du dossier patient (D-252) — les réponses d'une passation, lues
// contre sa définition.
//
// Traducteur dédié plutôt que `construireReponsesLisibles` ou
// `reponsesLisibles` : le premier suit l'ordre des clés JSONB et retient la
// première option de même valeur, le second ne rend que les questions
// répondues. Ici, on parcourt la DÉFINITION — chaque question apparaît, une
// absence se dit absente (DC-24) — et une valeur que plusieurs options portent
// reste ambiguë : en choisir une inventerait ce que le patient a coché.
//
// Un code n'est jamais rendu nu comme une réponse : c'est un poids de points,
// parfois inversé.

import type { Question, QuestionnaireDef } from '@/lib/questionnaire-types';
import { SANS_REPONSE, citer } from './modele';

export type LigneReponse = { section: string | null; question: string; reponse: string };

export type LectureReponses = {
  lignes: LigneReponse[];
  nonTraduites: Array<{ cle: string; valeur: string }>;
  avertissement: string | null;
};

export const AVERTISSEMENT_SANS_RECOUVREMENT =
  'Les réponses enregistrées ne correspondent pas à la version actuelle de ce questionnaire : ' +
  'codes bruts, non traduits — ce ne sont ni des scores ni des réponses lisibles.';

export const AVERTISSEMENT_DEFINITION_RETIREE =
  'Définition retirée : cette passation ne se lit pas sous la version actuelle du questionnaire. ' +
  'Codes bruts, non traduits.';

export const AVERTISSEMENT_DEFINITION_INTROUVABLE =
  'Définition du questionnaire introuvable : codes bruts, non traduits.';

export const AVERTISSEMENT_REPONSES_ABSENTES =
  'Réponses brutes non disponibles pour cette passation.';

function estAbsente(valeur: unknown): boolean {
  return valeur === undefined || valeur === null || valeur === '';
}

function enChaine(valeur: unknown): string {
  if (typeof valeur === 'string') return valeur;
  if (typeof valeur === 'number' || typeof valeur === 'boolean') return String(valeur);
  try {
    return JSON.stringify(valeur) ?? String(valeur);
  } catch {
    return String(valeur);
  }
}

function aLaCle(objet: Record<string, unknown>, cle: string): boolean {
  return Object.prototype.hasOwnProperty.call(objet, cle);
}

function reponseLue(question: Question, valeur: unknown): string {
  if (estAbsente(valeur)) {
    return question.conditionnel ? `${SANS_REPONSE} (question conditionnelle)` : SANS_REPONSE;
  }
  const options = question.options ?? [];
  if (options.length > 0) {
    const correspondantes = options.filter(o => String(o.v) === String(valeur));
    if (correspondantes.length === 1) return correspondantes[0].l;
    if (correspondantes.length > 1) {
      return `${correspondantes.map(o => o.l).join(' ou ')} (indiscernables : même valeur enregistrée)`;
    }
    return `valeur enregistrée ${citer(enChaine(valeur))}, hors des options actuelles`;
  }
  if (question.type === 'number') {
    return question.unit ? `${enChaine(valeur)} ${question.unit}` : enChaine(valeur);
  }
  return enChaine(valeur);
}

function nonTraduites(
  rawAnswers: Record<string, unknown>,
  cles: string[],
): LectureReponses['nonTraduites'] {
  return [...cles]
    .sort()
    .map(cle => ({
      cle,
      valeur: estAbsente(rawAnswers[cle]) ? SANS_REPONSE : enChaine(rawAnswers[cle]),
    }));
}

export function lireReponses(
  definition: QuestionnaireDef | null,
  rawAnswers: Record<string, unknown> | null,
  contexte: { definitionRetiree: boolean },
): LectureReponses {
  // Sans réponse enregistrée, rien ne se lit : lister chaque question « Sans
  // réponse » affirmerait que le patient n'a pas répondu.
  const cles = rawAnswers ? Object.keys(rawAnswers) : [];
  if (!rawAnswers || cles.length === 0) {
    return { lignes: [], nonTraduites: [], avertissement: AVERTISSEMENT_REPONSES_ABSENTES };
  }

  if (!definition) {
    return {
      lignes: [],
      nonTraduites: nonTraduites(rawAnswers, cles),
      avertissement: contexte.definitionRetiree
        ? AVERTISSEMENT_DEFINITION_RETIREE
        : AVERTISSEMENT_DEFINITION_INTROUVABLE,
    };
  }

  const idsDefinition = new Set<string>();
  for (const section of definition.sections ?? []) {
    for (const question of section.questions ?? []) idsDefinition.add(question.id);
  }

  if (!cles.some(cle => idsDefinition.has(cle))) {
    return {
      lignes: [],
      nonTraduites: nonTraduites(rawAnswers, cles),
      avertissement: AVERTISSEMENT_SANS_RECOUVREMENT,
    };
  }

  const lignes: LigneReponse[] = [];
  for (const section of definition.sections ?? []) {
    for (const question of section.questions ?? []) {
      const valeur = aLaCle(rawAnswers, question.id) ? rawAnswers[question.id] : undefined;
      lignes.push({
        section: section.titre ?? null,
        question: question.texte,
        reponse: reponseLue(question, valeur),
      });
    }
  }

  return {
    lignes,
    nonTraduites: nonTraduites(rawAnswers, cles.filter(cle => !idsDefinition.has(cle))),
    avertissement: null,
  };
}
