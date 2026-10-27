// Compositions préparées pour signature (F80, D-323 §1) — module PUR : aucune
// lecture, aucune écriture. Une PROPOSITION, jamais une composition : rien
// d'ici n'entre en base sans la signature du praticien (route
// `biologie/compositions`), et rien d'ici ne compte pour la proposition, le
// courrier ou le remboursement, qui ne lisent que les compositions signées.
//
// Patron des candidats NABM (`candidatsNabm.ts`, M-3b) : l'assistant prépare,
// le praticien signe. Une composition dit DE QUELS ANALYTES une analyse est
// faite — constituants d'un groupe, opérandes d'un calcul —, jamais une
// formule ni une constante : l'application ne calcule rien, la valeur se lit
// sur le compte rendu.
//
// Ce qui fonde chaque liste, et seulement cela : le libellé de l'acte de la
// nomenclature V105 et ses actes incompatibles (relus par conteneur, catalogue
// seul, le 2026-10-17 et le 2026-10-18), ou le nom même de l'analyse.

/** Le type d'une composition, tel que la base le contrôle (CHECK). */
export const TYPES_COMPOSITION = ['groupe', 'calcul', 'regroupement'] as const;
export type TypeComposition = (typeof TYPES_COMPOSITION)[number];

export const LIBELLES_TYPE_COMPOSITION: Readonly<Record<TypeComposition, string>> = {
  groupe: 'analyse groupée, cotée par un seul acte',
  calcul: 'valeur calculée à partir d’autres mesures',
  regroupement: 'regroupement, coté par ses composants un à un',
};

export type CompositionPreparee = {
  type: TypeComposition;
  /** Codes d'analyte, dans l'ordre d'affichage. */
  composants: readonly string[];
  /** Ce qui fonde la liste. */
  motif: string;
};

