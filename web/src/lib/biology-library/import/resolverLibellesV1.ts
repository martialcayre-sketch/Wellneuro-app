import { sha256 } from '@/lib/clinical/corpusSyntheseV1';

// RESOLVER SIGNÉ : LIBELLÉ LU → ANALYTE DU CATALOGUE (BIO-INGEST LOT-02,
// [[D-256]] A4 ; arbitrages du 2026-10-01 et du 2026-10-02).
//
// Le modèle d'extraction relève un libellé TEL QU'IL EST ÉCRIT (« 25-OH
// vitamine D », « Sidérémie ») et ne choisit JAMAIS d'analyte. C'est cette
// table, et elle seule, qui propose un code — `analyte_propose` de la ligne
// candidate. Le praticien confirme ou corrige l'analyte à la validation : la
// proposition n'écrit rien.
//
// CE QUE LA TABLE CONTIENT : les libellés du catalogue (`biology_analytes`,
// migrations `catalogue_biologie_niveau_1_donnees` et `…_omega3_aa_epa`) et
// des synonymes courants de comptes rendus de laboratoire, rédigés le
// 2026-10-02 et SOUMIS À RELECTURE. Quatre analytes composites — profil
// lipidique, NFS, bilan hépatique, ionogramme — n'y figurent pas : ce sont des
// panels sans unité, aucune ligne de compte rendu ne les mesure à elle seule.
//
// Prudence délibérée : un libellé générique dont la matrice n'est pas dite
// (« zinc », « magnésium », « vitamine B12 ») n'est PAS rattaché — « zinc »
// sérique n'est pas le zinc plasmatique du catalogue, la B12 totale n'est pas
// l'holotranscobalamine.
// La règle vaut AUSSI pour les libellés du catalogue lui-même : « Cuivre »,
// « Glutathion », « Zonuline » taisent la matrice et ne sont pas repris — une
// zonuline fécale se rattacherait à l'analyte sanguin sous la même unité
// (revue `wn-reviewer`, P1-2 ; arbitrage du responsable, 2026-10-02). Un
// libellé précis (« Cuivre sérique »…) peut s'ajouter à la relecture. Un même libellé posé sous DEUX codes rend `ambigu` :
// c'est voulu (« cortisol salivaire », « IgA sécrétoires »), le praticien
// tranche.
//
// LIVRÉE NON SIGNÉE. Tant que la signature manque, `resoudreLibelle` rend
// `inconnu` partout : l'import reste utilisable, le praticien choisit chaque
// analyte. Signer est un acte praticien distinct, avec sa décision `D-xxx`.

export type EntreeResolver = { libelle: string; code: string };

