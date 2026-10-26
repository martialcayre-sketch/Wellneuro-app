// Candidats analyte ↔ acte NABM préparés pour signature (M-3b, F54) — module
// PUR : aucune lecture, aucune écriture. Une PROPOSITION, jamais une
// correspondance : rien d'ici n'entre en base sans la signature du praticien
// (route `nabm/correspondances`, M-3), et rien d'ici ne compte pour le
// remboursement, dérivé des seules lignes signées (`remboursable.ts`).
//
// Arbitrage du responsable du 2026-10-15, qui amende celui du 2026-10-05
// (« jamais inférés d'un libellé ») : l'assistant cherche les candidats dans
// les libellés de la nomenclature importée, vérifie chaque code présent et
// actif au millésime courant ; la liste relue entre au code par PR, l'écran
// l'affiche pré-remplie, le responsable signe. Aucune migration, aucune ligne
// en base avant la signature.
//
// Relue en production par conteneur en lecture seule (catalogue seul) le
// 2026-10-15 : millésime V105 (987 actes), 85 analytes actifs, chaque code
// ci-dessous présent et actif. Le serveur relit chaque candidat au millésime
// COURANT avant de le montrer : absent ou inactif, il ne s'affiche pas.

import type { NatureNabm } from './correspondancesNabm';

/** Millésime de la nomenclature sur lequel la liste a été préparée. */
export const MILLESIME_LISTE_NABM = 'V105';

/**
 * Situation d'un analyte face à la nomenclature, telle que la liste la lit :
 *  - `libelle_explicite` : un libellé nomme l'analyte ;
 *  - `acte_de_groupe`    : l'analyte n'est coté qu'au sein d'un acte de groupe ;
 *  - `a_juger`           : le libellé ne nomme pas l'analyte exactement
 *                          (technique, milieu, contenu du groupe absents —
 *                          l'import ne garde que le libellé) ;
 *  - `aucun_acte`        : aucun libellé ne nomme l'analyte — ce n'est pas un
 *                          constat signé (M-3c) ;
 *  - `valeur_calculee`   : ratio ou estimation, qui ne se cote pas elle-même ;
 *  - `regroupement`      : analyte qui regroupe d'autres analytes cotés un à un.
 */
export const SITUATIONS_NABM = [
  'libelle_explicite',
  'acte_de_groupe',
  'a_juger',
  'aucun_acte',
  'valeur_calculee',
  'regroupement',
] as const;
export type SituationNabm = (typeof SITUATIONS_NABM)[number];

/** Les situations qui portent des candidats à signer. */
export const SITUATIONS_AVEC_ACTE: readonly SituationNabm[] = ['libelle_explicite', 'acte_de_groupe', 'a_juger'];

export type CandidatNabm = {
  /** Code de l'acte, quatre chiffres. */
  codeActe: string;
  /** Nature proposée, présélectionnée à l'écran ; le praticien peut la changer. */
  nature: NatureNabm;
  /** Pourquoi ce candidat — ce que dit (ou ne dit pas) le libellé. */
  motif: string;
};

export type CandidatsAnalyteNabm =
  | { situation: 'libelle_explicite' | 'acte_de_groupe' | 'a_juger'; candidats: readonly CandidatNabm[] }
  | { situation: 'aucun_acte' | 'valeur_calculee' | 'regroupement'; motif: string };

const NFS = (motif = 'Composant de l’hémogramme.'): CandidatsAnalyteNabm => ({
  situation: 'acte_de_groupe',
  candidats: [{ codeActe: '1104', nature: 'groupe_et', motif }],
});

const LIPIDES_0996 = 'Exploration d’une anomalie lipidique : acte de groupe.';
const MARTIAL_2002 =
  'Pas d’acte isolé dans la V105 ; le libellé de 2002 (coefficient de saturation de la transferrine) ne dit pas ce que l’acte dose.';
const AUCUN = 'Aucun libellé de la V105 ne nomme cet analyte.';
const IONO_COMPLET_1610 = 'Ionogramme complet (Na + K + Cl + CO2 + protides), relu le 2026-10-18 (D-323 §6).';
const CALCUL = 'Valeur calculée à partir d’autres analytes.';
const AUCUN_AG = 'Aucun libellé de la V105 ne nomme les acides gras.';

