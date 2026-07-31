// Service du catalogue de compléments C4A — construit, pour chaque fiche
// (produit servi par son pointeur de version courante), les DIMENSIONS
// multicritères NOMMÉES exigées par le §5 de la proposition, sans JAMAIS les
// agréger en un chiffre. Décision figée de C4 : « pas de score global dominant,
// présentation multi-dimensions, justification toujours visible ».
//
// Lecture seule, référentiel documentaire — AUCUNE donnée patient n'entre ici.
// Le moteur SIGNALE (facettes qualitatives sourcées), le praticien décide.
//
// Réutilise le socle déjà mergé : resoudreIntentions (grades GRADE + forme
// préférée par intention), evaluerSentinelle (cumuls / dépassements de seuils),
// construireTableauCompatibilite (lecture de compatibilité protocole).
//
// Sélection, tri, comptage et pagination se font DANS POSTGRES ; les huit
// dimensions ne sont calculées que pour la page servie (≤ 50 fiches). Le
// catalogue de production compte 140 148 fiches : les charger toutes pour
// filtrer en mémoire dépassait la limite de réponse de la fonction (~4,5 Mo)
// et l'écran ne se chargeait plus du tout.
//
// Règle qui découle de la pagination, non négociable : AUCUN filtre ne
// s'applique après elle. Une facette est exprimée en base, ou elle est
// indisponible (grisée à l'écran) — un filtre appliqué en mémoire sur la page
// produirait des pages à trous et un total faux.
import type { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { isC4Enabled } from './featureFlag';
import { resoudreIntentions } from './resolution';
import { evaluerSentinelle } from './sentinelle';
import { construireTableauCompatibilite } from './compatibilite';
import {
  labelGradePreuve,
  type CandidatProtocolReviewFlag,
  type GradePreuveScientifique,
  type ResolutionIntentions,
  type ValeurCompatibiliteProtocole,
  type ValeurQualiteFormulation,
} from './types';

// v4 (2026-07-31) : `composition[].doseParPortion` devient `doseParDjr`. La
// source déclare une quantité par dose journalière recommandée, pas par unité
// de prise — le champ portait un nom qui trompait son prochain lecteur.
export const C4_CATALOGUE_VERSION = 'c4-catalogue-v4' as const;

// Bornes de pagination. 50 fiches × ~5 Ko ≈ 250 Ko : marge large sous la limite
// de réponse de la fonction. L'offset est plafonné parce que personne ne
// feuillette la page 401 d'un catalogue — au-delà, on demande d'affiner.
export const PAR_PAGE_DEFAUT = 25;
export const PAR_PAGE_MAX = 50;
export const OFFSET_MAX = 10_000;
export const RECHERCHE_MAX = 200;

// Vocabulaire fermé aligné sur les CHECK de la migration catalogue
// (20260724133000_c4_supplement_product_catalogue). Le niveau de complétude du
// produit EST la source de vérité de la « qualité de formulation ».
const QUALITE_PAR_COMPLETUDE: Record<string, ValeurQualiteFormulation> = {
  bien_documentee: 'bien_documentee',
  partielle: 'partielle',
  lacunaire: 'lacunaire',
};

// ─── Contrat exposé ─────────────────────────────────────────────────────────

export type ValeurBiodisponibilite =
  | 'forme_preferee'
  | 'acceptable'
  | 'non_preferee'
  | 'non_evaluee';

export type ValeurInteractions = 'signalees' | 'aucune_connue' | 'non_evaluee';
export type ValeurCumul = 'signale' | 'aucun' | 'non_evaluee';
export type ValeurDonneesManquantes = 'liste_explicite' | 'aucune' | 'non_evaluee';

/**
 * Ce que l'on sait de la composition d'une fiche — jamais un booléen.
 *
 * `absente`   aucune ligne de composition n'est enregistrée ;
 * `partielle` des lignes existent, sans preuve qu'elles soient TOUTES là ;
 * `integre`   toutes les lignes actives de la source sont résolues.
 *
 * La distinction n'est pas cosmétique. La résolution nominatif→ingrédient se
 * fera par vagues : une vague de 289 libellés laisse 30,8 % des fiches
 * partiellement résolues, une vague de 453 en laisse 18,5 % (mesure du corpus
 * source, 141 388 fiches). Une fiche partielle A des compositions : lue par un
 * simple `compositions.length > 0`, elle repasserait « connue » et rendrait de
 * nouveau « Compatible » et « Aucun cumul » alors qu'un ingrédient sur cinq lui
 * est invisible — exactement le feu vert tiré du vide fermé en #482.
 */
export type CompletudeComposition = 'absente' | 'partielle' | 'integre';

export type CompositionFiche = {
  ingredientCode: string;
  ingredientNomFr: string;
  formeCode: string | null;
  formeLabelFr: string | null;
  // Par DOSE JOURNALIÈRE RECOMMANDÉE, jamais par unité de prise : c'est ce que
  // la source déclare (voir 20260731200000_c4_composition_dose).
  doseParDjr: number | null;
  unite: string | null;
};

export type GradeParIntention = {
  intentionCode: string;
  intentionLabelFr: string;
  ingredientCode: string;
  grade: GradePreuveScientifique;
  gradeLabel: string;
};

export type BiodisponibiliteParIngredient = {
  ingredientCode: string;
  valeur: ValeurBiodisponibilite;
  formeFiche: string | null;
  formePreferee: string | null;
};

export type SignalementInteraction = {
  code: string;
  messageFr: string;
  niveauAlerte: string;
  ingredientCode: string;
};

export type ReferenceScientifique = { id: string; citation: string; lienUrl: string | null };

// Les huit dimensions du §5, chacune sourcée, jamais fondues en un chiffre.
export type DimensionsFiche = {
  qualiteFormulation: { valeur: ValeurQualiteFormulation; justification: string };
  biodisponibiliteForme: {
    valeurs: BiodisponibiliteParIngredient[];
    valeursPresentes: ValeurBiodisponibilite[];
    justification: string;
  };
  gradePreuveParIntention: { valeurs: GradeParIntention[]; justification: string };
  compatibiliteProtocole: { valeur: ValeurCompatibiliteProtocole; justification: string };
  interactionsSignalees: {
    valeur: ValeurInteractions;
    signalements: SignalementInteraction[];
    mentionMedecin: string;
    justification: string;
  };
  cumulVsSeuils: {
    valeur: ValeurCumul;
    signaux: CandidatProtocolReviewFlag[];
    justification: string;
  };
  donneesManquantes: {
    valeur: ValeurDonneesManquantes;
    elements: string[];
    justification: string;
  };
  fraicheurProvenance: {
    provenance: string;
    identifiantSource: string;
    urlSource: string | null;
    dateDerniereVerification: string | null;
    versionFormulation: number;
    statutFiche: string;
    statutLabel: string;
    justification: string;
  };
};

export type FicheComplement = {
  produitId: string;
  nomCommercial: string;
  marque: string;
  marche: string;
  statutFiche: string;
  statutLabel: string;
  composition: CompositionFiche[];
  /**
   * Ce que vaut `composition` ci-dessus. À lire AVANT les dimensions : sur
   * `partielle`, la liste des ingrédients est incomplète, donc le compteur
   * `reglesCorrespondantes` est sous-estimé et toute absence de signal est sans
   * valeur.
   */
  completudeComposition: CompletudeComposition;
  dimensions: DimensionsFiche;
  // Compteur FACTUEL — nombre de règles cliniques validées correspondant à la
  // composition de la fiche. Ce n'est PAS un score : aucune pondération, aucun
  // classement « meilleur produit » n'en découle (§5, tri neutre par défaut).
  reglesCorrespondantes: number;
  referencesScientifiques: ReferenceScientifique[];
};

export const FACETTES = {
  qualite: ['bien_documentee', 'partielle', 'lacunaire'] as ValeurQualiteFormulation[],
  biodisponibilite: [
    'forme_preferee',
    'acceptable',
    'non_preferee',
    'non_evaluee',
  ] as ValeurBiodisponibilite[],
  grade: ['fort', 'modere', 'faible', 'usage_traditionnel'] as GradePreuveScientifique[],
  compatibilite: [
    'compatible',
    'compatible_avec_vigilance',
    'vigilance_requise',
    'non_evaluee',
  ] as ValeurCompatibiliteProtocole[],
  interactions: ['signalees', 'aucune_connue', 'non_evaluee'] as ValeurInteractions[],
  cumul: ['signale', 'aucun', 'non_evaluee'] as ValeurCumul[],
  donneesManquantes: ['liste_explicite', 'aucune', 'non_evaluee'] as ValeurDonneesManquantes[],
  statut: ['importee', 'verifiee'] as string[],
} as const;

// Facettes SERVIES : celles dont le prédicat s'exprime en base sur des colonnes
// de la fiche. Les autres (grade, biodisponibilité, compatibilité, cumul)
// dépendent de la composition des produits et des règles cliniques — deux
// tables VIDES en production tant que l'import des compositions n'a pas eu
// lieu. Les servir donnerait un filtre qui a l'air de marcher et ne filtre
// rien : elles sont déclarées indisponibles et refusées explicitement, jamais
// silencieusement ignorées.
export const FACETTES_SERVIES = ['qualite', 'statut', 'donneesManquantes', 'interactions'] as const;
export const FACETTES_INDISPONIBLES = [
  'grade',
  'biodisponibilite',
  'compatibilite',
  'cumul',
] as const;
export type CleFacetteServie = (typeof FACETTES_SERVIES)[number];

// Tri MONO-DIMENSION explicite (§5). L'ordre par défaut est NEUTRE
// (alphabétique par nom commercial) — jamais un tri « meilleur produit ».
export const TRIS = ['neutre', 'marque', 'statut', 'fraicheur'] as const;
export type CleTri = (typeof TRIS)[number];
// Même raison que les facettes ci-dessus : trier par nombre de règles
// correspondantes suppose des règles cliniques ; il n'y en a aucune en base.
export const TRIS_INDISPONIBLES = ['reglesCorrespondantes'] as const;

export const MESSAGE_INDISPONIBLE =
  "Ce critère sera disponible après l'import de la composition des produits.";

/**
 * Valeurs d'une facette PAR AILLEURS servie dont le prédicat SQL n'est pas
 * fiable tant que la complétude de composition n'est pas prouvée.
 *
 * `interactions = aucune_connue` vaut « un seuil actif existe, mais aucun ne
 * bascule avec alerte ». Sur une fiche partiellement résolue, c'est vrai alors
 * que l'ingrédient porteur du signal peut être précisément celui qui n'a pas
 * été résolu : un faux vert DANS UN FILTRE, pire qu'à l'affichage puisqu'il
 * décide de ce que le praticien voit. L'intégrité n'étant pas exprimable en
 * base avant la preuve de complétude (phase 1b), la valeur est refusée.
 *
 * Les deux autres valeurs restent servies et sont saines : `signalees` est un
 * vrai positif, `non_evaluee` est déjà l'abstention.
 */
export const VALEURS_FACETTE_INDISPONIBLES: Partial<Record<CleFacetteServie, readonly string[]>> = {
  interactions: ['aucune_connue'],
};

export const MESSAGE_VALEUR_INDISPONIBLE =
  "Ce critère ne sera fiable qu'une fois la composition des produits entièrement résolue.";

export type FiltresCatalogue = {
  qualite?: ValeurQualiteFormulation[];
  interactions?: ValeurInteractions[];
  donneesManquantes?: ValeurDonneesManquantes[];
  statut?: string[];
};

export type OptionsCatalogue = {
  intentionCode?: string | null;
  /** Recherche libre sur le nom commercial ou la marque (insensible à la casse). */
  recherche?: string | null;
  filtres?: FiltresCatalogue;
  tri?: CleTri;
  page?: number;
  parPage?: number;
};

export type CatalogueResult = {
  contractVersion: typeof C4_CATALOGUE_VERSION;
  // Marqueur de contrat : aucune sortie du catalogue n'agrège les dimensions.
  aucunScoreGlobal: true;
  intentionFiltre: { code: string; labelFr: string } | null;
  codesInconnus: string[];
  tri: CleTri;
  recherche: string;
  page: number;
  parPage: number;
  /** Total des fiches correspondant aux critères — PAS la taille de la page. */
  total: number;
  fiches: FicheComplement[];
  facettes: typeof FACETTES;
  facettesServies: typeof FACETTES_SERVIES;
  facettesIndisponibles: typeof FACETTES_INDISPONIBLES;
};

/**
 * Requête refusée pour une raison exprimable à l'utilisateur (pagination hors
 * bornes). La route la traduit en 400 ; elle ne signale JAMAIS une panne.
 */
export class CatalogueRequeteInvalide extends Error {
  constructor(readonly raison: string, message: string) {
    super(message);
    this.name = 'CatalogueRequeteInvalide';
  }
}

// ─── Libellés honnêtes de statut de fiche ───────────────────────────────────

const STATUT_LABEL: Record<string, string> = {
  importee: 'Fiche importée — non vérifiée',
  verifiee: 'Fiche vérifiée par le praticien',
  inactive: 'Fiche inactive',
};

function statutLabel(statut: string): string {
  return STATUT_LABEL[statut] ?? statut;
}

// ─── Types internes de lecture ──────────────────────────────────────────────

type LigneComposition = {
  ingredient: { id: string; code: string; nomFr: string };
  forme: { id: string; code: string; labelFr: string } | null;
  doseParDjr: number | null;
  unite: string | null;
  position: number;
};

type LigneFiche = {
  productId: string;
  product: {
    id: string;
    nomCommercial: string;
    marque: string;
    marche: string;
    sourceProvenance: string;
    sourceIdentifiant: string;
    sourceUrl: string | null;
    dateDerniereVerification: Date | null;
    statutFiche: string;
    niveauCompletude: string;
    donneesManquantes: string[];
    // Nombre de lignes actives déclarées par la source ; NULL = inconnu, donc
    // aucune preuve d'exhaustivité (voir lireCompletudeComposition).
    compositionSourceLignes: number | null;
    versionFormulation: number;
    compositions: LigneComposition[];
  };
};

type SeuilInteraction = {
  ingredientId: string;
  basculeRisque: boolean;
  safetyAlert: { code: string; messageFr: string; niveauAlerte: string } | null;
  sourceReference: { id: string; citation: string; lienUrl: string | null };
};

// Vue « intentions » projetée depuis la résolution : pour chaque code
// ingrédient, la liste des (intention, grade, forme préférée) qui le visent.
type VueIntentions = {
  parIngredient: Map<string, Array<{ intentionCode: string; intentionLabelFr: string; grade: GradePreuveScientifique; formePrefereeCode: string | null }>>;
  sourcesParIngredient: Map<string, ReferenceScientifique[]>;
};

function projeterResolution(resolution: ResolutionIntentions | null): VueIntentions {
  const parIngredient = new Map<string, Array<{ intentionCode: string; intentionLabelFr: string; grade: GradePreuveScientifique; formePrefereeCode: string | null }>>();
  const sourcesParIngredient = new Map<string, ReferenceScientifique[]>();
  if (!resolution) return { parIngredient, sourcesParIngredient };
  for (const { intention, regles } of resolution.intentions) {
    for (const regle of regles) {
      const code = regle.ingredient.code;
      const liste = parIngredient.get(code) ?? [];
      liste.push({
        intentionCode: intention.code,
        intentionLabelFr: intention.labelFr,
        grade: regle.gradePreuve,
        formePrefereeCode: regle.formePreferee?.code ?? null,
      });
      parIngredient.set(code, liste);

      const sources = sourcesParIngredient.get(code) ?? [];
      if (!sources.some((s) => s.id === regle.source.id)) sources.push(regle.source);
      sourcesParIngredient.set(code, sources);
    }
  }
  return { parIngredient, sourcesParIngredient };
}

// ─── Calcul des dimensions (déterministe, sourcé, jamais agrégé) ─────────────

function calculerBiodisponibilite(
  composition: LigneComposition[],
  vue: VueIntentions,
): DimensionsFiche['biodisponibiliteForme'] {
  const valeurs: BiodisponibiliteParIngredient[] = [];
  for (const ligne of composition) {
    const reglesIngredient = vue.parIngredient.get(ligne.ingredient.code);
    const formeFiche = ligne.forme?.code ?? null;
    if (!reglesIngredient || reglesIngredient.length === 0) {
      valeurs.push({ ingredientCode: ligne.ingredient.code, valeur: 'non_evaluee', formeFiche, formePreferee: null });
      continue;
    }
    // La forme préférée gouvernée vient des règles de l'ingrédient (§5).
    const formePreferee = reglesIngredient.map((r) => r.formePrefereeCode).find((c) => c !== null) ?? null;
    let valeur: ValeurBiodisponibilite;
    if (formeFiche === null) valeur = 'non_evaluee';
    else if (formePreferee === null) valeur = 'acceptable';
    else if (formeFiche === formePreferee) valeur = 'forme_preferee';
    else valeur = 'non_preferee';
    valeurs.push({ ingredientCode: ligne.ingredient.code, valeur, formeFiche, formePreferee });
  }
  const valeursPresentes = [...new Set(valeurs.map((v) => v.valeur))];
  return {
    valeurs,
    valeursPresentes,
    justification:
      valeurs.length === 0
        ? 'Aucune composition connue : biodisponibilité non évaluable.'
        : 'Comparaison, ingrédient par ingrédient, de la forme de la fiche à la forme préférée des règles cliniques. Jamais fondue en une note unique.',
  };
}

function calculerGrades(composition: LigneComposition[], vue: VueIntentions): DimensionsFiche['gradePreuveParIntention'] {
  const codes = new Set(composition.map((c) => c.ingredient.code));
  const valeurs: GradeParIntention[] = [];
  for (const [ingredientCode, regles] of vue.parIngredient) {
    if (!codes.has(ingredientCode)) continue;
    for (const regle of regles) {
      valeurs.push({
        intentionCode: regle.intentionCode,
        intentionLabelFr: regle.intentionLabelFr,
        ingredientCode,
        grade: regle.grade,
        gradeLabel: labelGradePreuve(regle.grade),
      });
    }
  }
  return {
    valeurs,
    justification:
      valeurs.length === 0
        ? 'Aucune intention sélectionnée, ou aucune règle validée pour cette composition : grade de preuve non applicable.'
        : 'Grade de preuve (échelle GRADE : fort / modéré / faible / usage traditionnel), listé par intention et par ingrédient — jamais moyenné.',
  };
}

function calculerInteractions(
  composition: LigneComposition[],
  seuilsParIngredient: Map<string, SeuilInteraction[]>,
  ingredientCodeParId: Map<string, string>,
): DimensionsFiche['interactionsSignalees'] {
  const codesFiche = new Set(composition.map((c) => c.ingredient.id));
  const signalements: SignalementInteraction[] = [];
  let couvert = false;
  for (const ingredientId of codesFiche) {
    const seuils = seuilsParIngredient.get(ingredientId);
    if (seuils && seuils.length > 0) couvert = true;
    for (const seuil of seuils ?? []) {
      if (seuil.basculeRisque && seuil.safetyAlert) {
        signalements.push({
          code: seuil.safetyAlert.code,
          messageFr: seuil.safetyAlert.messageFr,
          niveauAlerte: seuil.safetyAlert.niveauAlerte,
          ingredientCode: ingredientCodeParId.get(ingredientId) ?? ingredientId,
        });
      }
    }
  }
  const mentionMedecin = 'À discuter avec le médecin traitant — signalement, jamais une décision automatique.';
  if (signalements.length > 0) {
    return {
      valeur: 'signalees',
      signalements,
      mentionMedecin,
      justification: `${signalements.length} signalement(s) d'interaction issus des alertes de sécurité liées aux ingrédients.`,
    };
  }
  if (couvert) {
    return {
      valeur: 'aucune_connue',
      signalements: [],
      mentionMedecin,
      justification: 'Aucune alerte de sécurité active connue sur les ingrédients de cette fiche (absence de connaissance, pas garantie d\'innocuité).',
    };
  }
  return {
    valeur: 'non_evaluee',
    signalements: [],
    mentionMedecin,
    justification: 'Aucun seuil fonctionnel renseigné pour ces ingrédients : interactions non évaluées.',
  };
}

function calculerCumul(
  composition: LigneComposition[],
  candidats: CandidatProtocolReviewFlag[] | null,
): DimensionsFiche['cumulVsSeuils'] {
  if (candidats === null) {
    return {
      valeur: 'non_evaluee',
      signaux: [],
      justification: 'Aucune sélection d\'intentions ouverte : cumuls et seuils non évalués.',
    };
  }
  const codesFiche = new Set(composition.map((c) => c.ingredient.code));
  const signaux = candidats.filter((candidat) =>
    candidat.ingredientsConcernes.some((code) => codesFiche.has(code)),
  );
  if (signaux.length === 0) {
    return {
      valeur: 'aucun',
      signaux: [],
      justification: 'Aucun cumul ni dépassement de seuil signalé par la sentinelle pour les ingrédients de cette fiche. Jamais de somme automatique.',
    };
  }
  return {
    valeur: 'signale',
    signaux,
    justification: `${signaux.length} signal(aux) de la sentinelle touchant cette fiche — doses exposées telles quelles, le praticien arbitre.`,
  };
}

// ─── Complétude de composition ──────────────────────────────────────────────

/**
 * Lit ce que l'on sait de la composition d'une fiche.
 *
 * `integre` exige une PREUVE POSITIVE que toutes les lignes actives de la
 * source ont été résolues — le nombre de lignes attendu, à comparer au nombre
 * de lignes écrites. La colonne qui la porte, `composition_source_lignes` sur
 * `supplement_products`, existe depuis 20260731200000 ; **rien ne l'écrit
 * encore**, elle vaut donc NULL sur les 140 148 fiches et toute fiche portant
 * des compositions reste `partielle`.
 *
 * C'est fail-closed, et c'est le sens correct de l'erreur : une fiche partielle
 * traitée comme intègre rend un feu vert infondé, quand l'inverse ne fait que
 * s'abstenir.
 *
 * UN COMPTE ATTENDU ≤ 0 NE PROUVE RIEN. `0 lignes attendues` comparé à
 * `n ≥ 1 résolues` satisferait `n >= attendues` et déclarerait intègre une
 * fiche dont on ne sait rien — le CHECK en base interdit le négatif, mais rien
 * n'interdit le zéro, qui est une valeur légitime (406 fiches de la source ne
 * déclarent aucun actif). Un compte nul ou négatif est donc traité comme une
 * absence de preuve, pas comme une preuve d'exhaustivité. Le jour où `integre`
 * deviendra atteignable, ce sera par une preuve, jamais par un trou.
 */
export function lireCompletudeComposition(
  nombreLignesResolues: number,
  lignesSourceAttendues: number | null,
): CompletudeComposition {
  if (nombreLignesResolues === 0) return 'absente';
  if (
    lignesSourceAttendues !== null &&
    lignesSourceAttendues > 0 &&
    nombreLignesResolues >= lignesSourceAttendues
  ) {
    return 'integre';
  }
  return 'partielle';
}

const RAISON_COMPLETUDE: Record<Exclude<CompletudeComposition, 'integre'>, string> = {
  absente: 'Composition inconnue pour cette fiche',
  partielle: 'Composition partiellement résolue : les ingrédients non résolus restent invisibles',
};

const MENTION_LISTE_PARTIELLE =
  ' Liste établie sur une composition partiellement résolue : elle est incomplète.';

/**
 * Applique la complétude aux dimensions qui se lisent par INTERSECTION avec la
 * composition. Point de conception du lot, et seul endroit où la règle vit.
 *
 * L'asymétrie est délibérée : **un signal trouvé reste un signal**, même sur une
 * composition incomplète — le taire masquerait un risque réel, et un positif ne
 * dépend pas de ce qu'on ignore. **Une absence de signal, elle, ne vaut rien**
 * tant que la composition n'est pas intègre : c'est l'ignorance qui produit
 * l'intersection vide, jamais l'absence de conflit. Non renseigné n'est pas
 * zéro (leçon Q_ALI_01), et l'absence de signal ne vaut pas absence de risque.
 *
 * Sur `integre`, identité — les calculateurs font foi.
 */
export function appliquerCompletude(
  dimensions: DimensionsFiche,
  completude: CompletudeComposition,
): DimensionsFiche {
  if (completude === 'integre') return dimensions;
  const raison = RAISON_COMPLETUDE[completude];

  // Cumul vs seuils — « signale » survit, « aucun » s'abstient.
  const cumulVsSeuils: DimensionsFiche['cumulVsSeuils'] =
    dimensions.cumulVsSeuils.valeur === 'signale'
      ? dimensions.cumulVsSeuils
      : {
        valeur: 'non_evaluee',
        signaux: [],
        justification: `${raison} : cumuls et seuils ne sont pas évaluables. L'absence de signal ne vaut pas absence de risque.`,
      };

  // Compatibilité protocole — les deux lectures de vigilance survivent, seul le
  // feu vert « compatible » exige une composition intègre.
  const compatibiliteProtocole: DimensionsFiche['compatibiliteProtocole'] =
    dimensions.compatibiliteProtocole.valeur === 'vigilance_requise'
    || dimensions.compatibiliteProtocole.valeur === 'compatible_avec_vigilance'
      ? dimensions.compatibiliteProtocole
      : {
        valeur: 'non_evaluee',
        justification: `${raison} : la compatibilité protocole ne se lit que sur une composition connue.`,
      };

  // Interactions — « signalees » survit, « aucune_connue » s'abstient.
  const interactionsSignalees: DimensionsFiche['interactionsSignalees'] =
    dimensions.interactionsSignalees.valeur === 'signalees'
      ? dimensions.interactionsSignalees
      : {
        ...dimensions.interactionsSignalees,
        valeur: 'non_evaluee',
        signalements: [],
        justification: `${raison} : les interactions ne sont pas évaluables. L'absence de signal ne vaut pas absence de risque.`,
      };

  // Énumérations, pas des verdicts : la liste reste, mais elle est annoncée
  // incomplète. Sur « absente » les calculateurs disent déjà le vide.
  const marquerListe = <T extends { justification: string }>(bloc: T): T =>
    completude === 'partielle' ? { ...bloc, justification: bloc.justification + MENTION_LISTE_PARTIELLE } : bloc;

  return {
    ...dimensions,
    biodisponibiliteForme: marquerListe(dimensions.biodisponibiliteForme),
    gradePreuveParIntention: marquerListe(dimensions.gradePreuveParIntention),
    compatibiliteProtocole,
    interactionsSignalees,
    cumulVsSeuils,
  };
}

function calculerDonneesManquantes(donnees: string[]): DimensionsFiche['donneesManquantes'] {
  if (donnees.length === 0) {
    return {
      valeur: 'aucune',
      elements: [],
      justification: 'La fiche ne déclare aucune donnée manquante.',
    };
  }
  return {
    valeur: 'liste_explicite',
    elements: donnees,
    justification: 'Liste explicite des données manquantes déclarées par la fiche (abstention honnête, jamais complétée d\'office).',
  };
}

function comparerTexte(a: string, b: string): number {
  return a.localeCompare(b, 'fr');
}

// ─── Facettes INDÉPENDANTES, exprimées en base ──────────────────────────────
// Chaque facette est un test d'appartenance ; aucune ne pondère les autres.
// Intra-facette les valeurs se combinent en OU, les facettes entre elles en ET
// — sémantique identique à celle qui était calculée en mémoire, mais évaluée
// AVANT la pagination.

/** Le seuil qui rend une interaction « signalée » : actif, bascule, alerte. */
const SEUIL_SIGNALANT = { actif: true, basculeRisque: true, safetyAlertId: { not: null } } as const;
const SEUIL_ACTIF = { actif: true } as const;

function porteUnSeuil(seuil: Prisma.IngredientFunctionalThresholdWhereInput): Prisma.SupplementProductWhereInput {
  return { compositions: { some: { ingredient: { functionalThresholds: { some: seuil } } } } };
}

function neePorteAucunSeuil(
  seuil: Prisma.IngredientFunctionalThresholdWhereInput,
): Prisma.SupplementProductWhereInput {
  return { compositions: { none: { ingredient: { functionalThresholds: { some: seuil } } } } };
}

/**
 * Traduit une valeur de facette en prédicat. `null` = valeur qu'aucune fiche ne
 * peut porter (le calcul en mémoire ne la produit jamais) : elle n'ajoute pas
 * un prédicat toujours vrai, elle retire simplement une branche du OU.
 */
function predicatFacette(cle: CleFacetteServie, valeur: string): Prisma.SupplementProductWhereInput | null {
  switch (cle) {
    case 'qualite':
      return { niveauCompletude: valeur };
    case 'statut':
      return { statutFiche: valeur };
    case 'donneesManquantes':
      if (valeur === 'aucune') return { donneesManquantes: { isEmpty: true } };
      if (valeur === 'liste_explicite') return { donneesManquantes: { isEmpty: false } };
      // « non_evaluee » : calculerDonneesManquantes ne la produit jamais.
      return null;
    case 'interactions':
      if (valeur === 'signalees') return porteUnSeuil(SEUIL_SIGNALANT);
      if (valeur === 'aucune_connue') {
        // Refusée en amont (VALEURS_FACETTE_INDISPONIBLES). Le prédicat « un
        // seuil actif existe, aucun ne bascule avec alerte » est FAUX sur une
        // fiche partiellement résolue. Levée plutôt que silence : rouvrir cette
        // valeur en phase 1b impose de la conjoindre à la preuve de complétude,
        // et rien ici ne doit laisser croire que le prédicat actuel suffit.
        throw new CatalogueRequeteInvalide('valeur_facette_indisponible', MESSAGE_VALEUR_INDISPONIBLE);
      }
      // « non_evaluee » : aucun ingrédient de la fiche ne porte de seuil actif.
      // Sain même sur une fiche partielle — c'est déjà l'abstention.
      return neePorteAucunSeuil(SEUIL_ACTIF);
  }
}

/**
 * Neutralise les jokers de `ILIKE` saisis par le praticien. Sans cela, chercher
 * « B_12 » remonte aussi « B-12 » et « B912 », et « 100% » remonte tout ce qui
 * commence par « 100 » : le champ cherche autre chose que ce qui y est écrit.
 * L'antislash est l'échappement par défaut de `LIKE` en PostgreSQL — il se
 * neutralise donc lui-même en premier.
 */
function echapperJokers(saisie: string): string {
  return saisie.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Construit le `where` complet. Rend `null` quand une facette sélectionnée ne
 * retient AUCUNE valeur satisfiable : le résultat est alors vide par
 * construction, sans interroger la base — jamais un filtre silencieusement
 * ignoré (qui servirait tout le catalogue).
 */
function construireWhere(
  filtres: FiltresCatalogue,
  recherche: string,
): Prisma.SupplementProductWhereInput | null {
  const conditions: Prisma.SupplementProductWhereInput[] = [
    // Le pointeur de version courante EST la source des fiches servies.
    { versionCourante: { isNot: null } },
    { statutFiche: { not: 'inactive' } },
  ];

  if (recherche) {
    const motif = echapperJokers(recherche);
    conditions.push({
      OR: [
        { nomCommercial: { contains: motif, mode: 'insensitive' } },
        { marque: { contains: motif, mode: 'insensitive' } },
      ],
    });
  }

  for (const cle of FACETTES_SERVIES) {
    const selection = filtres[cle];
    if (!selection || selection.length === 0) continue;
    const branches = selection
      .map((valeur) => predicatFacette(cle, valeur))
      .filter((p): p is Prisma.SupplementProductWhereInput => p !== null);
    if (branches.length === 0) return null;
    conditions.push(branches.length === 1 ? branches[0] : { OR: branches });
  }

  return { AND: conditions };
}

// ─── Tri mono-dimension (ordre neutre par défaut) ───────────────────────────
// Toujours départagé par l'identifiant : sans clé totale, deux pages
// successives peuvent réafficher ou sauter une fiche.

function construireOrderBy(tri: CleTri): Prisma.SupplementProductOrderByWithRelationInput[] {
  switch (tri) {
    case 'marque':
      return [{ marque: 'asc' }, { nomCommercial: 'asc' }, { id: 'asc' }];
    case 'statut':
      return [{ statutFiche: 'asc' }, { nomCommercial: 'asc' }, { id: 'asc' }];
    case 'fraicheur':
      // Plus récent d'abord ; une fiche sans date de vérification passe en fin.
      return [
        { dateDerniereVerification: { sort: 'desc', nulls: 'last' } },
        { nomCommercial: 'asc' },
        { id: 'asc' },
      ];
    case 'neutre':
    default:
      return [{ nomCommercial: 'asc' }, { id: 'asc' }];
  }
}

// ─── Point d'entrée ─────────────────────────────────────────────────────────

function resultatVide(params: {
  tri: CleTri;
  recherche: string;
  page: number;
  parPage: number;
  intentionFiltre: { code: string; labelFr: string } | null;
  codesInconnus: string[];
}): CatalogueResult {
  return {
    contractVersion: C4_CATALOGUE_VERSION,
    aucunScoreGlobal: true,
    intentionFiltre: params.intentionFiltre,
    codesInconnus: params.codesInconnus,
    tri: params.tri,
    recherche: params.recherche,
    page: params.page,
    parPage: params.parPage,
    total: 0,
    fiches: [],
    facettes: FACETTES,
    facettesServies: FACETTES_SERVIES,
    facettesIndisponibles: FACETTES_INDISPONIBLES,
  };
}

export async function listerCatalogue(options: OptionsCatalogue = {}): Promise<CatalogueResult> {
  if (!isC4Enabled()) {
    throw new Error(
      'Rayon compléments désactivé : WN_C4_ENABLED doit valoir « true » (fail-closed).',
    );
  }

  const tri: CleTri = options.tri && TRIS.includes(options.tri) ? options.tri : 'neutre';
  const filtres = options.filtres ?? {};
  const intentionCode = options.intentionCode?.trim() || null;
  const recherche = (options.recherche ?? '').trim().slice(0, RECHERCHE_MAX);

  // Valeur de facette non fiable : refus AVANT toute requête, y compris avant
  // la résolution d'intention. Refuser, jamais ignorer (précédent #482) : un
  // critère silencieusement écarté rendrait des fiches hors critère en laissant
  // croire qu'il s'était appliqué.
  for (const [cle, interdites] of Object.entries(VALEURS_FACETTE_INDISPONIBLES)) {
    const selection = filtres[cle as CleFacetteServie];
    if (selection?.some((valeur) => interdites.includes(valeur))) {
      throw new CatalogueRequeteInvalide('valeur_facette_indisponible', MESSAGE_VALEUR_INDISPONIBLE);
    }
  }

  const parPage = Math.max(1, Math.min(Math.trunc(options.parPage ?? PAR_PAGE_DEFAUT), PAR_PAGE_MAX));
  const page = Math.max(1, Math.trunc(options.page ?? 1));
  const offset = (page - 1) * parPage;
  if (offset > OFFSET_MAX) {
    throw new CatalogueRequeteInvalide(
      'offset_trop_loin',
      'Cette page est trop loin dans le catalogue — affinez la recherche.',
    );
  }

  // Entrée par intention clinique : résolution une fois, partagée par toutes
  // les fiches (grades, forme préférée, sentinelle). Aucune intention → aucune
  // dimension dépendante du protocole n'est inventée (« non_evaluee » honnête).
  let resolution: ResolutionIntentions | null = null;
  let candidatsSentinelle: CandidatProtocolReviewFlag[] | null = null;
  let intentionFiltre: { code: string; labelFr: string } | null = null;
  const codesInconnus: string[] = [];
  if (intentionCode) {
    resolution = await resoudreIntentions([intentionCode]);
    const trouvee = resolution.intentions[0]?.intention ?? null;
    intentionFiltre = trouvee ? { code: trouvee.code, labelFr: trouvee.labelFr } : null;
    codesInconnus.push(...resolution.codesInconnus);
    // Une intention NON RÉSOLUE n'ouvre aucune lecture : sans elle, la
    // sentinelle rend une liste vide, que les dimensions liraient comme
    // « aucun signal » — soit un feu vert tiré d'un code saisi au hasard.
    if (trouvee) candidatsSentinelle = await evaluerSentinelle(resolution);
  }
  const vue = projeterResolution(resolution);

  const where = construireWhere(filtres, recherche);
  // Facette dont aucune valeur n'est satisfiable : résultat vide PAR
  // CONSTRUCTION, sans requête. Ne jamais retomber sur un where absent, qui
  // servirait le catalogue entier.
  if (where === null) {
    return resultatVide({ tri, recherche, page, parPage, intentionFiltre, codesInconnus });
  }

  // Sélection, tri, comptage et pagination en base : seule la page traverse
  // ensuite le calcul des dimensions.
  const [total, produits] = await Promise.all([
    prisma.supplementProduct.count({ where }),
    prisma.supplementProduct.findMany({
      where,
      orderBy: construireOrderBy(tri),
      skip: offset,
      take: parPage,
      select: {
        id: true,
        nomCommercial: true,
        marque: true,
        marche: true,
        sourceProvenance: true,
        sourceIdentifiant: true,
        sourceUrl: true,
        dateDerniereVerification: true,
        statutFiche: true,
        niveauCompletude: true,
        donneesManquantes: true,
        compositionSourceLignes: true,
        versionFormulation: true,
        compositions: {
          orderBy: { position: 'asc' },
          select: {
            doseParDjr: true,
            unite: true,
            position: true,
            ingredient: { select: { id: true, code: true, nomFr: true } },
            forme: { select: { id: true, code: true, labelFr: true } },
          },
        },
      },
    }),
  ]);

  const fichesActives = (produits as LigneFiche['product'][]).map((product) => ({
    productId: product.id,
    product,
  }));

  // Seuils fonctionnels des ingrédients présents — pour les interactions
  // (signalement) au niveau fiche, indépendamment de toute intention.
  const ingredientIds = [
    ...new Set(fichesActives.flatMap((l) => l.product.compositions.map((c) => c.ingredient.id))),
  ];
  const ingredientCodeParId = new Map<string, string>();
  for (const ligne of fichesActives) {
    for (const c of ligne.product.compositions) ingredientCodeParId.set(c.ingredient.id, c.ingredient.code);
  }
  const seuilsParIngredient = new Map<string, SeuilInteraction[]>();
  if (ingredientIds.length > 0) {
    const seuils = (await prisma.ingredientFunctionalThreshold.findMany({
      where: { ingredientId: { in: ingredientIds }, actif: true },
      select: {
        ingredientId: true,
        basculeRisque: true,
        safetyAlert: { select: { code: true, messageFr: true, niveauAlerte: true } },
        sourceReference: { select: { id: true, citation: true, lienUrl: true } },
      },
    })) as SeuilInteraction[];
    for (const seuil of seuils) {
      const liste = seuilsParIngredient.get(seuil.ingredientId) ?? [];
      liste.push(seuil);
      seuilsParIngredient.set(seuil.ingredientId, liste);
    }
  }

  const fiches: FicheComplement[] = fichesActives.map((ligne) => {
    const p = ligne.product;
    const composition: CompositionFiche[] = p.compositions.map((c) => ({
      ingredientCode: c.ingredient.code,
      ingredientNomFr: c.ingredient.nomFr,
      formeCode: c.forme?.code ?? null,
      formeLabelFr: c.forme?.labelFr ?? null,
      doseParDjr: c.doseParDjr,
      unite: c.unite,
    }));

    // Ce que l'on sait de la composition gouverne ce que l'on ose en dire.
    // `compositionSourceLignes` est NULL sur les 140 148 fiches — rien ne
    // l'écrit encore — donc toute fiche portant des compositions reste
    // « partielle ». La colonne est câblée ici pour que son remplissage soit un
    // geste de DONNÉE, sans retoucher ce chemin de lecture clinique.
    const completudeComposition = lireCompletudeComposition(
      p.compositions.length,
      p.compositionSourceLignes,
    );

    const qualiteValeur = QUALITE_PAR_COMPLETUDE[p.niveauCompletude] ?? 'non_evaluee';
    const biodisponibiliteForme = calculerBiodisponibilite(p.compositions, vue);
    const gradePreuveParIntention = calculerGrades(p.compositions, vue);
    const interactionsSignalees = calculerInteractions(p.compositions, seuilsParIngredient, ingredientCodeParId);
    const cumulVsSeuils = calculerCumul(p.compositions, candidatsSentinelle);
    const donneesManquantes = calculerDonneesManquantes(p.donneesManquantes ?? []);

    // Compatibilité protocole : lecture RÉUTILISÉE de construireTableauCompatibilite,
    // alimentée par les signaux de la sentinelle touchant CETTE fiche. Le
    // filtrage par complétude n'est PAS fait ici : il est centralisé dans
    // appliquerCompletude, seul endroit où vit l'asymétrie.
    const candidatsFiche = candidatsSentinelle === null
      ? null
      : candidatsSentinelle.filter((candidat) =>
        candidat.ingredientsConcernes.some((code) => composition.some((c) => c.ingredientCode === code)));
    const tableau = construireTableauCompatibilite({ candidatsSentinelle: candidatsFiche });

    // Références scientifiques de la fiche = citations des règles validées de
    // ses ingrédients + sources des seuils fonctionnels (dédupliquées).
    const refMap = new Map<string, ReferenceScientifique>();
    for (const c of composition) {
      for (const src of vue.sourcesParIngredient.get(c.ingredientCode) ?? []) refMap.set(src.id, src);
    }
    for (const c of p.compositions) {
      for (const seuil of seuilsParIngredient.get(c.ingredient.id) ?? []) {
        refMap.set(seuil.sourceReference.id, seuil.sourceReference);
      }
    }

    const reglesCorrespondantes = composition.reduce(
      (n, c) => n + (vue.parIngredient.get(c.ingredientCode)?.length ?? 0),
      0,
    );

    const dimensionsBrutes: DimensionsFiche = {
      qualiteFormulation: {
        valeur: qualiteValeur,
        justification:
          qualiteValeur === 'non_evaluee'
            ? 'Niveau de complétude inconnu : qualité de formulation non évaluée.'
            : 'Qualité de formulation lue du niveau de complétude déclaré de la fiche (formes, excipients, additifs).',
      },
      biodisponibiliteForme,
      gradePreuveParIntention,
      compatibiliteProtocole: tableau.compatibiliteProtocole,
      interactionsSignalees,
      cumulVsSeuils,
      donneesManquantes,
      fraicheurProvenance: {
        provenance: p.sourceProvenance,
        identifiantSource: p.sourceIdentifiant,
        urlSource: p.sourceUrl,
        dateDerniereVerification: p.dateDerniereVerification ? p.dateDerniereVerification.toISOString() : null,
        versionFormulation: p.versionFormulation,
        statutFiche: p.statutFiche,
        statutLabel: statutLabel(p.statutFiche),
        justification: 'Provenance, date de dernière vérification, version de formulation et statut — affichés sans fard (décision n°11 : une source externe reste un brouillon jusqu\'à vérification praticien).',
      },
    };

    return {
      produitId: p.id,
      nomCommercial: p.nomCommercial,
      marque: p.marque,
      marche: p.marche,
      statutFiche: p.statutFiche,
      statutLabel: statutLabel(p.statutFiche),
      composition,
      completudeComposition,
      dimensions: appliquerCompletude(dimensionsBrutes, completudeComposition),
      reglesCorrespondantes,
      referencesScientifiques: [...refMap.values()].sort((a, b) => comparerTexte(a.citation, b.citation)),
    };
  });

  // Les fiches arrivent déjà filtrées et triées par la base : aucun filtre, ni
  // aucun tri, ne s'applique ici — il porterait sur la page seule et rendrait
  // le total incohérent avec ce qui est affiché.
  return {
    contractVersion: C4_CATALOGUE_VERSION,
    aucunScoreGlobal: true,
    intentionFiltre,
    codesInconnus,
    tri,
    recherche,
    page,
    parPage,
    total,
    fiches,
    facettes: FACETTES,
    facettesServies: FACETTES_SERVIES,
    facettesIndisponibles: FACETTES_INDISPONIBLES,
  };
}