export const RESOLVER_LIBELLES_V1: readonly EntreeResolver[] = Object.freeze([
  { libelle: 'Ferritine', code: 'BIO_FERRITINE' },
  { libelle: 'Ferritinémie', code: 'BIO_FERRITINE' },
  { libelle: 'Fer sérique', code: 'BIO_FER_SERIQUE' },
  { libelle: 'Sidérémie', code: 'BIO_FER_SERIQUE' },
  { libelle: 'Coefficient de saturation de la sidérophiline', code: 'BIO_COEF_SATURATION' },
  { libelle: 'Coefficient de saturation de la transferrine', code: 'BIO_COEF_SATURATION' },
  { libelle: 'Saturation de la transferrine', code: 'BIO_COEF_SATURATION' },
  { libelle: 'CST', code: 'BIO_COEF_SATURATION' },
  { libelle: 'Zinc plasmatique', code: 'BIO_ZINC_PLASMATIQUE' },
  { libelle: 'Magnésium érythrocytaire', code: 'BIO_MAGNESIUM_ERYTHROCYTAIRE' },
  { libelle: 'Magnésium intra-érythrocytaire', code: 'BIO_MAGNESIUM_ERYTHROCYTAIRE' },
  { libelle: 'Vitamine D (25-OH)', code: 'BIO_VITAMINE_D_25OH' },
  { libelle: '25-OH vitamine D', code: 'BIO_VITAMINE_D_25OH' },
  { libelle: '25-OH vitamine D (D2+D3)', code: 'BIO_VITAMINE_D_25OH' },
  { libelle: '25-hydroxyvitamine D', code: 'BIO_VITAMINE_D_25OH' },
  { libelle: '25(OH)D', code: 'BIO_VITAMINE_D_25OH' },
  { libelle: 'Folates érythrocytaires', code: 'BIO_FOLATES_ERYTHROCYTAIRES' },
  { libelle: 'Folates intra-érythrocytaires', code: 'BIO_FOLATES_ERYTHROCYTAIRES' },
  { libelle: 'Vitamine B12 active (holotranscobalamine)', code: 'BIO_B12_HOLOTC' },
  { libelle: 'Vitamine B12 active', code: 'BIO_B12_HOLOTC' },
  { libelle: 'Holotranscobalamine', code: 'BIO_B12_HOLOTC' },
  { libelle: 'Holo-TC', code: 'BIO_B12_HOLOTC' },
  { libelle: 'Sélénium plasmatique', code: 'BIO_SELENIUM' },
  { libelle: 'Iodurie', code: 'BIO_IODURIE' },
  { libelle: 'Iodurie des 24 heures', code: 'BIO_IODURIE' },
  { libelle: 'Cuprémie', code: 'BIO_CUIVRE' },
  { libelle: 'Rapport zinc / cuivre', code: 'BIO_RATIO_ZINC_CUIVRE' },
  { libelle: 'Ratio zinc / cuivre', code: 'BIO_RATIO_ZINC_CUIVRE' },
  { libelle: 'Glycémie à jeun', code: 'BIO_GLYCEMIE_JEUN' },
  { libelle: 'Glucose à jeun', code: 'BIO_GLYCEMIE_JEUN' },
  { libelle: 'Insulinémie à jeun', code: 'BIO_INSULINEMIE' },
  { libelle: 'Insuline à jeun', code: 'BIO_INSULINEMIE' },
  { libelle: 'Indice HOMA', code: 'BIO_RATIO_HOMA' },
  { libelle: 'Index HOMA', code: 'BIO_RATIO_HOMA' },
  { libelle: 'HOMA-IR', code: 'BIO_RATIO_HOMA' },
  { libelle: 'Hémoglobine glyquée', code: 'BIO_HBA1C' },
  { libelle: 'Hémoglobine glyquée (HbA1c)', code: 'BIO_HBA1C' },
  { libelle: 'HbA1c', code: 'BIO_HBA1C' },
  { libelle: 'Statut des acides gras érythrocytaires', code: 'BIO_AG_ERYTHROCYTAIRES' },
  { libelle: 'Albumine', code: 'BIO_ALBUMINE' },
  { libelle: 'Albuminémie', code: 'BIO_ALBUMINE' },
  { libelle: 'CRP ultrasensible', code: 'BIO_CRP_US' },
  { libelle: 'CRP us', code: 'BIO_CRP_US' },
  { libelle: 'CRP hs', code: 'BIO_CRP_US' },
  { libelle: 'hs-CRP', code: 'BIO_CRP_US' },
  { libelle: 'Protéine C réactive ultrasensible', code: 'BIO_CRP_US' },
  { libelle: 'Homocystéine', code: 'BIO_HOMOCYSTEINE' },
  { libelle: 'Homocystéinémie', code: 'BIO_HOMOCYSTEINE' },
  { libelle: 'TSH ultrasensible', code: 'BIO_TSH_US' },
  { libelle: 'TSH us', code: 'BIO_TSH_US' },
  { libelle: 'TSH', code: 'BIO_TSH_US' },
  { libelle: 'Thyréostimuline', code: 'BIO_TSH_US' },
  { libelle: 'Hémoglobine', code: 'BIO_HEMOGLOBINE' },
  { libelle: 'Acide urique', code: 'BIO_ACIDE_URIQUE' },
  { libelle: 'Uricémie', code: 'BIO_ACIDE_URIQUE' },
  { libelle: 'Anticorps anti-TPO', code: 'BIO_ANTI_TPO' },
  { libelle: 'Anticorps anti-thyroperoxydase', code: 'BIO_ANTI_TPO' },
  { libelle: 'Ac anti-TPO', code: 'BIO_ANTI_TPO' },
  { libelle: 'T3 reverse', code: 'BIO_T3_REVERSE' },
  { libelle: 'Reverse T3', code: 'BIO_T3_REVERSE' },
  { libelle: 'rT3', code: 'BIO_T3_REVERSE' },
  { libelle: 'Anticorps anti-LDL oxydé', code: 'BIO_ANTI_LDL_OXYDE' },
  { libelle: 'Anticorps anti-LDL oxydées', code: 'BIO_ANTI_LDL_OXYDE' },
  { libelle: 'Coenzyme Q10 plasmatique', code: 'BIO_COENZYME_Q10' },
  { libelle: 'Coenzyme Q10', code: 'BIO_COENZYME_Q10' },
  { libelle: 'Rapport kynurénine / tryptophane', code: 'BIO_RATIO_KYN_TRP' },
  { libelle: 'Ratio kynurénine / tryptophane', code: 'BIO_RATIO_KYN_TRP' },
  { libelle: 'Cortisol awakening response', code: 'BIO_CAR' },
  { libelle: 'Cortisol salivaire 8h / 20h', code: 'BIO_CORTISOL_8H_20H' },
  // Ambiguïté VOULUE : le libellé seul ne dit pas s'il s'agit du réveil ou du
  // cycle 8 h / 20 h — le praticien tranche.
  { libelle: 'Cortisol salivaire', code: 'BIO_CAR' },
  { libelle: 'Cortisol salivaire', code: 'BIO_CORTISOL_8H_20H' },
  { libelle: 'Rapport cortisol / DHEA', code: 'BIO_RATIO_CORTISOL_DHEA' },
  { libelle: 'Ratio cortisol / DHEA', code: 'BIO_RATIO_CORTISOL_DHEA' },
  { libelle: 'Alpha-amylase salivaire', code: 'BIO_ALPHA_AMYLASE' },
  { libelle: 'Amylase salivaire', code: 'BIO_ALPHA_AMYLASE' },
  { libelle: 'IgA sécrétoire salivaire', code: 'BIO_IGA_SALIVAIRE' },
  { libelle: 'IgA sécrétoires salivaires', code: 'BIO_IGA_SALIVAIRE' },
  { libelle: 'IgA sécrétoires fécales', code: 'BIO_IGA_FECALES' },
  // Ambiguïté VOULUE : salive ou selles, le libellé seul ne le dit pas.
  { libelle: 'IgA sécrétoires', code: 'BIO_IGA_SALIVAIRE' },
  { libelle: 'IgA sécrétoires', code: 'BIO_IGA_FECALES' },
  { libelle: '6-sulfatoxymélatonine urinaire', code: 'BIO_6_SMT' },
  { libelle: '6-sulfatoxymélatonine', code: 'BIO_6_SMT' },
  { libelle: '6-SMT', code: 'BIO_6_SMT' },
  { libelle: 'HVA urinaire (catabolites dopamine)', code: 'BIO_HVA_URINAIRE' },
  { libelle: 'HVA urinaire', code: 'BIO_HVA_URINAIRE' },
  { libelle: 'Acide homovanillique urinaire', code: 'BIO_HVA_URINAIRE' },
  { libelle: 'Facteur neurotrophique BDNF', code: 'BIO_BDNF' },
  { libelle: 'Bêta-défensines de type 2 fécales', code: 'BIO_BETA_DEFENSINE_2' },
  { libelle: 'Bêta-défensine 2', code: 'BIO_BETA_DEFENSINE_2' },
  { libelle: 'Acides gras à chaîne courte fécaux', code: 'BIO_AGCC_FECAUX' },
  { libelle: 'Calprotectine fécale', code: 'BIO_CALPROTECTINE' },
  { libelle: 'Calprotectine', code: 'BIO_CALPROTECTINE' },
  { libelle: 'LBP (protéine porteuse du LPS)', code: 'BIO_LBP' },
  { libelle: 'LBP', code: 'BIO_LBP' },
  { libelle: 'Lipopolysaccharide binding protein', code: 'BIO_LBP' },
  { libelle: 'Index oméga 3', code: 'BIO_INDEX_OMEGA3' },
  { libelle: 'Rapport AA / EPA', code: 'BIO_RATIO_AA_EPA' },
  { libelle: 'Ratio AA / EPA', code: 'BIO_RATIO_AA_EPA' },
]);

