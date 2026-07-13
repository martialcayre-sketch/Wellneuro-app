// Brouillons de questionnaires, stockés localement (localStorage) sur l'appareil
// du patient. Aucune donnée envoyée au serveur tant que le questionnaire n'est
// pas transmis — donc aucune migration Prisma. Les réponses sont conservées
// telles quelles (Record<string, string>), comme dans les renderers.

export type DraftAnswers = Record<string, string>;

function draftKey(idAssignation: string): string {
  return `wellneuro:draft:${idAssignation}`;
}

// Clé séparée de draftKey() pour ne jamais mélanger l'horodatage de
// sauvegarde avec les réponses elles-mêmes (celles-ci sont sérialisées telles
// quelles vers /api/patient/submit — pas question d'y faire fuiter un champ
// technique interne).
function draftSavedAtKey(idAssignation: string): string {
  return `wellneuro:draft-meta:${idAssignation}`;
}

/** Lit le brouillon local d'une assignation, ou null s'il n'existe pas / est illisible. */
export function readDraft(idAssignation: string): DraftAnswers | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(draftKey(idAssignation));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as DraftAnswers;
    }
    return null;
  } catch {
    return null;
  }
}

/** Enregistre le brouillon local. Ignore silencieusement si localStorage indisponible. */
export function writeDraft(idAssignation: string, answers: DraftAnswers): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(draftKey(idAssignation), JSON.stringify(answers));
    window.localStorage.setItem(draftSavedAtKey(idAssignation), new Date().toISOString());
  } catch {
    /* quota / mode privé : on n'interrompt pas la saisie */
  }
}

/** Supprime le brouillon local (après transmission ou réinitialisation). */
export function clearDraft(idAssignation: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(draftKey(idAssignation));
    window.localStorage.removeItem(draftSavedAtKey(idAssignation));
  } catch {
    /* no-op */
  }
}

/** Date de la dernière écriture de brouillon réussie, ou null si inconnue/absente. */
export function readDraftSavedAt(idAssignation: string): Date | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(draftSavedAtKey(idAssignation));
    if (!raw) return null;
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/** Indique si un brouillon local non vide existe pour cette assignation. */
export function hasDraft(idAssignation: string): boolean {
  const d = readDraft(idAssignation);
  return d != null && Object.keys(d).length > 0;
}
