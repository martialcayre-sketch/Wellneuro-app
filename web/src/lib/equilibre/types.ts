export type StrateCode = 'CORPS' | 'ANCRAGE' | 'ESPRIT';

export type BesoinDefinition = {
  id: number;
  libellePatient: string;
  libellePraticien: string;
  pilier: 1 | 2 | 3 | 4;
  strate: StrateCode;
};

// Une source = un questionnaire (ou un sous-score précis d'un questionnaire
// à sous-scores) qui alimente un besoin. `inverser` indique que le score
// brut du questionnaire est orienté "plus haut = plus de symptômes" — la
// couverture (0-1, plus haut = mieux) doit alors être 1 - ratio.
export type SourceQuestionnaire = {
  idQuestionnaire: string;
  sousScore?: string;
  max: number;
  inverser: boolean;
};

// answers attendu par calculateScore(idQuestionnaire, answers) de questions.ts
export type ReponsesQuestionnaire = Record<string, string | number>;
export type ReponsesParQuestionnaire = Record<string, ReponsesQuestionnaire>;

export type CouverturesParBesoin = Record<number, number | null>;

export type ResultatBesoin = {
  besoin: number;
  couverture: number | null;
};

export type ResultatStrate = {
  strate: StrateCode;
  couverture: number | null;
  besoins: ResultatBesoin[];
};

export type FondationCritiqueDeclenchee = {
  besoin: number;
  couverture: number;
};

export type ResultatEquilibre = {
  scoreGlobal: number | null; // 0-100, arrondi
  scoreGlobalAvantPlafond: number | null;
  plafondApplique: boolean;
  fondationsCritiquesDeclenchees: FondationCritiqueDeclenchee[];
  strates: ResultatStrate[];
  versionScore: string;
};

// Jalons de suivi longitudinal T0/J21/J42/J90, glissants depuis la date T0
// réelle du patient (docs/claude/E2_EVIDENCE_LEVELS_MOMENTUM_CONTEXTE.md §2).
export type JalonMomentum = 'T0' | 'J21' | 'J42' | 'J90';

export type LectureDatee = {
  date: Date;
  valeur: number;
};

export type TendanceMomentum = 'hausse' | 'stable' | 'baisse';

export type ResultatMomentum = {
  delta: number;
  tendance: TendanceMomentum;
};

// A = questionnaire clinique validé · B = référentiel neuronutrition (SIIN/DNSM)
// C = biologie fonctionnelle interprétative · D = hypothèse WellNeuro.
// Cf. docs/claude/E2_EVIDENCE_LEVELS_MOMENTUM_CONTEXTE.md.
export type NiveauPreuve = 'A' | 'B' | 'C' | 'D';

// Besoin sans aucune source répondue : distinct de 'D', jamais à confondre
// (un besoin non mesuré n'a par définition aucune preuve, même faible).
export type NiveauPreuveBesoin = NiveauPreuve | 'NON_MESURE';

export type SourcePreuve = {
  idQuestionnaire: string;
  sousScore?: string;
  grade: NiveauPreuve | null;
};
