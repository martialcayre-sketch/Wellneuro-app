// Domaine PUR des check-ins J7/J14/J21 (C2A LOT-04) — aucune dépendance Prisma,
// pour être importable côté client (formulaire portail) comme côté serveur.
// La persistance vit dans `checkins.ts` (qui réexporte ce domaine pour les
// routes). Instrument de PILOTAGE : jamais un score, jamais un jalon de mesure,
// jamais une alimentation de « Mon équilibre » (arbitrage A1).

export const CHECKIN_CONTRACT_VERSION = 'c2a-checkin-v1' as const;

// Version du CATALOGUE de questions (distincte du contrat de persistance
// ci-dessus). Le catalogue de base — les 4 questions gelées — est `-v1` ; il
// n'est jamais modifié dans son sens. `-v2` est une évolution STRICTEMENT
// ADDITIVE (C4 LOT-05) : elle n'ajoute qu'une question d'observance compléments
// conditionnelle (`observance_complements` + motif facultatif), rendue
// uniquement lorsqu'une recommandation compléments est matérialisée dans le
// protocole actif. Les 4 questions gelées gardent `valeur`/`libelle` à
// l'identique — aucun ajout au tableau `CHECKIN_QUESTIONS` (gelé, longueur 4).
export const CHECKIN_CATALOGUE_BASE_VERSION = 'checkin-catalogue-v1' as const;
export const CHECKIN_CATALOGUE_VERSION = 'checkin-catalogue-v2-observance-complements' as const;

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
// Identifiants du catalogue de base (gelés). L'extension additive C4 (§ plus
// bas) déclare ses propres identifiants ; les deux sont réunis dans
// `CheckinQuestionId` sans que le sens des questions de base ne change.
export type CheckinQuestionBaseId = 'adhesion' | 'tolerance' | 'energie' | 'sommeil';
export type CheckinQuestionObservanceId = 'observance_complements' | 'observance_complements_motif';
export type CheckinQuestionId = CheckinQuestionBaseId | CheckinQuestionObservanceId;
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

// ─── Extension C4 LOT-05 : observance compléments (additive, versionnée) ─────
// Le catalogue de base ci-dessus reste GELÉ (tableau de longueur 4, non modifié).
// L'évolution du contrat clinique gelé passe par ces constantes SÉPARÉES, jamais
// par une addition au tableau gelé. La question ci-dessous n'est jamais rendue
// d'office : `resolveCheckinQuestions` ne l'ajoute que lorsqu'une recommandation
// compléments est matérialisée dans le protocole actif (cf.
// `aUneMaterialisationComplements`). Ton calqué sur `adhesion` : options fermées,
// factuelles, non culpabilisantes. On rapporte, on n'infère pas — jamais un %,
// jamais un score, jamais montré au patient comme une mesure.
export const QUESTION_OBSERVANCE_COMPLEMENTS: CheckinQuestion = {
  id: 'observance_complements',
  libelle: 'Avez-vous pu prendre le complément proposé cette semaine ?',
  options: [
    { valeur: 'pas_encore_commence', libelle: 'Pas encore commencé' },
    { valeur: 'quelques_prises', libelle: 'Quelques prises' },
    { valeur: 'plupart_des_jours', libelle: 'La plupart des jours' },
    { valeur: 'tous_les_jours', libelle: 'Tous les jours' },
  ],
} as const;

// Motif FACULTATIF, fermé : éclaire un éventuel frein sans jamais culpabiliser
// ni inférer. Réponse absente = rien n'est supposé.
export const QUESTION_OBSERVANCE_COMPLEMENTS_MOTIF: CheckinQuestion = {
  id: 'observance_complements_motif',
  libelle: "S'il y a eu un frein, lequel ? (facultatif)",
  options: [
    { valeur: 'oubli', libelle: 'Oubli' },
    { valeur: 'gene_digestive', libelle: 'Gêne digestive' },
    { valeur: 'doute', libelle: 'Doute' },
    { valeur: 'autre', libelle: 'Autre' },
  ],
} as const;

// Lookup exhaustif (base gelée + extension C4). Sert à résoudre le libellé d'une
// réponse quelle que soit sa question ; ne remplace pas `CHECKIN_QUESTIONS`, qui
// reste la seule source du catalogue de base.
const TOUTES_LES_QUESTIONS: readonly CheckinQuestion[] = [
  ...CHECKIN_QUESTIONS,
  QUESTION_OBSERVANCE_COMPLEMENTS,
  QUESTION_OBSERVANCE_COMPLEMENTS_MOTIF,
] as const;

// Matérialisation compléments = au moins une action `supplement_exploration`
// portant une référence catalogue (`supplementCatalogRef`). Fonction PURE et
// structurelle (aucune dépendance Prisma ni clinical-engine) : c'est ce qui
// conditionne l'apparition de la question. Sans matérialisation → question
// absente. Un contrat V2 (intention seule, sans `supplementCatalogRef`) ne
// matérialise rien : le protocole ne connaît qu'une intention.
export function aUneMaterialisationComplements(
  actions: ReadonlyArray<{ type: string; supplementCatalogRef?: unknown }>,
): boolean {
  return actions.some(
    (action) => action.type === 'supplement_exploration' && action.supplementCatalogRef != null,
  );
}

// Catalogue résolu à la lecture selon l'état du protocole actif. Sans
// matérialisation, il est STRICTEMENT égal au catalogue de base gelé (mêmes
// références d'objet, même ordre) — le versionnage n'altère rien tant que la
// condition n'est pas réunie.
export function resolveCheckinQuestions(options: {
  materialisationComplements: boolean;
}): CheckinQuestion[] {
  const questions: CheckinQuestion[] = [...CHECKIN_QUESTIONS];
  if (options.materialisationComplements) {
    questions.push(QUESTION_OBSERVANCE_COMPLEMENTS, QUESTION_OBSERVANCE_COMPLEMENTS_MOTIF);
  }
  return questions;
}

export type CheckinReponses = {
  adhesion: string;
  tolerance: string;
  energie: string;
  sommeil: string;
  // Extension C4 (additive, facultative) : présentes uniquement quand la
  // question conditionnelle a été rendue et répondue. Le motif est toujours
  // facultatif. Leur absence ne dit rien — aucune inférence.
  observance_complements?: string;
  observance_complements_motif?: string;
};

// Libellé humain d'une réponse (pour l'affichage factuel côté patient/praticien).
// Recherche dans le catalogue exhaustif : les libellés de l'extension C4 sont
// donc résolus au même titre que ceux du catalogue de base.
export function optionLibelle(questionId: CheckinQuestionId, valeur: string): string | null {
  const question = TOUTES_LES_QUESTIONS.find((q) => q.id === questionId);
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
  // Extension C4 (additive) : les réponses d'observance compléments sont
  // FACULTATIVES. Absentes → non portées (les 4 questions de base restent la
  // seule exigence). Présentes → validées contre leurs options fermées et
  // reportées ; une valeur hors options est rejetée (jamais silencieusement
  // acceptée). Aucune autre clé n'est portée : `contractVersion` & co. restent
  // ignorées, comme avant.
  for (const question of [QUESTION_OBSERVANCE_COMPLEMENTS, QUESTION_OBSERVANCE_COMPLEMENTS_MOTIF]) {
    const rep = v[question.id];
    if (rep === undefined) continue;
    if (typeof rep !== 'string' || !question.options.some((o) => o.valeur === rep)) {
      throw new TypeError(`Réponse invalide pour « ${question.libelle} ».`);
    }
    out[question.id as CheckinQuestionObservanceId] = rep;
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
