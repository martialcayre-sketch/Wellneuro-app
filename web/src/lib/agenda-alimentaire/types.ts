// Agenda alimentaire — 21 jours (`Q_ALI_09`). Contrat de recueil, domaine PUR.
//
// Ce que cet instrument mesure : QUAND le patient mange (heures réelles des
// prises), COMMENT elles se structurent (repas vs hors-repas), et la PRÉSENCE
// de quelques catégories que le guide des besoins nomme pour le besoin 1
// (« riche en légumes, baies, noix, et pauvre en produits ultra-transformés »).
//
// Ce qu'il ne mesure pas, et ne mesurera pas : aucune quantité, aucun aliment
// identifié au-delà des présences ci-dessus, aucune kcal, aucun gramme. Les
// trois présences observées ne sont PAS un score MEDAS abrégé — l'adhérence
// méditerranéenne appartient à `Q_ALI_02`, et la reproduire ici tomberait sous
// l'interdit écrit « aucune projection vers Q_ALI_01/Q_ALI_02 » (cadrage 5.0,
// entrée JA du registre des frontières).
//
// Trois étages de preuve, comme l'agenda du sommeil : le SUPPORT (semainier
// alimentaire horodaté) est un instrument courant ; les MÉTRIQUES dérivées
// (jeûne nocturne, fenêtre alimentaire, écart-type des ancres) sont des
// grandeurs usuelles de chronutrition ; l'INDICE /100 et les deux composites
// servis à « Mon équilibre » sont des constructions WellNeuro non validées —
// niveau de preuve D. Indice longitudinal, jamais diagnostique.

export const AGENDA_ALI_ID = 'Q_ALI_09' as const;
export const AGENDA_ALI_TITRE = 'Agenda alimentaire — 21 jours' as const;

// Versionnage du contrat JSON stocké. La liste des versions LUES ne se
// rétrécit jamais : une ligne écrite sous une version antérieure doit rester
// relisible, sans quoi l'historique d'un patient devient illisible du jour au
// lendemain (leçon `agenda-sommeil-v1` → `v2`).
export const AGENDA_ALI_CONTRACT_VERSION = 'agenda-alimentaire-v1' as const;
export const AGENDA_ALI_CONTRACT_VERSIONS_LUES = ['agenda-alimentaire-v1'] as const;

/**
 * La journée alimentaire court de 04:00 à 03:59 : une prise à 00:30 appartient
 * à la journée de la veille. Symétrique de « dateNuit = matin du réveil » côté
 * sommeil, et pour la même raison — sans ancre, une prise nocturne casserait à
 * la fois l'ordre des prises et le calcul du jeûne.
 *
 * Cette ancre sert aussi d'origine aux statistiques d'heures : un écart-type
 * calculé depuis minuit ferait passer 23:45 et 00:15 pour douze heures d'écart.
 */
export const ANCRE_JOURNEE_MIN = 240; // 04:00

export const NB_JOURS_AGENDA_ALI = 21;

/**
 * Seuils d'exploitabilité, quatre étages — mêmes valeurs que l'agenda du
 * sommeil, mêmes justifications : une moyenne se stabilise vite, une
 * variabilité non ; et le week-end fait dériver les horaires alimentaires
 * comme il fait dériver les horaires de sommeil.
 */
export const MIN_JOURS_AGREGATS = 7;
export const MIN_JOURS_INDICE = 14;
export const MIN_JOURS_WEEKEND_INDICE = 4;
export const MIN_JOURS_AXE = 7;

/**
 * L'axe JEUNE se compte en PAIRES de jours consécutifs, pas en jours : un
 * recueil de quatorze jours en pointillé, un jour sur deux, porte quatorze
 * jours et zéro paire. Compter des jours y ferait passer un recueil qui ne
 * mesure aucun jeûne pour un recueil exploitable.
 */
export const MIN_PAIRES_JEUNE = 7;

/** Bornes de plausibilité d'une journée (minutes). */
export const FENETRE_ALI_MAX_PLAUSIBLE = 1080; // 18 h entre première et dernière prise
export const NB_PRISES_MAX = 10;

export type NaturePrise = 'repas' | 'hors_repas';

export const NATURES_PRISE: readonly NaturePrise[] = ['repas', 'hors_repas'] as const;

export type PriseJour = {
  /** HH:MM en horloge murale locale, pas de 15 min. */
  heure: string;
  nature: NaturePrise;
};

/**
 * Une journée du recueil.
 *
 * `prises` et `aucunePrise` sont exclusifs. Un jour sans aucune prise est une
 * RÉPONSE — elle compte dans la couverture et vaut une information clinique ;
 * un emplacement non renseigné n'en est pas une, et reste un trou visible.
 */
export type JourReponses = {
  prises?: PriseJour[];
  aucunePrise?: boolean;
  /**
   * Obligatoire en ÉCRITURE dès que la journée porte des prises. Facultatif
   * dans le type parce que la lecture ne doit jamais rendre illisible une
   * ligne déjà en base. Sans cette obligation, l'axe MATIN récompenserait la
   * non-réponse — le défaut corrigé en `agenda-sommeil-v2`.
   */
  premierePriseProteines?: boolean;
  /** Facultatif : n'alimente qu'un drapeau, jamais un point. */
  soirPlusCopieux?: boolean;

  // — Présences observées, obligatoires ensemble en écriture —
  // Renseigner deux présences sur trois ferait lire la troisième comme une
  // absence : le contenu serait dit pauvre là où il est simplement inconnu.
  legumesDeuxPrises?: boolean;
  fruitsOuOleagineux?: boolean;
  /** Seule présence comptée à l'envers : présent = moins bien couvert. */
  ultraTransformes?: boolean;
};

export type JourRow = {
  id: string;
  idPatient: string;
  idAssignation: string;
  /** AAAA-MM-JJ — journée locale 04:00 → 03:59. */
  dateJour: string;
  reponses: JourReponses;
  canal: string;
  supersedesJourId: string | null;
  /** ISO. */
  soumisLe: string;
};

export type JourInput = {
  idPatient: string;
  idAssignation: string;
  dateJour: string;
  reponses: JourReponses;
  canal?: string;
  supersedesJourId?: string | null;
};
