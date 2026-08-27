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
// Un besoin est la moyenne de ses GROUPES, à parts égales ; un groupe est la
// moyenne pondérée de ses sources disponibles. Sans `groupe`, chaque source
// forme son propre groupe et le calcul reste la moyenne simple d'origine.
//
// Cette hiérarchie n'est pas une élégance : une pondération plate ne tient pas
// sa promesse quand une source manque. Le besoin 5 vise « mouvement 1/2, repos
// 1/2 » ; avec des poids plats 3/2/1 et un agenda absent — le cas de presque
// tous les patients — la renormalisation donnait 3/5 au mouvement et 2/5 au
// repos, et faisait basculer des patients sous le seuil d'effondrement sans
// qu'une seule de leurs réponses ait changé. Groupés, le repos vaut son demi
// quel que soit le nombre de sources qui l'alimentent.
export type SourceQuestionnaire = {
  idQuestionnaire: string;
  sousScore?: string;
  max: number;
  inverser: boolean;
  // Poids DANS le groupe (défaut 1). Sans groupe partagé, il n'a aucun effet.
  poids?: number;
  groupe?: string;
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

// Jalons de suivi longitudinal, glissants depuis l'ancre du cycle
// (docs/claude/E2_EVIDENCE_LEVELS_MOMENTUM_CONTEXTE.md §2).
//
// LA SÉRIE DES ANCRES EST OUVERTE DEPUIS `D-113` : `T0` ouvre le premier cycle,
// `T1` le deuxième, `T2` le troisième. Auparavant chaque cycle s'ouvrait par un
// `T0`, si bien qu'un second cycle DÉPLAÇAIT l'ancre du premier et fermait ses
// fenêtres par effet de bord. Une ancre posée ne se déplace plus.
//
// CONSÉQUENCE DE TYPAGE, ET ELLE EST VOULUE : ce type n'est plus une union
// fermée, donc `Record<JalonMomentum, …>` n'est plus formable. Les tables
// indexées par jalon portent désormais les seuls jalons de MESURE
// (`JalonMesure`), et les ancres se traitent par prédicat — ce qui force à
// écrire « est-ce une ancre ? » là où l'on écrivait `=== 'T0'` en pensant la
// même chose. C'est cette confusion que la décision supprime.
export type { AncreCycle, JalonMesure } from '@/lib/protocol/cycles';

import type { AncreCycle, JalonMesure } from '@/lib/protocol/cycles';

export type JalonMomentum = AncreCycle | JalonMesure;

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
