// Brouillons de questionnaires, stockés localement sur l'appareil du patient.
// L'enveloppe UX ne quitte jamais localStorage et reste séparée du payload de
// soumission, qui ne contient que les réponses.

export type DraftAnswers = Record<string, string>;

export type QuestionnaireDraftState = {
  version: 1;
  answers: DraftAnswers;
  currentPage: number;
};

const DRAFT_VERSION = 1 as const;

function versionedDraftKey(idAssignation: string): string {
  return `wellneuro:questionnaire-draft:v1:${idAssignation}`;
}

function versionedMetaKey(idAssignation: string): string {
  return `wellneuro:questionnaire-draft-meta:v1:${idAssignation}`;
}

function legacyDraftKey(idAssignation: string): string {
  return `wellneuro:draft:${idAssignation}`;
}

function legacyMetaKey(idAssignation: string): string {
  return `wellneuro:draft-meta:${idAssignation}`;
}

function parseAnswers(value: unknown): DraftAnswers | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const entries = Object.entries(value);
  if (!entries.every(([key, answer]) => key.length > 0 && typeof answer === 'string')) return null;
  return Object.fromEntries(entries) as DraftAnswers;
}

function parseVersionedDraft(raw: string): QuestionnaireDraftState | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const answers = parseAnswers(parsed?.answers);
    if (
      parsed?.version !== DRAFT_VERSION
      || !answers
      || !Number.isInteger(parsed.currentPage)
      || (parsed.currentPage as number) < 0
    ) return null;
    return { version: DRAFT_VERSION, answers, currentPage: parsed.currentPage as number };
  } catch {
    return null;
  }
}

function parseLegacyDraft(raw: string): DraftAnswers | null {
  try {
    return parseAnswers(JSON.parse(raw));
  } catch {
    return null;
  }
}

// Durée de vie d'un brouillon local (SP-CONV LOT-05) — alignée sur les
// 30 jours du wizard fiche/anamnèse. Un brouillon sans date d'enregistrement
// n'est jamais détruit sur supposition : seule une date prouvée trop
// ancienne déclenche la purge.
const DUREE_VIE_BROUILLON_JOURS = 30;

function brouillonPerime(idAssignation: string): boolean {
  try {
    const raw =
      window.localStorage.getItem(versionedMetaKey(idAssignation)) ??
      window.localStorage.getItem(legacyMetaKey(idAssignation));
    if (!raw) return false;
    const savedAt = new Date(raw);
    if (Number.isNaN(savedAt.getTime())) return false;
    return Date.now() - savedAt.getTime() > DUREE_VIE_BROUILLON_JOURS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

/** Lit l'état UX complet, avec fallback sur le format historique. */
export function readQuestionnaireDraft(idAssignation: string): QuestionnaireDraftState | null {
  if (typeof window === 'undefined') return null;
  try {
    if (brouillonPerime(idAssignation)) {
      clearDraft(idAssignation);
      return null;
    }
    const versioned = window.localStorage.getItem(versionedDraftKey(idAssignation));
    if (versioned) {
      const parsed = parseVersionedDraft(versioned);
      if (parsed) return parsed;
    }
    const legacy = window.localStorage.getItem(legacyDraftKey(idAssignation));
    if (!legacy) return null;
    const answers = parseLegacyDraft(legacy);
    return answers ? { version: DRAFT_VERSION, answers, currentPage: 0 } : null;
  } catch {
    return null;
  }
}

/** Écrit le nouveau format puis supprime les anciennes clés après succès. */
export function writeQuestionnaireDraft(idAssignation: string, state: QuestionnaireDraftState): void {
  if (typeof window === 'undefined') return;
  const answers = parseAnswers(state.answers);
  if (!answers || !Number.isInteger(state.currentPage) || state.currentPage < 0) return;
  try {
    window.localStorage.setItem(versionedDraftKey(idAssignation), JSON.stringify({
      version: DRAFT_VERSION,
      answers,
      currentPage: state.currentPage,
    }));
    window.localStorage.setItem(versionedMetaKey(idAssignation), new Date().toISOString());
    window.localStorage.removeItem(legacyDraftKey(idAssignation));
    window.localStorage.removeItem(legacyMetaKey(idAssignation));
  } catch {
    // Quota / mode privé : ne pas interrompre la saisie.
  }
}

/** Wrapper historique : expose uniquement les réponses. */
export function readDraft(idAssignation: string): DraftAnswers | null {
  return readQuestionnaireDraft(idAssignation)?.answers ?? null;
}

/** Wrapper historique utilisé notamment par PlaintesForm. */
export function writeDraft(idAssignation: string, answers: DraftAnswers): void {
  const currentPage = readQuestionnaireDraft(idAssignation)?.currentPage ?? 0;
  writeQuestionnaireDraft(idAssignation, { version: DRAFT_VERSION, answers, currentPage });
}

/** Supprime les formats nouveau et historique. */
export function clearDraft(idAssignation: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(versionedDraftKey(idAssignation));
    window.localStorage.removeItem(versionedMetaKey(idAssignation));
    window.localStorage.removeItem(legacyDraftKey(idAssignation));
    window.localStorage.removeItem(legacyMetaKey(idAssignation));
  } catch {
    // no-op
  }
}

export function readDraftSavedAt(idAssignation: string): Date | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(versionedMetaKey(idAssignation))
      ?? window.localStorage.getItem(legacyMetaKey(idAssignation));
    if (!raw) return null;
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

export function hasDraft(idAssignation: string): boolean {
  const draft = readQuestionnaireDraft(idAssignation);
  return draft != null && Object.keys(draft.answers).length > 0;
}

/** Empêche une reprise de sauter une page requise incomplète. */
export function resolveResumePage(
  savedPage: number,
  answers: Readonly<DraftAnswers>,
  requiredQuestionIdsByPage: readonly (readonly string[])[],
): number {
  if (requiredQuestionIdsByPage.length === 0) return 0;
  const firstIncomplete = requiredQuestionIdsByPage.findIndex(ids =>
    ids.some(id => answers[id] === undefined || answers[id] === ''),
  );
  const fallback = firstIncomplete === -1 ? requiredQuestionIdsByPage.length - 1 : firstIncomplete;
  if (!Number.isInteger(savedPage) || savedPage < 0 || savedPage >= requiredQuestionIdsByPage.length) return fallback;
  return firstIncomplete !== -1 && savedPage > firstIncomplete ? firstIncomplete : savedPage;
}
