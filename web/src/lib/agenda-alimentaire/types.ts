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
// seraient des constructions WellNeuro non validées — niveau de preuve D.
// Indice longitudinal, jamais diagnostique.
//
// [CORRECTION DU 2026-08-03] Ce commentaire annonçait ces composites « servis à
// Mon équilibre ». Ils ne le sont pas, et la décision est prise de ne pas les y
// servir : le besoin 3 « Rythme alimentaire » a DÉJÀ une source, le sous-score
// `RYTHME_CHRONO` de `Q_ALI_01` (`equilibre/constants.ts`). Y ajouter l'agenda
// ferait deux mesures d'un même thème — le piège que `lib/anthropic.ts`
// documente pour `RYTHME_ALIMENTAIRE` /10 contre `RYTHME_CHRONO` /7, dont
// l'agenda serait le TROISIÈME porteur. `sourceMonEquilibre` vaut donc `false`
// au registre des instruments, et `BESOIN_SOURCES` n'est pas touché.
//
// Ce qui est visé à la place : l'ÉCART entre le rythme DÉCLARÉ (`Q_ALI_01`) et
// le rythme OBSERVÉ (21 jours), comme objet clinique distinct. Il reste à
// écrire, et il dépend de la forme servie — sous la forme courte à 14 items,
// `MAX_RYTHME_CHRONO` vaut 0 et il n'existe aucun rythme déclaré à comparer :
// l'écart devra alors rendre `null`, jamais 0, qui se lirait « pas d'écart ».

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
/** Minimum de journées PORTEUSES DE PRISES pour qu'un axe horaire soit couvert. */
export const MIN_JOURS_AXE = 7;

/**
 * L'axe JEUNE se compte en PAIRES de jours consécutifs, pas en jours : un
 * recueil de quatorze jours en pointillé, un jour sur deux, porte quatorze
 * jours et zéro paire. Compter des jours y ferait passer un recueil qui ne
 * mesure aucun jeûne pour un recueil exploitable.
 */
export const MIN_PAIRES_JEUNE = 7;

/**
 * Borne de plausibilité de la FENÊTRE ALIMENTAIRE d'une journée (minutes).
 * Au-delà, c'est cette grandeur-là qui devient inconnue — la journée, elle,
 * reste comptée : l'exclure entièrement retirerait aussi son week-end, ses
 * présences et ses jeûnes, et ferait disparaître du recueil précisément les
 * journées les plus dysrégulées.
 */
export const FENETRE_ALI_MAX_PLAUSIBLE = 1080; // 18 h

/**
 * Borne haute d'un jeûne NOCTURNE (minutes). Deux journées porteuses de prises
 * peuvent produire un intervalle de plus de vingt-quatre heures — dernière
 * prise à 05:00, première prise du lendemain à 03:45. Ce n'est plus un jeûne
 * nocturne, et l'inclure dans la médiane décrirait un patient qui n'existe pas.
 */
export const JEUNE_MAX_PLAUSIBLE = 1440; // 24 h
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
/**
 * TROIS ÉTATS, ET NON DEUX, sur les quatre présences obligatoires.
 *
 * `true` / `false` sont des observations ; `null` est une ABSTENTION explicite
 * — « je ne sais pas » —, distincte de la clé absente (`undefined`), qui reste
 * la non-réponse d'une ligne écrite sous une version antérieure.
 *
 * Sans ce troisième état, un patient qui ignore le contenu d'une journée n'avait
 * que deux issues : répondre au hasard, ou sauter la journée ENTIÈRE. La seconde
 * perd aussi les horaires, qui sont la mesure principale de l'instrument — et
 * c'est le seuil d'exploitabilité (14 jours, 4 week-ends, 7 paires de jeûne) qui
 * en paie le prix. L'étage d'agrégation anticipait déjà cette connaissance
 * partielle (`nbJoursContenuConnu` est un dénominateur) que l'étage d'écriture
 * interdisait de produire : on lève une contradiction interne, on n'en crée pas.
 *
 * `soirPlusCopieux` NE porte PAS d'abstention (arbitrage praticien du
 * 2026-08-04). Il reste `boolean | undefined`, et la lecture doit écarter un
 * `null` reçu — sinon le prédicat de couverture, qui teste la connaissance,
 * compterait cette journée comme renseignée.
 */
export type JourReponses = {
  prises?: PriseJour[];
  aucunePrise?: boolean;
  /**
   * Obligatoire en ÉCRITURE dès que la journée porte des prises — la CLÉ doit
   * être présente, sa valeur pouvant être `null`. Facultatif dans le type parce
   * que la lecture ne doit jamais rendre illisible une ligne déjà en base. Sans
   * cette obligation, l'axe MATIN récompenserait la non-réponse — le défaut
   * corrigé en `agenda-sommeil-v2`.
   */
  premierePriseProteines?: boolean | null;
  /**
   * Facultatif : n'alimente qu'un drapeau, jamais un point. Seul champ de
   * contenu SANS abstention — pas de `null` (voir l'en-tête du type).
   */
  soirPlusCopieux?: boolean;

  // — Présences observées, obligatoires ensemble en écriture —
  // Renseigner deux présences sur trois ferait lire la troisième comme une
  // absence : le contenu serait dit pauvre là où il est simplement inconnu.
  // Une abstention (`null`) sur l'une des trois les sort TOUTES du dénominateur,
  // pour la même raison.
  legumesDeuxPrises?: boolean | null;
  fruitsOuOleagineux?: boolean | null;
  /** Seule présence comptée à l'envers : présent = moins bien couvert. */
  ultraTransformes?: boolean | null;
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