export type ResolverLibellesMetadata = {
  version: string;
  validationExterne: boolean;
  dateValidation: string | null;
  /** Qui a relu la table, et sur quelle source (catalogue, comptes rendus types). */
  sourceReference: string | null;
  /**
   * SHA de la table effectivement relue au moment de la signature. Un LITTÉRAL
   * figé de 64 hex — SURTOUT PAS la constante `RESOLVER_LIBELLES_SHA256` : ce
   * serait une tautologie qui rouvrirait le verrou à chaque retouche, sans
   * relecture. Une entrée ajoutée change le SHA calculé et ferme le verrou
   * seule. `null` tant que rien n'a été relu.
   */
  shaPerimetre: string | null;
};

export const RESOLVER_LIBELLES_METADATA: ResolverLibellesMetadata = {
  version: 'resolver-libelles-v1',
  // NON SIGNÉE (livrée le 2026-10-02). La table s'enrôlera dans
  // `clinical/shaPerimetreLitteral.guard.test.ts` le jour de sa signature,
  // comme les tables qui l'ont précédée — pas avant, le sha valant `null`.
  validationExterne: false,
  dateValidation: null,
  sourceReference: null,
  shaPerimetre: null,
};

export const RESOLVER_LIBELLES_SHA256 = sha256(JSON.stringify(RESOLVER_LIBELLES_V1));