/** Les compositions préparées, par code de l'analyte composé. */
export const COMPOSITIONS_PREPAREES: Readonly<Record<string, CompositionPreparee>> = {
  BIO_NFS: {
    type: 'groupe',
    composants: [
      'BIO_HEMATIES', 'BIO_HEMOGLOBINE', 'BIO_HEMATOCRITE', 'BIO_VGM', 'BIO_TCMH', 'BIO_CCMH', 'BIO_IDR',
      'BIO_LEUCOCYTES',
      'BIO_NEUTROPHILES', 'BIO_NEUTROPHILES_PCT', 'BIO_EOSINOPHILES', 'BIO_EOSINOPHILES_PCT',
      'BIO_BASOPHILES', 'BIO_BASOPHILES_PCT', 'BIO_LYMPHOCYTES', 'BIO_LYMPHOCYTES_PCT',
      'BIO_MONOCYTES', 'BIO_MONOCYTES_PCT',
      'BIO_PLAQUETTES', 'BIO_VPM',
    ],
    motif:
      'Hémogramme y compris plaquettes (1104) ; l’acte exclut l’hématocrite seul (2108) et les plaquettes seules (1107).',
  },
  BIO_IONOGRAMME: {
    type: 'groupe',
    composants: ['BIO_SODIUM', 'BIO_POTASSIUM', 'BIO_CHLORE'],
    motif: 'Ionogramme (1609) : Na + K + éventuellement Cl ; l’acte exclut le potassium seul (1608).',
  },
  BIO_IONOGRAMME_COMPLET: {
    type: 'groupe',
    composants: ['BIO_SODIUM', 'BIO_POTASSIUM', 'BIO_CHLORE', 'BIO_BICARBONATES', 'BIO_PROTIDES'],
    motif:
      'Ionogramme complet (1610) : Na + K + Cl + CO2 + protides ; l’acte exclut les bicarbonates (0571) et les protides (2258) seuls.',
  },
  BIO_PROFIL_LIPIDIQUE: {
    type: 'groupe',
    composants: ['BIO_CHOLESTEROL_TOTAL', 'BIO_TRIGLYCERIDES', 'BIO_HDL', 'BIO_LDL_CALCULE'],
    motif:
      'Exploration d’une anomalie lipidique (0996) ; l’acte exclut le cholestérol total (0580) et les triglycérides (0590) seuls ; HDL et LDL calculé n’ont pas d’acte propre (D-323 §5).',
  },
  BIO_BILAN_HEPATIQUE: {
    type: 'regroupement',
    composants: ['BIO_ALAT', 'BIO_ASAT', 'BIO_GGT', 'BIO_PHOSPHATASES_ALCALINES', 'BIO_BILIRUBINE'],
    motif: 'Aucun acte de bilan hépatique : chaque composant se cote seul (0516, 0517, 0519, 0514, 1601).',
  },
  BIO_RATIO_HOMA: {
    type: 'calcul',
    composants: ['BIO_GLYCEMIE_JEUN', 'BIO_INSULINEMIE'],
    motif: 'Indice calculé à partir de la glycémie et de l’insulinémie à jeun.',
  },
  BIO_NON_HDL: {
    type: 'calcul',
    composants: ['BIO_CHOLESTEROL_TOTAL', 'BIO_HDL'],
    motif: 'Calculé à partir du cholestérol total et du HDL.',
  },
  BIO_DFG_CKD_EPI: {
    type: 'calcul',
    composants: ['BIO_CREATININE'],
    motif: 'Estimé à partir de la créatinine ; l’équation tient aussi compte de l’âge et du sexe, qui ne sont pas des analyses.',
  },
  BIO_RATIO_ZINC_CUIVRE: {
    type: 'calcul',
    composants: ['BIO_ZINC_PLASMATIQUE', 'BIO_CUIVRE'],
    motif: 'Rapport du zinc plasmatique et du cuivre.',
  },
  // [[D-376]] §6 : les opérandes de ces deux rapports sont au catalogue depuis
  // la migration 20261025140000, constatée le 2026-10-26 ; la composition se
  // nomme d'après le rapport lui-même.
  BIO_RATIO_AA_EPA: {
    type: 'calcul',
    composants: ['BIO_AG_ARACHIDONIQUE', 'BIO_AG_EPA'],
    motif: 'Rapport de l’acide arachidonique et de l’EPA.',
  },
  BIO_RATIO_LA_DGLA: {
    type: 'calcul',
    composants: ['BIO_AG_LINOLEIQUE', 'BIO_AG_DGLA'],
    motif: 'Rapport de l’acide linoléique et du DGLA.',
  },
  // [[D-390]] §1 : le compte rendu du laboratoire imprime ces quatre acides
  // sous « Oméga 6 » et ces trois sous « Oméga 3 » ; leurs sommes redonnent son
  // rapport au centième. L'ordre est le sien.
  BIO_RATIO_OMEGA6_OMEGA3: {
    type: 'calcul',
    composants: [
      'BIO_AG_LINOLEIQUE', 'BIO_AG_GAMMA_LINOLENIQUE', 'BIO_AG_DGLA', 'BIO_AG_ARACHIDONIQUE',
      'BIO_AG_ALPHA_LINOLENIQUE', 'BIO_AG_EPA', 'BIO_AG_DHA',
    ],
    motif:
      'Rapport de la somme des quatre oméga 6 (linoléique, gamma-linolénique, DGLA, arachidonique) à celle des trois oméga 3 (alpha-linolénique, EPA, DHA), comme le compte rendu du laboratoire les range.',
  },
  // [[D-390]] §2 : « L'index oméga 3 correspond au pourcentage d'EPA + DHA »
  // (claim WN-CL-0045-008) ; le compte rendu en redonne la somme au centième.
  BIO_INDEX_OMEGA3: {
    type: 'calcul',
    composants: ['BIO_AG_EPA', 'BIO_AG_DHA'],
    motif: 'Pourcentage d’EPA et de DHA.',
  },
  // [[D-387]] §1-§2 : les vingt acides que le compte rendu du laboratoire
  // imprime sous « Profil des Acides Gras de la membrane Érythrocytaire », dans
  // son ordre ; ses rapports, imprimés sous « RAPPORTS », restent à part.
  BIO_AG_ERYTHROCYTAIRES: {
    type: 'regroupement',
    composants: [
      'BIO_AG_MYRISTIQUE', 'BIO_AG_PALMITIQUE', 'BIO_AG_STEARIQUE', 'BIO_AG_LAURIQUE',
      'BIO_AG_PENTADECANOIQUE', 'BIO_AG_HEPTADECANOIQUE', 'BIO_AG_PALMITOLEIQUE', 'BIO_AG_CIS_VACCENIQUE',
      'BIO_AG_TRANS_VACCENIQUE', 'BIO_AG_RUMENIQUE', 'BIO_AG_OLEIQUE', 'BIO_AG_NERVONIQUE',
      'BIO_AG_ELAIDIQUE', 'BIO_AG_LINOLEIQUE', 'BIO_AG_GAMMA_LINOLENIQUE', 'BIO_AG_DGLA',
      'BIO_AG_ARACHIDONIQUE', 'BIO_AG_ALPHA_LINOLENIQUE', 'BIO_AG_EPA', 'BIO_AG_DHA',
    ],
    motif:
      'Les vingt acides que le compte rendu imprime sous « Profil des Acides Gras de la membrane Érythrocytaire » ; aucun acte de la V105 ne nomme le profil ni ses acides, chacun se constate seul.',
  },
};

/** Les calculés dont les opérandes manquent au catalogue (D-323 §4) : rien à
 *  signer, ils restent « non évalués », et l'écran le dit. */
export const OPERANDES_ABSENTS: Readonly<Record<string, string>> = {
  BIO_RATIO_CORTISOL_DHEA: 'La DHEA n’est pas au catalogue.',
  BIO_RATIO_KYN_TRP: 'La kynurénine et le tryptophane ne sont pas au catalogue.',
};

/** La composition préparée d'un analyte, ou `null`. */
export function compositionPrepareePour(analyteCode: string): CompositionPreparee | null {
  return Object.prototype.hasOwnProperty.call(COMPOSITIONS_PREPAREES, analyteCode)
    ? COMPOSITIONS_PREPAREES[analyteCode]
    : null;
}

/** Le motif d'un calculé sans opérandes au catalogue, ou `null`. */
export function operandesAbsentsPour(analyteCode: string): string | null {
  return Object.prototype.hasOwnProperty.call(OPERANDES_ABSENTS, analyteCode) ? OPERANDES_ABSENTS[analyteCode] : null;
}
