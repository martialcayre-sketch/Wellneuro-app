import { createHash } from 'node:crypto';
import { unitesConcordent } from './valeurLue';

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
// (« zinc », « magnésium ») n'est PAS rattaché — « zinc » sérique n'est pas le
// zinc plasmatique du catalogue. La B12 totale n'est pas l'holotranscobalamine :
// « Vitamine B12 » se rattache à `BIO_VITAMINE_B12` depuis [[D-262]], jamais à
// `BIO_B12_HOLOTC`.
// La règle vaut AUSSI pour les libellés du catalogue lui-même : « Cuivre »,
// « Glutathion », « Zonuline » taisent la matrice et ne sont pas repris — une
// zonuline fécale se rattacherait à l'analyte sanguin sous la même unité
// (revue `wn-reviewer`, P1-2 ; arbitrage du responsable, 2026-10-02). Un
// libellé précis (« Cuivre sérique »…) peut s'ajouter à la relecture. Un même libellé posé sous DEUX codes rend `ambigu` :
// c'est voulu (« cortisol salivaire », « IgA sécrétoires »), le praticien
// tranche.
//
// SIGNÉE PAR [[D-259]] (2026-10-03), sur la surface de relecture
// `docs/claude/campagnes/SURFACE_RELECTURE_RESOLVER_LIBELLES_2026-10-03.md`,
// puis RE-SIGNÉE par [[D-260]] le même jour : trois libellés réels ajoutés,
// lus sur le premier compte rendu de production ; puis par [[D-262]] : les
// analyses d'un compte rendu courant, ajoutées au catalogue par [[D-261]].
// Toute entrée ajoutée, retirée ou retouchée change le SHA calculé et referme
// le verrou : `resoudreLibelle` rend alors `inconnu` partout jusqu'à une
// nouvelle signature, avec sa décision `D-xxx`.

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
  // Libellés RÉELS, lus sur le premier compte rendu de production ([[D-260]]).
  { libelle: 'Coefficient de saturation en fer de la transferrine', code: 'BIO_COEF_SATURATION' },
  { libelle: 'Zinc plasmatique', code: 'BIO_ZINC_PLASMATIQUE' },
  { libelle: 'Magnésium érythrocytaire', code: 'BIO_MAGNESIUM_ERYTHROCYTAIRE' },
  { libelle: 'Magnésium intra-érythrocytaire', code: 'BIO_MAGNESIUM_ERYTHROCYTAIRE' },
  { libelle: 'Vitamine D (25-OH)', code: 'BIO_VITAMINE_D_25OH' },
  { libelle: '25-OH vitamine D', code: 'BIO_VITAMINE_D_25OH' },
  { libelle: '25-OH vitamine D (D2+D3)', code: 'BIO_VITAMINE_D_25OH' },
  { libelle: '25-hydroxyvitamine D', code: 'BIO_VITAMINE_D_25OH' },
  { libelle: '25(OH)D', code: 'BIO_VITAMINE_D_25OH' },
  { libelle: 'Vitamine D 25 OH (D2 + D3)', code: 'BIO_VITAMINE_D_25OH' },
  { libelle: 'Folates érythrocytaires', code: 'BIO_FOLATES_ERYTHROCYTAIRES' },
  { libelle: 'Folates intra-érythrocytaires', code: 'BIO_FOLATES_ERYTHROCYTAIRES' },
  // Libellé ENTIER tel qu'imprimé, méthode comprise : la parenthèse ne se
  // retire jamais (elle peut dire la matrice).
  { libelle: 'Acide folique - érythrocytes (Chimiluminescence-Dxl-Beckman Coulter)', code: 'BIO_FOLATES_ERYTHROCYTAIRES' },
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
  // [[D-262]] — les analyses d'un compte rendu courant : libellés du catalogue
  // (migration 20261003150000) et libellés LUS sur le premier compte rendu de
  // production. Un libellé lu doit être au moins aussi précis que celui du
  // catalogue : « Créatinine » se rattache (le catalogue ne dit pas plus),
  // « Fer » non (le catalogue dit « Fer sérique »), « Sodium » non plus (une
  // natriurèse s'imprime aussi en mmol/L) — l'unité lue garde le reste.
  { libelle: 'Hématies', code: 'BIO_HEMATIES' },
  { libelle: 'Hématocrite', code: 'BIO_HEMATOCRITE' },
  { libelle: 'Volume globulaire moyen (VGM)', code: 'BIO_VGM' },
  { libelle: 'V.G.M', code: 'BIO_VGM' },
  { libelle: 'Teneur corpusculaire moyenne en hémoglobine (TCMH)', code: 'BIO_TCMH' },
  { libelle: 'T.C.M.H', code: 'BIO_TCMH' },
  { libelle: 'Concentration corpusculaire moyenne en hémoglobine (CCMH)', code: 'BIO_CCMH' },
  { libelle: 'C.C.M.H', code: 'BIO_CCMH' },
  { libelle: 'Indice de distribution des globules rouges (IDR)', code: 'BIO_IDR' },
  { libelle: 'I.D.R', code: 'BIO_IDR' },
  { libelle: 'Leucocytes', code: 'BIO_LEUCOCYTES' },
  { libelle: 'Plaquettes', code: 'BIO_PLAQUETTES' },
  { libelle: 'Volume plaquettaire moyen (VPM)', code: 'BIO_VPM' },
  { libelle: 'Volume Plaquettaire Moyen', code: 'BIO_VPM' },
  // Ambiguïté VOULUE : le laboratoire imprime le même libellé pour la valeur
  // absolue et le pourcentage. L'unité lue départage (`resoudreLigne`). Le
  // libellé du catalogue « … (%) » se normalise en ce même libellé : le « % »
  // est une ponctuation pour `normaliserLibelle`.
  { libelle: 'Polynucléaires neutrophiles', code: 'BIO_NEUTROPHILES' },
  { libelle: 'Polynucléaires neutrophiles', code: 'BIO_NEUTROPHILES_PCT' },
  { libelle: 'Polynucléaires éosinophiles', code: 'BIO_EOSINOPHILES' },
  { libelle: 'Polynucléaires éosinophiles', code: 'BIO_EOSINOPHILES_PCT' },
  { libelle: 'Polynucléaires basophiles', code: 'BIO_BASOPHILES' },
  { libelle: 'Polynucléaires basophiles', code: 'BIO_BASOPHILES_PCT' },
  { libelle: 'Lymphocytes', code: 'BIO_LYMPHOCYTES' },
  { libelle: 'Lymphocytes', code: 'BIO_LYMPHOCYTES_PCT' },
  { libelle: 'Monocytes', code: 'BIO_MONOCYTES' },
  { libelle: 'Monocytes', code: 'BIO_MONOCYTES_PCT' },
  { libelle: 'Sodium sérique', code: 'BIO_SODIUM' },
  { libelle: 'Potassium sérique', code: 'BIO_POTASSIUM' },
  { libelle: 'Chlore sérique', code: 'BIO_CHLORE' },
  { libelle: 'Créatinine', code: 'BIO_CREATININE' },
  { libelle: 'Débit de filtration glomérulaire estimé (CKD-EPI)', code: 'BIO_DFG_CKD_EPI' },
  { libelle: 'Estimation du DFG selon la formule CKD-EPI', code: 'BIO_DFG_CKD_EPI' },
  { libelle: 'ASAT (Transaminases TGO)', code: 'BIO_ASAT' },
  { libelle: 'ALAT (Transaminases TGP)', code: 'BIO_ALAT' },
  { libelle: 'Gamma-glutamyl transférase (GGT)', code: 'BIO_GGT' },
  { libelle: 'GGT (Gamma Glutamyl Transpeptidase)', code: 'BIO_GGT' },
  { libelle: 'Cholestérol total', code: 'BIO_CHOLESTEROL_TOTAL' },
  { libelle: 'Cholestérol HDL', code: 'BIO_HDL' },
  { libelle: 'Cholestérol LDL calculé', code: 'BIO_LDL_CALCULE' },
  { libelle: 'Cholestérol non-HDL', code: 'BIO_NON_HDL' },
  { libelle: 'Triglycérides', code: 'BIO_TRIGLYCERIDES' },
  { libelle: 'Transferrine', code: 'BIO_TRANSFERRINE' },
  { libelle: 'Capacité totale de fixation de la transferrine', code: 'BIO_CTF' },
  { libelle: 'Capacité totale de fixation en fer de la transferrine', code: 'BIO_CTF' },
  { libelle: 'Vitamine B12', code: 'BIO_VITAMINE_B12' },
  { libelle: 'CRP (Protéine C Réactive)', code: 'BIO_CRP' },
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
  // RE-SIGNÉE PAR [[D-262]] — RE-SIGNER REMPLACE : la signature de [[D-260]]
  // (11:12 UTC, SHA `5f95d167…`, 101 entrées) portait la table sans les
  // analyses du compte rendu courant ; celle de [[D-259]] (SHA `ccbd8008…`)
  // était déjà remplacée. 145 entrées, 79 analytes.
  // Enrôlée dans `clinical/shaPerimetreLitteral.guard.test.ts` depuis D-259.
  validationExterne: true,
  dateValidation: '2026-10-03T20:18:43.000Z',
  sourceReference: 'Relecture du responsable, le 2026-10-03, contre le catalogue biology_analytes (migrations niveau 1, oméga-3 AA/EPA et compte rendu courant) ; libellés réels lus sur un compte rendu de laboratoire de biologie médicale (Biogroup)',
  shaPerimetre: 'be9a463c7d3ea0517b0e53c5adb0b7dfe9322d744cabffbdc097522644888fc3',
};