/**
 * La table est-elle RÉELLEMENT signée ? ET fail-closed à cinq termes, patron
 * `signatureIndicationsValide` : booléen, date ISO canonique, source nommée,
 * SHA du périmètre concordant.
 */
export function resolverSigne(
  signature: ResolverLibellesMetadata = RESOLVER_LIBELLES_METADATA,
  shaAttendu: string = RESOLVER_LIBELLES_SHA256,
): boolean {
  const date = signature.dateValidation;
  return signature.validationExterne
    && date !== null
    && !Number.isNaN(new Date(date).getTime())
    && new Date(date).toISOString() === date
    && typeof signature.sourceReference === 'string'
    && signature.sourceReference.trim() !== ''
    && signature.shaPerimetre === shaAttendu;
}

/**
 * Forme de comparaison d'un libellé : accents retirés, minuscules, toute
 * ponctuation ramenée à une espace, espaces réduites. « 25-OH Vitamine D » et
 * « 25 oh vitamine d » se rejoignent ; rien n'est traduit ni deviné.
 */
export function normaliserLibelle(libelle: string): string {
  return libelle
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function indexer(entrees: readonly EntreeResolver[]): Map<string, Set<string>> {
  const index = new Map<string, Set<string>>();
  for (const { libelle, code } of entrees) {
    const cle = normaliserLibelle(libelle);
    const codes = index.get(cle) ?? new Set<string>();
    codes.add(code);
    index.set(cle, codes);
  }
  return index;
}

const INDEX = indexer(RESOLVER_LIBELLES_V1);

export type Resolution =
  | { statut: 'resolu'; code: string }
  | { statut: 'ambigu'; code: null }
  | { statut: 'inconnu'; code: null };

const INCONNU: Resolution = { statut: 'inconnu', code: null };

function chercher(cle: string, index: Map<string, Set<string>>): Resolution | null {
  const codes = index.get(cle);
  if (!codes) return null;
  if (codes.size > 1) return { statut: 'ambigu', code: null };
  return { statut: 'resolu', code: [...codes][0] };
}

/**
 * Le code proposé pour un libellé lu — le libellé ENTIER, sans autre passe. Une
 * parenthèse peut dire la matrice (« Zonuline (selles) », « BDNF (plasma) ») :
 * la retirer rattacherait une mesure fécale ou plasmatique à l'analyte sanguin
 * du catalogue, sous une unité identique que rien ne distinguerait (revue
 * `wn-reviewer`, P1-2). Un resolver non signé rend `inconnu` partout — aucune
 * proposition hors d'une table relue.
 */
export function resoudreLibelle(
  libelle: string,
  signe: boolean = resolverSigne(),
  index: Map<string, Set<string>> = INDEX,
): Resolution {
  if (!signe) return INCONNU;
  const entier = normaliserLibelle(libelle);
  if (entier === '') return INCONNU;
  return chercher(entier, index) ?? INCONNU;
}

/** Exposé pour les bancs : l'index d'une table quelconque. */
export const indexerPourBanc = indexer;
