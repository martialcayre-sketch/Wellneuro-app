/**
 * LES DEUX BIOMARQUEURS DU BESOIN 1 — deux constats séparés, au cockpit seulement,
 * hors couverture (J3-12f, vague 1 : [[D-548]] §2.2, [[D-516]] §2.2, §3 et §5.2 à §5.3).
 *
 * TROIS CONSTATS SÉPARÉS. L'enquête alimentaire, l'HbA1c et l'index oméga-3 se
 * lisent chacun à part, avec ses sources et ses limites. Aucune règle ne les
 * relie, aucun poids sourcé ne les combine à l'enquête : ils ne modifient PAS la
 * couverture du besoin 1 ([[D-516]] §5.2). Deux résultats qui diffèrent ne font
 * pas d'office une discordance (`DC-30`). Le besoin 1 ne pose aucun diagnostic : il
 * rapporte la valeur et sa source.
 *
 * LE TROISIÈME BIOMARQUEUR N'EST PAS LU ([[D-516]] §5.3) : l'indice HOMA est « non
 * évalué », aucune source d'autorité n'en fonde un seuil individuel. Ce module ne
 * nomme que les deux analytes lus ; `constatsBiomarqueursBesoin1.test.ts`
 * fige que l'analyte HOMA n'y figure pas et qu'aucun code ne le lit pour le
 * besoin 1.
 *
 * AUCUN TEXTE DE CLAIM ([[D-251]] §4) : des nombres, des identifiants et des
 * renvois à des décisions. Les phrases servies sont des textes de l'application,
 * À VALIDER PAR LE RESPONSABLE AU LOT ([[D-516]] §5.2).
 *
 * MODULE-FEUILLE : il n'importe rien.
 */

export const ANALYTE_HBA1C = 'BIO_HBA1C';
export const ANALYTE_INDEX_OMEGA3 = 'BIO_INDEX_OMEGA3';
/** Le troisième biomarqueur du guide : NON LU, nommé ici pour qu'un banc le garde. */
export const ANALYTE_HOMA_NON_LU = 'BIO_RATIO_HOMA';

/** Les deux seuls analytes que le besoin 1 lit. */
export const ANALYTES_LUS_BESOIN_1 = [ANALYTE_HBA1C, ANALYTE_INDEX_OMEGA3] as const;

/** HbA1c — la valeur de référence signée ([[D-516]] §3.2, position signée P9). */
export const REFERENCE_HBA1C = {
  valeur: 6.5,
  unite: '%',
  /** Le seuil recommandé pour diagnostiquer un diabète (OMS 2011) — externe. */
  claimReference: 'WN-CL-0654-001',
  /** Sous la valeur, aucune interprétation. */
  claimSousReference: 'WN-CL-0654-002',
  /** Dosage standardisé, sous contrôle de qualité, sans condition qui fausse la mesure. */
  claimPreanalytique: 'WN-CL-0654-003',
  /** Diagnostic : au moins un second résultat. */
  claimSecondResultat: 'WN-CL-0654-004',
} as const;

/** Index oméga-3 — le repère signé ([[D-516]] §3.2, positions signées P10 et P18). */
export const REPERE_INDEX_OMEGA3 = {
  valeur: 8,
  unite: '%',
  /** Définition de l'index. */
  claimsDefinition: ['WN-CL-0045-008', 'WN-CL-0655-001', 'WN-CL-0656-001'],
  /** Le repère du corpus interne (niveau interne). */
  claimsRepereInterne: ['WN-CL-0045-009', 'WN-CL-0045-010', 'WN-CL-0125-041', 'WN-CL-0294-004', 'WN-CL-0390-011'],
  /** La publication primaire : elle appuie le chiffre, pas son interprétation neuropsychique. */
  claimPublicationPrimaire: 'WN-CL-0655-002',
  /** La publication primaire présente l'index comme une proposition. */
  claimProposition: 'WN-CL-0655-003',
  /** Le calcul de l'index peut varier d'un laboratoire à l'autre. */
  claimVariationLaboratoire: 'WN-CL-0656-002',
} as const;

/** Tous les claims que ce module cite — pour le banc d'existence et de rôle. */
export function claimsCitesParLesConstats(): string[] {
  const h = REFERENCE_HBA1C;
  const o = REPERE_INDEX_OMEGA3;
  return [
    h.claimReference,
    h.claimSousReference,
    h.claimPreanalytique,
    h.claimSecondResultat,
    ...o.claimsDefinition,
    ...o.claimsRepereInterne,
    o.claimPublicationPrimaire,
    o.claimProposition,
    o.claimVariationLaboratoire,
  ];
}

/** La population de lecture, affichée avec les constats ([[D-516]] §5.6). */
export const POPULATION_BESOIN_1 = {
  decision: 'D-516',
  sections: '§4 et §5.6',
};

export type LectureBiomarqueur = 'sous_reference' | 'egale_reference' | 'au_dessus_reference' | 'unite_non_reconnue';

export type ResultatLu = { valeur: string; unite: string | null; preleveLe: string };

