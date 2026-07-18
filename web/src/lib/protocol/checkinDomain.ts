// Domaine PUR des check-ins J7/J14/J21 (C2A LOT-04) — aucune dépendance Prisma,
// pour être importable côté client (formulaire portail) comme côté serveur.
// La persistance vit dans `checkins.ts` (qui réexporte ce domaine pour les
// routes). Instrument de PILOTAGE : jamais un score, jamais un jalon de mesure,
// jamais une alimentation de « Mon équilibre » (arbitrage A1).

export const CHECKIN_CONTRACT_VERSION = 'c2a-checkin-v1' as const;

const JOUR_MS = 24 * 60 * 60 * 1000;

// ─── Points d'étape ──────────────────────────────────────────────────────────
export type PointEtape = 'J7' | 'J14' | 'J21';
export const POINTS_ETAPE: readonly PointEtape[] = ['J7', 'J14', 'J21'] as const;

const JOURS_POINT_ETAPE: Record<PointEtape, number> = { J7: 7, J14: 14, J21: 21 };

// Tolérance de départ (±3 jours), ajustable selon retour terrain. Fenêtres
// disjointes [4,10] / [11,17] / [18,24] → au plus un point d'étape ouvert à la
// fois (garde-fou anti sur-sollicitation).
export const TOLERANCE_JOURS_POINT_ETAPE = 3;

// Point d'étape « ouvert » à `now`, dérivé de l'ancre (date de diffusion active
// du protocole). Déterministe, factuel ; aucune notification proactive.
export function pointEtapeCourant(anchorDate: Date, now: Date): PointEtape | null {
  const jours = (now.getTime() - anchorDate.getTime()) / JOUR_MS;
  for (const pe of POINTS_ETAPE) {
    if (Math.abs(jours - JOURS_POINT_ETAPE[pe]) <= TOLERANCE_JOURS_POINT_ETAPE) return pe;
  }
  return null;
}

// ─── Catalogue des questions (gelé, français, non culpabilisant) ─────────────
export type CheckinQuestionId = 'adhesion' | 'tolerance' | 'energie' | 'sommeil';
export type CheckinOption = { valeur: string; libelle: string };
export type CheckinQuestion = {
  id: CheckinQuestionId;
  libelle: string;
  options: readonly CheckinOption[];
};

export const CHECKIN_QUESTIONS: readonly CheckinQuestion[] = [
  {
    id: 'adhesion',
    libelle: "Avez-vous pu réaliser l'action principale cette semaine ?",
    options: [
      { valeur: 'pas_encore', libelle: 'Pas encore' },
      { valeur: 'quelques_jours', libelle: 'Quelques jours' },
      { valeur: 'plupart_des_jours', libelle: 'La plupart des jours' },
      { valeur: 'tous_les_jours', libelle: 'Tous les jours' },
    ],
  },
  {
    id: 'tolerance',
    libelle: "Comment l'avez-vous tolérée ?",
    options: [
      { valeur: 'bien', libelle: 'Bien' },
      { valeur: 'quelques_genes', libelle: 'Quelques gênes' },
      { valeur: 'difficilement', libelle: 'Difficilement' },
    ],
  },
  {
    id: 'energie',
    libelle: 'Votre énergie depuis le début ?',
    options: [
      { valeur: 'mieux', libelle: 'Mieux' },
      { valeur: 'stable', libelle: 'Stable' },
      { valeur: 'moins_bien', libelle: 'Moins bien' },
    ],
  },
  {
    id: 'sommeil',
    libelle: 'Votre sommeil depuis le début ?',
    options: [
      { valeur: 'mieux', libelle: 'Mieux' },
      { valeur: 'stable', libelle: 'Stable' },
      { valeur: 'moins_bien', libelle: 'Moins bien' },
    ],
  },
] as const;

export type CheckinReponses = {
  adhesion: string;
  tolerance: string;
  energie: string;
  sommeil: string;
};

// Libellé humain d'une réponse (pour l'affichage factuel côté patient/praticien).
export function optionLibelle(questionId: CheckinQuestionId, valeur: string): string | null {
  const question = CHECKIN_QUESTIONS.find((q) => q.id === questionId);
  return question?.options.find((o) => o.valeur === valeur)?.libelle ?? null;
}

// ─── Validation (throw TypeError → 400 côté route) ───────────────────────────
export function ensurePointEtape(value: unknown): PointEtape {
  if (typeof value === 'string' && (POINTS_ETAPE as readonly string[]).includes(value)) {
    return value as PointEtape;
  }
  throw new TypeError('Point d’étape invalide.');
}

// Valide les 4 réponses ; ignore les clés supplémentaires (ex. contractVersion
// rangé dans le JSON stocké).
export function ensureReponses(value: unknown): CheckinReponses {
  if (!value || typeof value !== 'object') {
    throw new TypeError('Réponses de check-in illisibles.');
  }
  const v = value as Record<string, unknown>;
  const out = {} as CheckinReponses;
  for (const question of CHECKIN_QUESTIONS) {
    const rep = v[question.id];
    if (typeof rep !== 'string' || !question.options.some((o) => o.valeur === rep)) {
      throw new TypeError(`Réponse invalide pour « ${question.libelle} ».`);
    }
    out[question.id] = rep;
  }
  return out;
}

// ─── Formes de lecture + chaînage append-only ───────────────────────────────
export type CheckinRow = {
  id: string;
  idPatient: string;
  idAssignation: string;
  protocolDraftId: string;
  pointEtape: PointEtape;
  reponses: CheckinReponses;
  canal: string;
  supersedesCheckinId: string | null;
  soumisLe: string; // ISO
};

export type CheckinInput = {
  idPatient: string;
  idAssignation: string;
  protocolDraftId: string;
  pointEtape: PointEtape;
  reponses: CheckinReponses;
  supersedesCheckinId?: string | null;
};

// Check-in « courant » d'un point d'étape = tête de chaîne : la ligne qu'aucune
// autre ne supplante, la plus récente en cas d'égalité (même algorithme que
// `resolveActiveVersion` de versioning.ts, adapté au chaînage des check-ins).
export function resolveActiveCheckin(rows: CheckinRow[], pointEtape: PointEtape): CheckinRow | null {
  const scoped = rows.filter((row) => row.pointEtape === pointEtape);
  if (scoped.length === 0) return null;
  const superseded = new Set(
    scoped.map((row) => row.supersedesCheckinId).filter((id): id is string => id !== null),
  );
  const heads = scoped.filter((row) => !superseded.has(row.id));
  const pool = heads.length > 0 ? heads : scoped;
  return [...pool].sort((left, right) => {
    const delta = new Date(right.soumisLe).getTime() - new Date(left.soumisLe).getTime();
    if (delta !== 0) return delta;
    return left.id < right.id ? 1 : left.id > right.id ? -1 : 0;
  })[0];
}
