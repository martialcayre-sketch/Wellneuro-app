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

/**
 * Les quatre familles de clés que ce module écrit — deux versionnées, deux
 * héritées. Balayées par PRÉFIXE et non par identifiant : au moment de fermer
 * une session, on ne connaît plus les assignations qui ont laissé un brouillon,
 * et les chercher supposerait une lecture réseau que la déconnexion ne doit pas
 * attendre.
 *
 * `wellneuro:comfort*` n'en fait volontairement PAS partie : le confort de
 * lecture est un réglage d'appareil, pas une donnée de santé. L'effacer
 * punirait la personne qui se déconnecte.
 */
const PREFIXES_BROUILLON = [
  'wellneuro:questionnaire-draft:v1:',
  'wellneuro:questionnaire-draft-meta:v1:',
  'wellneuro:draft:',
  'wellneuro:draft-meta:',
] as const;

/** Les clés de brouillon présentes sur CET appareil, tous patients confondus. */
function clesBrouillon(): string[] {
  const cles: string[] = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const cle = window.localStorage.key(i);
    if (cle && PREFIXES_BROUILLON.some((p) => cle.startsWith(p))) cles.push(cle);
  }
  return cles;
}

/**
 * Y a-t-il des réponses non envoyées sur cet appareil ?
 *
 * Sert à AVERTIR avant de purger, jamais à décider seul : un brouillon est du
 * travail que personne d'autre ne détient.
 */
export function aDesBrouillonsLocaux(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return clesBrouillon().length > 0;
  } catch {
    // Mode privé, quota, stockage bloqué : on ne peut pas savoir. Répondre
    // `false` ne fait rien perdre — la purge, elle, échouera pareillement en
    // silence, et le patient n'aura pas été averti pour rien.
    return false;
  }
}

/**
 * Efface TOUS les brouillons de questionnaire de cet appareil.
 *
 * POURQUOI CE GESTE EXISTE. La session portail dure 30 jours depuis `D-241` ;
 * « Se déconnecter » est ce qui protège l'ordinateur partagé. Or ces brouillons
 * sont des réponses de santé, conservées 30 jours elles aussi
 * (`DUREE_VIE_BROUILLON_JOURS`) : les laisser derrière soi vidait le geste de la
 * moitié de sa promesse. L'application ne les restitue pas sans session, mais
 * elles restent lisibles par qui ouvre les outils du navigateur.
 *
 * L'APPELANT DOIT AVOIR AVERTI. Cette fonction ne demande rien et ne rend rien :
 * elle applique une décision déjà prise par la personne.
 */
export function effacerTousLesBrouillons(): void {
  if (typeof window === 'undefined') return;
  try {
    // Les clés sont relevées AVANT la première suppression : `localStorage.key(i)`
    // est indexé, et retirer une entrée pendant le parcours décale les suivantes
    // — une clé sur deux survivrait.
    for (const cle of clesBrouillon()) window.localStorage.removeItem(cle);
  } catch {
    // Stockage indisponible : rien à effacer qu'on puisse atteindre.
  }
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