export type ConstatBiomarqueur = {
  analyteCode: string;
  libelle: string;
  /** La valeur de la base, telle quelle, sans arrondi ni conversion. */
  valeur: string;
  unite: string | null;
  preleveLe: string;
  reference: number;
  lecture: LectureBiomarqueur;
  /** Phrases à afficher — textes de l'application, à valider par le responsable. */
  lignes: string[];
  /** Les claims qui portent le constat, pour la provenance affichée. */
  claims: string[];
};

const uniteEstPourcent = (unite: string | null): boolean => (unite ?? '').replace(/\s+/g, '') === '%';

function lireContreReference(valeur: string, unite: string | null, reference: number): LectureBiomarqueur {
  const n = Number(valeur.replace(',', '.'));
  // Une unité qui n'est pas celle de la référence, ou une valeur illisible : AUCUNE
  // lecture — jamais une conversion inventée (`DC-19`).
  if (!uniteEstPourcent(unite) || !Number.isFinite(n)) return 'unite_non_reconnue';
  if (n < reference) return 'sous_reference';
  if (n === reference) return 'egale_reference';
  return 'au_dessus_reference';
}

const formatNombre = (n: number): string => String(n).replace('.', ',');

/** Le constat de l'HbA1c ; `null` quand aucun résultat ne fait foi. */
export function constatHba1c(dernier: ResultatLu | null): ConstatBiomarqueur | null {
  if (!dernier) return null;
  const r = REFERENCE_HBA1C;
  const lecture = lireContreReference(dernier.valeur, dernier.unite, r.valeur);
  const ref = `${formatNombre(r.valeur)} ${r.unite}`;
  const lignes: string[] = [];
  if (lecture === 'unite_non_reconnue') {
    lignes.push(`Unité non reconnue : aucune lecture contre la valeur de référence de ${ref}.`);
  } else if (lecture === 'sous_reference') {
    // Sous la valeur de référence, aucune interprétation n'est donnée.
    lignes.push(`Valeur de référence : ${ref}. Sous cette valeur, aucune interprétation n'est donnée.`);
  } else {
    lignes.push(
      `Valeur de référence : ${ref}, seuil recommandé pour diagnostiquer un diabète. Ce besoin ne pose aucun diagnostic : un second résultat est nécessaire chez une personne asymptomatique.`,
    );
  }
  lignes.push('La valeur ne se lit que sur un dosage standardisé, sous contrôle de qualité.');
  return {
    analyteCode: ANALYTE_HBA1C,
    libelle: 'HbA1c',
    valeur: dernier.valeur,
    unite: dernier.unite,
    preleveLe: dernier.preleveLe,
    reference: r.valeur,
    lecture,
    lignes,
    claims: [r.claimReference, r.claimSousReference, r.claimPreanalytique, r.claimSecondResultat],
  };
}

/** Le constat de l'index oméga-3 ; `null` quand aucun résultat ne fait foi. */
export function constatIndexOmega3(dernier: ResultatLu | null): ConstatBiomarqueur | null {
  if (!dernier) return null;
  const r = REPERE_INDEX_OMEGA3;
  const lecture = lireContreReference(dernier.valeur, dernier.unite, r.valeur);
  const repere = `${formatNombre(r.valeur)} ${r.unite}`;
  const lignes: string[] = [];
  if (lecture === 'unite_non_reconnue') {
    lignes.push(`Unité non reconnue : aucune lecture contre le repère de ${repere}.`);
  } else {
    // Valeur égale au repère : les claims disent « supérieur à » et « inférieur
    // à », la publication primaire « supérieur ou égal » — la valeur égale n'est
    // donc rangée ni au-dessus ni en dessous.
    const position =
      lecture === 'sous_reference' ? 'inférieure au' : lecture === 'au_dessus_reference' ? 'supérieure au' : 'égale au';
    lignes.push(`Valeur ${position} repère de ${repere} (niveau interne).`);
  }
  lignes.push(
    'La publication primaire appuie le chiffre du repère, non son interprétation neuropsychique ; elle le présente comme une proposition, sur un critère coronarien.',
  );
  lignes.push("Le calcul de l'index peut varier d'un laboratoire à l'autre.");
  return {
    analyteCode: ANALYTE_INDEX_OMEGA3,
    libelle: 'Index oméga-3',
    valeur: dernier.valeur,
    unite: dernier.unite,
    preleveLe: dernier.preleveLe,
    reference: r.valeur,
    lecture,
    lignes,
    claims: [...r.claimsRepereInterne, r.claimPublicationPrimaire, r.claimProposition, r.claimVariationLaboratoire],
  };
}

/**
 * Les constats du besoin 1, à partir du dernier résultat qui fait foi de chaque
 * analyte lu. Deux constats SÉPARÉS : aucun n'agrège l'autre, aucun ne lit
 * l'enquête.
 */
export function constatsBiomarqueursBesoin1(
  derniers: ReadonlyMap<string, ResultatLu>,
): ConstatBiomarqueur[] {
  return [constatHba1c(derniers.get(ANALYTE_HBA1C) ?? null), constatIndexOmega3(derniers.get(ANALYTE_INDEX_OMEGA3) ?? null)].filter(
    (c): c is ConstatBiomarqueur => c !== null,
  );
}