// Empreinte calculée ICI, par `node:crypto` : importer `sha256` du module du
// corpus clinique ferait compter ce resolver comme un consommateur du corpus
// (revue Copilot de #1281). Même algorithme, même forme hexadécimale.
export const RESOLVER_LIBELLES_SHA256 = createHash('sha256').update(JSON.stringify(RESOLVER_LIBELLES_V1), 'utf8').digest('hex');

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

/**
 * Le code proposé pour une LIGNE lue : son libellé, puis son unité quand le
 * libellé désigne plusieurs analytes ([[D-262]]). Parmi eux, seuls restent
 * ceux dont l'unité au catalogue concorde avec l'unité lue (notations
 * équivalentes comprises, aucune conversion) ; s'il n'en reste qu'un, il est
 * proposé — « Polynucléaires neutrophiles » en G/L ou en %. Sinon `ambigu` :
 * deux analytes de même unité (« Cortisol salivaire ») restent au praticien.
 * Un code absent de `unitesCatalogue` ne survit jamais au départage.
 */
export function resoudreLigne(
  libelle: string,
  uniteLue: string | null,
  unitesCatalogue: ReadonlyMap<string, string | null>,
  signe: boolean = resolverSigne(),
  index: Map<string, Set<string>> = INDEX,
): Resolution {
  if (!signe) return INCONNU;
  const entier = normaliserLibelle(libelle);
  if (entier === '') return INCONNU;
  const resolution = chercher(entier, index);
  if (resolution === null) return INCONNU;
  if (resolution.statut !== 'ambigu') return resolution;
  const retenus = [...(index.get(entier) ?? [])].filter(code =>
    unitesCatalogue.has(code) && unitesConcordent(uniteLue, unitesCatalogue.get(code) ?? null));
  return retenus.length === 1 ? { statut: 'resolu', code: retenus[0] } : resolution;
}

/** Exposé pour les bancs : l'index d'une table quelconque. */
export const indexerPourBanc = indexer;
