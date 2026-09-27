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
//
// Tout texte que le patient a pu choisir — valeur non résolue par une option,
// clé hors définition — sort entre « » : le préambule annonce au lecteur que
// ces passages sont des données, jamais des consignes.

import type { Question, QuestionnaireDef } from '@/lib/questionnaire-types';
import {
  LECTURE_SANS_UNITE_SOMMEIL,
  OUI_NON,
  definitionLectureAgendaAli,
  definitionLectureAgendaSommeil,
  estPseudoItemAgenda,
} from './libellesAgendas';
import { SANS_REPONSE, citer, dateFr } from './modele';

export type LigneReponse = {
  section: string | null;
  /** Légende d'échelle ou cadre temporel de la section, tels que le patient les a lus. */
  descriptionSection: string | null;
  question: string;
  reponse: string;
};

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

export const AVERTISSEMENT_SANS_QUESTION =
  'La définition de ce questionnaire ne déclare aucune question : valeurs enregistrées restituées ' +
  'telles quelles, sans traduction.';

/** Métrique d'agenda absente ou nulle : le recueil ne l'a pas couverte — ce n'est pas une absence de réponse. */
export const NON_CALCULE = 'Non calculé : recueil insuffisant';

/**
 * La passation ne fige pas la définition d'un instrument du cabinet, et
 * l'éditeur renumérote ses items : modifié depuis, il ne dit plus quelle
 * question portait chaque code. Les réponses sortent alors en codes bruts.
 */
export function avertissementInstrumentCabinetModifie(modifieLe: Date): string {
  return (
    `Instrument du cabinet modifié le ${dateFr(modifieLe)} après cette passation : les réponses ne sont ` +
    'pas rapportées à ses questions actuelles : codes bruts ci-dessous.'
  );
}

function estAbsente(valeur: unknown): boolean {
  return valeur === undefined || valeur === null || valeur === '';
}

// Le formulaire patient enregistre ses saisies chiffrées en chaînes (« 64 ») :
// une telle chaîne est un nombre, pas un texte.
function estNombre(valeur: unknown): boolean {
  if (typeof valeur === 'number') return Number.isFinite(valeur);
  return typeof valeur === 'string' && valeur.trim() !== '' && Number.isFinite(Number(valeur));
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

/** Valeur brute : un nombre ou un booléen sort tel quel, tout autre contenu entre « ». */
function valeurBrute(valeur: unknown): string {
  return estNombre(valeur) || typeof valeur === 'boolean' ? enChaine(valeur) : citer(enChaine(valeur));
}

function absence(id: string, conditionnel: boolean): string {
  if (estPseudoItemAgenda(id)) return NON_CALCULE;
  return conditionnel ? `${SANS_REPONSE} (question conditionnelle)` : SANS_REPONSE;
}

// Une définition du cabinet vient d'un JSON en base : rien n'y garantit une chaîne.
function texteOuNull(valeur: unknown): string | null {
  return typeof valeur === 'string' && valeur.trim() ? valeur.trim() : null;
}

function aLaCle(objet: Record<string, unknown>, cle: string): boolean {
  return Object.prototype.hasOwnProperty.call(objet, cle);
}

function reponseLue(question: Question, valeur: unknown): string {
  if (estAbsente(valeur)) return absence(question.id, Boolean(question.conditionnel));
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
    if (!estNombre(valeur)) return `valeur enregistrée ${citer(enChaine(valeur))}, non numérique`;
    return question.unit ? `${enChaine(valeur)} ${question.unit}` : nombreSansUnite(question, valeur);
  }
  return valeurBrute(valeur);
}

// Un pseudo-item d'agenda sans unité ne sort pas en chiffre nu : une moyenne
// sans son échelle ne se lit pas, un drapeau 1/0 se lirait comme un code.
// Toute autre saisie sans unité reste un nombre nu : sa borne peut n'être
// qu'un plafond de saisie, pas une échelle.
function nombreSansUnite(question: Question, valeur: unknown): string {
  const lecture = LECTURE_SANS_UNITE_SOMMEIL.get(question.id);
  if (lecture === 'oui-non') {
    return OUI_NON.get(String(Number(valeur))) ?? `valeur enregistrée ${citer(enChaine(valeur))}, ni oui ni non`;
  }
  const { min, max } = question;
  if (lecture === 'echelle' && typeof min === 'number' && typeof max === 'number') {
    return `${enChaine(valeur)} (échelle de ${min} à ${max})`;
  }
  return enChaine(valeur);
}

// Toute clé listée ici échappe à la définition : choisie par qui a écrit la
// réponse, elle se cite comme une donnée, même quand elle a la forme d'un code.
function nonTraduites(
  rawAnswers: Record<string, unknown>,
  cles: string[],
): LectureReponses['nonTraduites'] {
  return [...cles]
    .sort()
    .map(cle => ({
      cle: citer(cle),
      valeur: estAbsente(rawAnswers[cle]) ? absence(cle, false) : valeurBrute(rawAnswers[cle]),
    }));
}

export function lireReponses(
  definition: QuestionnaireDef | null,
  rawAnswers: Record<string, unknown> | null,
  contexte: {
    definitionRetiree: boolean;
    /**
     * Réserve qui SUSPEND la traduction (instrument du cabinet modifié après
     * la passation) : elle devient l'avertissement, au-dessus des codes bruts.
     */
    avertissementLecture?: string | null;
  },
): LectureReponses {
  // Sans réponse enregistrée, rien ne se lit : lister chaque question « Sans
  // réponse » affirmerait que le patient n'a pas répondu.
  const cles = rawAnswers ? Object.keys(rawAnswers) : [];
  if (!rawAnswers || cles.length === 0) {
    return { lignes: [], nonTraduites: [], avertissement: AVERTISSEMENT_REPONSES_ABSENTES };
  }

  // Une réponse traduite par une définition qui a changé depuis sortirait sous
  // une autre question : ne pas traduire du tout.
  if (contexte.avertissementLecture) {
    return {
      lignes: [],
      nonTraduites: nonTraduites(rawAnswers, cles),
      avertissement: contexte.avertissementLecture,
    };
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

  const lue = definitionLectureAgendaAli(definition) ?? definitionLectureAgendaSommeil(definition) ?? definition;
  const idsDefinition = new Set<string>();
  for (const section of lue.sections ?? []) {
    for (const question of section.questions ?? []) idsDefinition.add(question.id);
  }

  // Une définition sans aucune question n'est pas « une autre version » : dire
  // le contraire disqualifierait des valeurs exactes.
  if (idsDefinition.size === 0) {
    return {
      lignes: [],
      nonTraduites: nonTraduites(rawAnswers, cles),
      avertissement: AVERTISSEMENT_SANS_QUESTION,
    };
  }

  if (!cles.some(cle => idsDefinition.has(cle))) {
    return {
      lignes: [],
      nonTraduites: nonTraduites(rawAnswers, cles),
      avertissement: AVERTISSEMENT_SANS_RECOUVREMENT,
    };
  }

  const lignes: LigneReponse[] = [];
  for (const section of lue.sections ?? []) {
    for (const question of section.questions ?? []) {
      const valeur = aLaCle(rawAnswers, question.id) ? rawAnswers[question.id] : undefined;
      lignes.push({
        section: texteOuNull(section.titre),
        descriptionSection: texteOuNull(section.description),
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
