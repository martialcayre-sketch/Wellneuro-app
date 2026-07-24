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

export const C4_CATALOGUE_VERSION = 'c4-catalogue-v1' as const;

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

export type CompositionFiche = {
  ingredientCode: string;
  ingredientNomFr: string;
  formeCode: string | null;
  formeLabelFr: string | null;
  doseParPortion: number | null;
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

// Tri MONO-DIMENSION explicite (§5). L'ordre par défaut est NEUTRE
// (alphabétique par nom commercial) — jamais un tri « meilleur produit ».
export const TRIS = ['neutre', 'marque', 'statut', 'fraicheur', 'reglesCorrespondantes'] as const;
export type CleTri = (typeof TRIS)[number];

export type FiltresCatalogue = {
  qualite?: ValeurQualiteFormulation[];
  biodisponibilite?: ValeurBiodisponibilite[];
  grade?: GradePreuveScientifique[];
  compatibilite?: ValeurCompatibiliteProtocole[];
  interactions?: ValeurInteractions[];
  cumul?: ValeurCumul[];
  donneesManquantes?: ValeurDonneesManquantes[];
  statut?: string[];
};

export type OptionsCatalogue = {
  intentionCode?: string | null;
  filtres?: FiltresCatalogue;
  tri?: CleTri;
};

export type CatalogueResult = {
  contractVersion: typeof C4_CATALOGUE_VERSION;
  // Marqueur de contrat : aucune sortie du catalogue n'agrège les dimensions.
  aucunScoreGlobal: true;
  intentionFiltre: { code: string; labelFr: string } | null;
  codesInconnus: string[];
  tri: CleTri;
  total: number;
  fiches: FicheComplement[];
  facettes: typeof FACETTES;
};

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
  doseParPortion: number | null;
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

// ─── Filtrage à FACETTES INDÉPENDANTES ──────────────────────────────────────
// Chaque facette est un test d'appartenance ; aucune ne pondère les autres.
// Une fiche passe une facette si l'une de ses valeurs pour cette dimension est
// sélectionnée (OU intra-facette) ; les facettes se combinent en ET.

function passeFacette<T>(selection: T[] | undefined, valeursFiche: T[]): boolean {
  if (!selection || selection.length === 0) return true;
  return valeursFiche.some((v) => selection.includes(v));
}

function fichePasseFiltres(fiche: FicheComplement, filtres: FiltresCatalogue): boolean {
  return (
    passeFacette(filtres.qualite, [fiche.dimensions.qualiteFormulation.valeur])
    && passeFacette(filtres.biodisponibilite, fiche.dimensions.biodisponibiliteForme.valeursPresentes)
    && passeFacette(filtres.grade, fiche.dimensions.gradePreuveParIntention.valeurs.map((v) => v.grade))
    && passeFacette(filtres.compatibilite, [fiche.dimensions.compatibiliteProtocole.valeur])
    && passeFacette(filtres.interactions, [fiche.dimensions.interactionsSignalees.valeur])
    && passeFacette(filtres.cumul, [fiche.dimensions.cumulVsSeuils.valeur])
    && passeFacette(filtres.donneesManquantes, [fiche.dimensions.donneesManquantes.valeur])
    && passeFacette(filtres.statut, [fiche.statutFiche])
  );
}

// ─── Tri mono-dimension (ordre neutre par défaut) ───────────────────────────

function comparerTexte(a: string, b: string): number {
  return a.localeCompare(b, 'fr');
}

function trierFiches(fiches: FicheComplement[], tri: CleTri): FicheComplement[] {
  const parNom = (a: FicheComplement, b: FicheComplement) =>
    comparerTexte(a.nomCommercial, b.nomCommercial) || comparerTexte(a.produitId, b.produitId);
  const copie = [...fiches];
  switch (tri) {
    case 'marque':
      return copie.sort((a, b) => comparerTexte(a.marque, b.marque) || parNom(a, b));
    case 'statut':
      return copie.sort((a, b) => comparerTexte(a.statutFiche, b.statutFiche) || parNom(a, b));
    case 'fraicheur':
      // Plus récent d'abord ; une fiche sans date de vérification passe en fin.
      return copie.sort((a, b) => {
        const da = a.dimensions.fraicheurProvenance.dateDerniereVerification;
        const db = b.dimensions.fraicheurProvenance.dateDerniereVerification;
        if (da && db) return db.localeCompare(da) || parNom(a, b);
        if (da) return -1;
        if (db) return 1;
        return parNom(a, b);
      });
    case 'reglesCorrespondantes':
      // Compteur factuel décroissant — clé de tri explicite choisie par le
      // praticien, jamais un tri « meilleur produit » par défaut.
      return copie.sort((a, b) => b.reglesCorrespondantes - a.reglesCorrespondantes || parNom(a, b));
    case 'neutre':
    default:
      return copie.sort(parNom);
  }
}

// ─── Point d'entrée ─────────────────────────────────────────────────────────

export async function listerCatalogue(options: OptionsCatalogue = {}): Promise<CatalogueResult> {
  if (!isC4Enabled()) {
    throw new Error(
      'Rayon compléments désactivé : WN_C4_ENABLED doit valoir « true » (fail-closed).',
    );
  }

  const tri: CleTri = options.tri && TRIS.includes(options.tri) ? options.tri : 'neutre';
  const filtres = options.filtres ?? {};
  const intentionCode = options.intentionCode?.trim() || null;

  // Entrée par intention clinique : résolution une fois, partagée par toutes
  // les fiches (grades, forme préférée, sentinelle). Aucune intention → aucune
  // dimension dépendante du protocole n'est inventée (« non_evaluee » honnête).
  let resolution: ResolutionIntentions | null = null;
  let candidatsSentinelle: CandidatProtocolReviewFlag[] | null = null;
  let intentionFiltre: { code: string; labelFr: string } | null = null;
  const codesInconnus: string[] = [];
  if (intentionCode) {
    resolution = await resoudreIntentions([intentionCode]);
    candidatsSentinelle = await evaluerSentinelle(resolution);
    const trouvee = resolution.intentions[0]?.intention ?? null;
    intentionFiltre = trouvee ? { code: trouvee.code, labelFr: trouvee.labelFr } : null;
    codesInconnus.push(...resolution.codesInconnus);
  }
  const vue = projeterResolution(resolution);

  // Le pointeur de version courante EST la source des fiches servies.
  const lignes = (await prisma.supplementProductVersionCourante.findMany({
    select: {
      productId: true,
      product: {
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
          versionFormulation: true,
          compositions: {
            orderBy: { position: 'asc' },
            select: {
              doseParPortion: true,
              unite: true,
              position: true,
              ingredient: { select: { id: true, code: true, nomFr: true } },
              forme: { select: { id: true, code: true, labelFr: true } },
            },
          },
        },
      },
    },
  })) as LigneFiche[];

  // Fiches inactives exclues ; catalogue vide géré proprement en amont.
  const fichesActives = lignes.filter((l) => l.product.statutFiche !== 'inactive');

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
      doseParPortion: c.doseParPortion,
      unite: c.unite,
    }));

    const qualiteValeur = QUALITE_PAR_COMPLETUDE[p.niveauCompletude] ?? 'non_evaluee';
    const biodisponibiliteForme = calculerBiodisponibilite(p.compositions, vue);
    const gradePreuveParIntention = calculerGrades(p.compositions, vue);
    const interactionsSignalees = calculerInteractions(p.compositions, seuilsParIngredient, ingredientCodeParId);
    const cumulVsSeuils = calculerCumul(p.compositions, candidatsSentinelle);
    const donneesManquantes = calculerDonneesManquantes(p.donneesManquantes ?? []);

    // Compatibilité protocole : lecture RÉUTILISÉE de construireTableauCompatibilite,
    // alimentée par les signaux de la sentinelle touchant CETTE fiche.
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

    const dimensions: DimensionsFiche = {
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
      dimensions,
      reglesCorrespondantes,
      referencesScientifiques: [...refMap.values()].sort((a, b) => comparerTexte(a.citation, b.citation)),
    };
  });

  const filtrees = fiches.filter((fiche) => fichePasseFiltres(fiche, filtres));
  const triees = trierFiches(filtrees, tri);

  return {
    contractVersion: C4_CATALOGUE_VERSION,
    aucunScoreGlobal: true,
    intentionFiltre,
    codesInconnus,
    tri,
    total: triees.length,
    fiches: triees,
    facettes: FACETTES,
  };
}