/** La liste, par code d'analyte. Les 116 analytes du catalogue y figurent
 *  (85 relus le 2026-10-15, 7 ajoutés par D-323 §6, 2 par D-361, 22 par D-376). */
export const CANDIDATS_NABM: Readonly<Record<string, CandidatsAnalyteNabm>> = {
  // ── Les 8 de S-7 (5 signés le 2026-10-15 : le serveur ne les propose plus).
  BIO_VITAMINE_D_25OH: {
    situation: 'libelle_explicite',
    candidats: [
      { codeActe: '1139', nature: 'isole', motif: '25-(OH)-vitamine D ; 1820 (dérivés dihydroxylés) est un autre dosage.' },
    ],
  },
  BIO_FERRITINE: {
    situation: 'libelle_explicite',
    candidats: [{ codeActe: '1213', nature: 'isole', motif: 'Le libellé nomme la ferritine (sang).' }],
  },
  BIO_ZINC_PLASMATIQUE: {
    situation: 'libelle_explicite',
    candidats: [{ codeActe: '2003', nature: 'groupe_ou', motif: 'L’acte couvre le zinc plasmatique ou sérique.' }],
  },
  BIO_CRP_US: {
    situation: 'a_juger',
    candidats: [
      {
        codeActe: '1804',
        nature: 'isole',
        motif: 'La nomenclature ne distingue pas la technique ultrasensible : seul acte de CRP de la V105.',
      },
    ],
  },
  BIO_MAGNESIUM_ERYTHROCYTAIRE: {
    situation: 'libelle_explicite',
    candidats: [{ codeActe: '0584', nature: 'groupe_ou', motif: 'L’acte couvre le magnésium plasmatique ou globulaire.' }],
  },
  BIO_CAR: {
    situation: 'aucun_acte',
    motif: 'La V105 cote le cortisol sanguin (0462) et urinaire (0476), aucun cortisol salivaire.',
  },
  BIO_AG_ERYTHROCYTAIRES: { situation: 'aucun_acte', motif: AUCUN_AG },
  BIO_HOMOCYSTEINE: { situation: 'aucun_acte', motif: AUCUN },

  // ── Libellé explicite.
  BIO_FOLATES_ERYTHROCYTAIRES: {
    situation: 'libelle_explicite',
    candidats: [{ codeActe: '1387', nature: 'groupe_ou', motif: 'L’acte couvre les folates sériques ou érythrocytaires.' }],
  },
  BIO_TSH_US: {
    situation: 'libelle_explicite',
    candidats: [
      { codeActe: '1208', nature: 'isole', motif: 'T.S.H. seule.' },
      { codeActe: '1211', nature: 'groupe_et', motif: 'T.S.H. + T4 libre.' },
      { codeActe: '1212', nature: 'groupe_et', motif: 'T.S.H. + T4 libre + T3 libre.' },
    ],
  },
  BIO_ACIDE_URIQUE: {
    situation: 'libelle_explicite',
    candidats: [{ codeActe: '0532', nature: 'isole', motif: 'Le libellé nomme l’acide urique (uricémie).' }],
  },
  BIO_COEF_SATURATION: {
    situation: 'libelle_explicite',
    candidats: [{ codeActe: '2002', nature: 'isole', motif: 'Le libellé nomme le coefficient de saturation de la transferrine.' }],
  },
  BIO_GLYCEMIE_JEUN: {
    situation: 'libelle_explicite',
    candidats: [{ codeActe: '0552', nature: 'isole', motif: 'Le libellé nomme le glucose (glycémie).' }],
  },
  BIO_IONOGRAMME: {
    situation: 'libelle_explicite',
    candidats: [
      { codeActe: '1609', nature: 'isole', motif: 'Ionogramme (Na + K + éventuellement Cl) ; 1610 est l’ionogramme complet.' },
    ],
  },
  BIO_NFS: {
    situation: 'libelle_explicite',
    candidats: [{ codeActe: '1104', nature: 'isole', motif: 'Hémogramme y compris plaquettes (NFS).' }],
  },
  BIO_ALAT: {
    situation: 'libelle_explicite',
    candidats: [
      { codeActe: '0516', nature: 'isole', motif: 'Le libellé nomme l’ALAT seule.' },
      { codeActe: '0522', nature: 'groupe_et', motif: 'Transaminases : ALAT et ASAT ensemble.' },
    ],
  },
  BIO_ASAT: {
    situation: 'libelle_explicite',
    candidats: [
      { codeActe: '0517', nature: 'isole', motif: 'Le libellé nomme l’ASAT seule.' },
      { codeActe: '0522', nature: 'groupe_et', motif: 'Transaminases : ALAT et ASAT ensemble.' },
    ],
  },
  BIO_ALBUMINE: {
    situation: 'libelle_explicite',
    candidats: [{ codeActe: '1806', nature: 'isole', motif: 'Albumine (sang) ; 1133 est l’albuminurie.' }],
  },
  BIO_ANTI_TPO: {
    situation: 'libelle_explicite',
    candidats: [{ codeActe: '1487', nature: 'isole', motif: 'Le libellé nomme les autoanticorps antithyroperoxydase.' }],
  },
  BIO_CRP: {
    situation: 'libelle_explicite',
    candidats: [{ codeActe: '1804', nature: 'isole', motif: 'Le libellé nomme la CRP (sang).' }],
  },
  BIO_CALPROTECTINE: {
    situation: 'libelle_explicite',
    candidats: [{ codeActe: '1684', nature: 'isole', motif: 'Le libellé nomme la calprotectine fécale.' }],
  },
  BIO_CHOLESTEROL_TOTAL: {
    situation: 'libelle_explicite',
    candidats: [
      { codeActe: '0580', nature: 'isole', motif: 'Le libellé nomme le cholestérol total.' },
      { codeActe: '0996', nature: 'groupe_et', motif: LIPIDES_0996 },
    ],
  },
  BIO_CREATININE: {
    situation: 'libelle_explicite',
    candidats: [{ codeActe: '0592', nature: 'isole', motif: 'Le libellé nomme la créatinine (créatininémie).' }],
  },
  BIO_CUIVRE: {
    situation: 'libelle_explicite',
    candidats: [{ codeActe: '0547', nature: 'isole', motif: 'Le libellé nomme le cuivre (cuprémie).' }],
  },
  BIO_GGT: {
    situation: 'libelle_explicite',
    candidats: [{ codeActe: '0519', nature: 'isole', motif: 'Le libellé nomme la gamma-glutamyl transférase.' }],
  },
  BIO_HEMATOCRITE: {
    situation: 'libelle_explicite',
    candidats: [
      { codeActe: '2108', nature: 'isole', motif: 'Le libellé nomme l’hématocrite.' },
      { codeActe: '1104', nature: 'groupe_et', motif: 'Composant de l’hémogramme.' },
    ],
  },
  BIO_HBA1C: {
    situation: 'libelle_explicite',
    candidats: [{ codeActe: '1577', nature: 'isole', motif: 'Le libellé nomme l’HbA1c.' }],
  },
  BIO_INSULINEMIE: {
    situation: 'libelle_explicite',
    candidats: [{ codeActe: '7422', nature: 'isole', motif: 'Insuline (sang) ; 0703 est l’insuline libre.' }],
  },
  BIO_PLAQUETTES: {
    situation: 'libelle_explicite',
    candidats: [
      { codeActe: '1107', nature: 'isole', motif: 'Plaquettes : étude isolée.' },
      { codeActe: '1104', nature: 'groupe_et', motif: 'Composant de l’hémogramme.' },
    ],
  },
  BIO_POTASSIUM: {
    situation: 'libelle_explicite',
    candidats: [
      { codeActe: '1608', nature: 'isole', motif: 'Le libellé nomme le potassium (sang).' },
      { codeActe: '1609', nature: 'groupe_et', motif: 'Ionogramme (Na + K + éventuellement Cl).' },
      { codeActe: '1610', nature: 'groupe_et', motif: IONO_COMPLET_1610 },
    ],
  },
  BIO_TRIGLYCERIDES: {
    situation: 'libelle_explicite',
    candidats: [
      { codeActe: '0590', nature: 'isole', motif: 'Le libellé nomme les triglycérides.' },
      { codeActe: '0996', nature: 'groupe_et', motif: LIPIDES_0996 },
    ],
  },
  BIO_VITAMINE_B12: {
    situation: 'libelle_explicite',
    candidats: [{ codeActe: '1374', nature: 'isole', motif: 'Le libellé nomme la vitamine B12 (sang).' }],
  },

  // ── Dans un acte de groupe.
  BIO_HEMOGLOBINE: NFS(),
  BIO_CCMH: NFS(),
  BIO_HEMATIES: NFS(),
  BIO_IDR: NFS(),
  BIO_LEUCOCYTES: NFS(),
  BIO_LYMPHOCYTES: NFS(),
  BIO_LYMPHOCYTES_PCT: NFS(),
  BIO_MONOCYTES: NFS(),
  BIO_MONOCYTES_PCT: NFS(),
  BIO_BASOPHILES: NFS(),
  BIO_BASOPHILES_PCT: NFS(),
  BIO_NEUTROPHILES: NFS(),
  BIO_NEUTROPHILES_PCT: NFS(),
  BIO_EOSINOPHILES: NFS(),
  BIO_EOSINOPHILES_PCT: NFS(),
  BIO_TCMH: NFS(),
  BIO_VGM: NFS(),
  BIO_VPM: NFS(),
  BIO_CHLORE: {
    situation: 'acte_de_groupe',
    candidats: [
      { codeActe: '1609', nature: 'groupe_et', motif: 'Ionogramme (Na + K + éventuellement Cl) ; pas d’acte de chlore isolé.' },
      { codeActe: '1610', nature: 'groupe_et', motif: IONO_COMPLET_1610 },
    ],
  },
  BIO_SODIUM: {
    situation: 'acte_de_groupe',
    candidats: [
      { codeActe: '1609', nature: 'groupe_et', motif: 'Ionogramme ; pas d’acte de sodium sanguin isolé.' },
      { codeActe: '1610', nature: 'groupe_et', motif: IONO_COMPLET_1610 },
    ],
  },

  // ── À juger : le libellé ne tranche pas.
  BIO_FER_SERIQUE: {
    situation: 'a_juger',
    candidats: [{ codeActe: '2002', nature: 'groupe_et', motif: MARTIAL_2002 }],
  },
  BIO_CTF: { situation: 'a_juger', candidats: [{ codeActe: '2002', nature: 'groupe_et', motif: MARTIAL_2002 }] },
  BIO_TRANSFERRINE: {
    situation: 'a_juger',
    candidats: [{ codeActe: '2002', nature: 'groupe_et', motif: MARTIAL_2002 }],
  },
  BIO_ALPHA_AMYLASE: {
    situation: 'a_juger',
    candidats: [
      {
        codeActe: '1511',
        nature: 'isole',
        motif: 'Amylase dans un autre liquide biologique que le sang : la salive n’est pas nommée.',
      },
    ],
  },
  BIO_HVA_URINAIRE: {
    situation: 'a_juger',
    candidats: [
      { codeActe: '0468', nature: 'groupe_ou', motif: 'Catécholamines totales (métanéphrines ou HVA) (urine).' },
    ],
  },
  BIO_PROFIL_LIPIDIQUE: {
    situation: 'a_juger',
    candidats: [{ codeActe: '0996', nature: 'isole', motif: 'Exploration d’une anomalie lipidique.' }],
  },
  BIO_HDL: {
    situation: 'a_juger',
    candidats: [{ codeActe: '0996', nature: 'groupe_et', motif: 'Pas d’acte de HDL isolé ; exploration d’une anomalie lipidique.' }],
  },
  BIO_LDL_CALCULE: {
    situation: 'a_juger',
    candidats: [{ codeActe: '0996', nature: 'groupe_et', motif: '2001 est le LDL dosé, pas le LDL calculé.' }],
  },

  // ── Aucun acte (pas un constat signé : M-3c).
  BIO_ANTI_LDL_OXYDE: { situation: 'aucun_acte', motif: AUCUN },
  BIO_BETA_DEFENSINE_2: { situation: 'aucun_acte', motif: AUCUN },
  BIO_SELENIUM: { situation: 'aucun_acte', motif: AUCUN },
  BIO_B12_HOLOTC: {
    situation: 'aucun_acte',
    motif: '1374 dose la vitamine B12 totale, pas l’holotranscobalamine.',
  },
  BIO_6_SMT: { situation: 'aucun_acte', motif: AUCUN },
  BIO_AGCC_FECAUX: { situation: 'aucun_acte', motif: AUCUN },
  BIO_CORTISOL_8H_20H: {
    situation: 'aucun_acte',
    motif: 'Cortisol salivaire : la V105 ne cote que le sang (0462) et l’urine (0476).',
  },
  BIO_BDNF: { situation: 'aucun_acte', motif: AUCUN },
  BIO_IGA_SALIVAIRE: { situation: 'aucun_acte', motif: '1814 dose les IgA sanguines.' },
  BIO_IGA_FECALES: { situation: 'aucun_acte', motif: AUCUN },
  BIO_IODURIE: { situation: 'aucun_acte', motif: AUCUN },
  BIO_LBP: { situation: 'aucun_acte', motif: AUCUN },
  BIO_COENZYME_Q10: { situation: 'aucun_acte', motif: AUCUN },
  BIO_GLUTATHION: { situation: 'aucun_acte', motif: AUCUN },
  BIO_INDEX_OMEGA3: { situation: 'aucun_acte', motif: AUCUN },
  BIO_T3_REVERSE: { situation: 'aucun_acte', motif: AUCUN },
  BIO_ZONULINE: { situation: 'aucun_acte', motif: AUCUN },

  // ── Les sept fiches de D-323 §6 (relues en V105 par conteneur le 2026-10-18).
  BIO_T4_LIBRE: {
    situation: 'libelle_explicite',
    candidats: [
      { codeActe: '1207', nature: 'isole', motif: 'Thyroxine libre (T4 L ou FT4) seule.' },
      { codeActe: '1211', nature: 'groupe_et', motif: 'T.S.H. + T4 libre.' },
      { codeActe: '1212', nature: 'groupe_et', motif: 'T.S.H. + T4 libre + T3 libre.' },
      { codeActe: '1209', nature: 'groupe_et', motif: 'T3 libre + T4 libre.' },
    ],
  },
  BIO_T3_LIBRE: {
    situation: 'acte_de_groupe',
    candidats: [
      { codeActe: '1209', nature: 'groupe_et', motif: 'T3 libre + T4 libre ; pas d’acte de T3 libre isolé.' },
      { codeActe: '1212', nature: 'groupe_et', motif: 'T.S.H. + T4 libre + T3 libre.' },
    ],
  },
  BIO_IONOGRAMME_COMPLET: {
    situation: 'libelle_explicite',
    candidats: [{ codeActe: '1610', nature: 'isole', motif: 'Ionogramme complet (Na + K + Cl + CO2 + protides).' }],
  },
  BIO_BICARBONATES: {
    situation: 'libelle_explicite',
    candidats: [
      { codeActe: '0571', nature: 'isole', motif: 'Bicarbonates ou CO2 total (réserve alcaline).' },
      { codeActe: '1610', nature: 'groupe_et', motif: 'Ionogramme complet.' },
    ],
  },
  BIO_PROTIDES: {
    situation: 'libelle_explicite',
    candidats: [
      { codeActe: '2258', nature: 'isole', motif: 'Protéines sériques ou plasmatiques totales (protides).' },
      { codeActe: '1610', nature: 'groupe_et', motif: 'Ionogramme complet.' },
    ],
  },
  BIO_BILIRUBINE: {
    situation: 'libelle_explicite',
    candidats: [{ codeActe: '1601', nature: 'isole', motif: 'Le libellé nomme la bilirubine (sang).' }],
  },
  BIO_PHOSPHATASES_ALCALINES: {
    situation: 'libelle_explicite',
    candidats: [
      { codeActe: '0514', nature: 'isole', motif: 'Phosphatases alcalines (sang) ; 7309 est l’isoenzyme osseuse.' },
    ],
  },

  // ── Les deux fiches de coagulation de D-361 (relues en V105 par conteneur le
  // 2026-10-24). La V105 lie l'acte au traitement (0126 hors AVK, 0127 sous
  // AVK) quand le laboratoire imprime TP et INR ensemble : l'INR est à juger.
  BIO_TP: {
    situation: 'libelle_explicite',
    candidats: [
      { codeActe: '0126', nature: 'isole', motif: 'Temps de Quick (TQ, TP) en l’absence de traitement par AVK.' },
      { codeActe: '1128', nature: 'groupe_et', motif: 'Exploration de base de l’hémostase (TP + TCA + plaquettes).' },
    ],
  },
  BIO_INR: {
    situation: 'a_juger',
    candidats: [
      { codeActe: '0127', nature: 'isole', motif: 'INR : temps de Quick en cas de traitement par AVK.' },
      { codeActe: '0126', nature: 'isole', motif: 'Hors AVK, l’INR imprimé avec le TP relève du temps de Quick ; l’acte dépend du traitement.' },
    ],
  },

  // ── Les vingt acides gras de D-376 (V105 relue par conteneur le 2026-10-25 :
  // aucun libellé ne nomme les acides gras, comme pour le profil).
  BIO_AG_MYRISTIQUE: { situation: 'aucun_acte', motif: AUCUN_AG },
  BIO_AG_PALMITIQUE: { situation: 'aucun_acte', motif: AUCUN_AG },
  BIO_AG_STEARIQUE: { situation: 'aucun_acte', motif: AUCUN_AG },
  BIO_AG_LAURIQUE: { situation: 'aucun_acte', motif: AUCUN_AG },
  BIO_AG_PENTADECANOIQUE: { situation: 'aucun_acte', motif: AUCUN_AG },
  BIO_AG_HEPTADECANOIQUE: { situation: 'aucun_acte', motif: AUCUN_AG },
  BIO_AG_PALMITOLEIQUE: { situation: 'aucun_acte', motif: AUCUN_AG },
  BIO_AG_CIS_VACCENIQUE: { situation: 'aucun_acte', motif: AUCUN_AG },
  BIO_AG_TRANS_VACCENIQUE: { situation: 'aucun_acte', motif: AUCUN_AG },
  BIO_AG_RUMENIQUE: { situation: 'aucun_acte', motif: AUCUN_AG },
  BIO_AG_OLEIQUE: { situation: 'aucun_acte', motif: AUCUN_AG },
  BIO_AG_NERVONIQUE: { situation: 'aucun_acte', motif: AUCUN_AG },
  BIO_AG_ELAIDIQUE: { situation: 'aucun_acte', motif: AUCUN_AG },
  BIO_AG_LINOLEIQUE: { situation: 'aucun_acte', motif: AUCUN_AG },
  BIO_AG_GAMMA_LINOLENIQUE: { situation: 'aucun_acte', motif: AUCUN_AG },
  BIO_AG_DGLA: { situation: 'aucun_acte', motif: AUCUN_AG },
  BIO_AG_ARACHIDONIQUE: { situation: 'aucun_acte', motif: AUCUN_AG },
  BIO_AG_ALPHA_LINOLENIQUE: { situation: 'aucun_acte', motif: AUCUN_AG },
  BIO_AG_EPA: { situation: 'aucun_acte', motif: AUCUN_AG },
  BIO_AG_DHA: { situation: 'aucun_acte', motif: AUCUN_AG },

  // ── Valeurs calculées.
  BIO_RATIO_HOMA: { situation: 'valeur_calculee', motif: CALCUL },
  BIO_RATIO_CORTISOL_DHEA: { situation: 'valeur_calculee', motif: CALCUL },
  BIO_NON_HDL: { situation: 'valeur_calculee', motif: 'Calculé à partir du cholestérol total et du HDL.' },
  BIO_DFG_CKD_EPI: { situation: 'valeur_calculee', motif: 'Calculé à partir de la créatinine.' },
  BIO_RATIO_AA_EPA: { situation: 'valeur_calculee', motif: CALCUL },
  BIO_RATIO_LA_DGLA: { situation: 'valeur_calculee', motif: CALCUL },
  BIO_RATIO_OMEGA6_OMEGA3: { situation: 'valeur_calculee', motif: CALCUL },
  BIO_RATIO_KYN_TRP: { situation: 'valeur_calculee', motif: CALCUL },
  BIO_RATIO_ZINC_CUIVRE: { situation: 'valeur_calculee', motif: CALCUL },

  // ── Regroupement.
  BIO_BILAN_HEPATIQUE: {
    situation: 'regroupement',
    motif: 'La V105 cote ses composants un à un (0516, 0517, 0522, 0519, 0514).',
  },
};

/** Les candidats d'un analyte, ou `null` s'il n'est pas dans la liste. */
export function candidatsNabmPour(analyteCode: string): CandidatsAnalyteNabm | null {
  return Object.prototype.hasOwnProperty.call(CANDIDATS_NABM, analyteCode) ? CANDIDATS_NABM[analyteCode] : null;
}
