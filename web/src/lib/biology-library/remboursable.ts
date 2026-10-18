// Dérivation du caractère remboursable d'un analyte — ÉCRITE UNE SEULE FOIS.
//
// Il n'existe pas de colonne `remboursable` en base : un booléen stocké
// divergerait de la correspondance NABM qui le fonde, et le cadrage exige
// qu'il ne soit jamais inféré. Il se calcule donc, et ce fichier est le seul
// endroit où ce calcul est écrit. CB-02a (import), CB-05 (proposition),
// CB-06 (régime documentaire) et CB-08 (UI) l'importent — aucun ne le
// réécrit, sans quoi quatre définitions divergentes décideraient du document
// que le patient reçoit.
//
// Ce que la fonction rend n'est PAS un booléen. « Remboursable » a quatre
// états cliniquement distincts, et les aplatir en oui/non ferait mentir le
// §4 du cadrage, qui fait dépendre du régime la matérialisation elle-même :
// courrier au médecin traitant pour le remboursé, document patient pour le
// reste.

/** Une correspondance analyte ↔ acte, telle qu'elle est stockée. */
export type CorrespondanceNabm = {
  codeActe: string;
  nature: 'isole' | 'groupe_et' | 'groupe_ou';
  /** Non nul si et seulement si le praticien a signé le rapprochement. */
  verifiePar: string | null;
};

/** Un acte de la nomenclature, résolu dans le millésime COURANT. */
export type ActeCourant = {
  codeActe: string;
  inactif: boolean;
  ententePrealable: boolean | null;
  acteReserve: boolean | null;
  remboursementTotal: boolean | null;
};

/** Le constat signé « aucun acte dans la nomenclature » d'un analyte (M-3c),
 *  et le millésime sur lequel il a été posé. */
export type ConstatAucunActe = {
  millesime: string;
};

export type StatutRemboursement =
  /** Aucune correspondance signée ni constat valable : personne n'a encore
   *  tranché. Ce n'est PAS « non remboursé » — c'est « pas évalué », et cela
   *  doit se dire. Un constat posé sur un millésime antérieur ne vaut plus :
   *  l'analyte repasse ici (arbitrage du 2026-10-16). */
  | 'non_evalue'
  /** Des correspondances signées existent mais aucune ne se résout dans le
   *  millésime courant, ou toutes visent un acte inactif ; ou, sans
   *  correspondance signée, un constat « aucun acte » signé sur le millésime
   *  courant. */
  | 'hors_nomenclature'
  /** Au moins un acte cote cet analyte seul ou au choix. */
  | 'remboursable'
  /** L'analyte n'est coté qu'au sein d'un groupe imposé (1211 = TSH + T4L) :
   *  le proposer seul ne le rend pas remboursable. Distinction impossible
   *  avant que `nature` sépare groupe_et de groupe_ou. */
  | 'remboursable_si_groupe';

export type ConditionRemboursement =
  | 'entente_prealable'
  | 'acte_reserve'
  | 'remboursement_partiel';

export type Remboursement = {
  statut: StatutRemboursement;
  /** Conditions à AFFICHER, jamais à soustraire du statut : une entente
   *  préalable ne rend pas un acte non remboursé, elle le conditionne. */
  conditions: ConditionRemboursement[];
  /** Les actes retenus, pour que l'écran puisse citer ses codes. */
  codesActesRetenus: string[];
  /**
   * Calculé ou regroupement signé ([[D-323]] §4) : les mesures dont l'état
   * est hérité, pour que la mention les cite. Absent pour tout autre analyte.
   */
  parMesures?: MesureRemboursement[];
  /**
   * Constituant d'un groupe signé ([[D-326]] §1) : les groupes dont il tient
   * l'acte, pour que l'écran dise d'où vient son état. Absent sinon.
   */
  parGroupes?: Array<{ code: string; libelle: string }>;
};

/**
 * Un constat « aucun acte » ne vaut que pour le millésime constaté, et
 * seulement si la nomenclature est importée (arbitrage du 2026-10-16). Écrit
 * ici une seule fois : la dérivation et l'écran (« périmé ») le lisent tous
 * deux.
 */
export function constatValable(constat: ConstatAucunActe | null, millesimeCourant: string | null): boolean {
  return constat !== null && millesimeCourant !== null && constat.millesime === millesimeCourant;
}

/**
 * Règle, en une phrase : un analyte est remboursable s'il existe au moins une
 * correspondance SIGNÉE vers un acte ACTIF du millésime COURANT.
 *
 * Les trois qualificatifs comptent, et chacun a coûté un défaut :
 *  - signée   : une ligne non signée est une proposition de rapprochement,
 *               pas une correspondance ;
 *  - actif    : lire l'`inactif` d'un millésime périmé fait dire « remboursé »
 *               d'un acte supprimé depuis ;
 *  - courant  : la correspondance porte un CODE, pas la ligne d'une version —
 *               c'est ce qui lui permet de survivre au millésime suivant.
 *
 * Sans correspondance signée, le constat signé « aucun acte » (M-3c) fait
 * dire `hors_nomenclature` — mais seulement s'il porte le millésime COURANT :
 * il atteste la lecture d'une version de la nomenclature, pas des suivantes.
 * Signature et constat s'excluent en base ; si les deux se présentaient
 * quand même, la signature l'emporte et le constat est ignoré.
 *
 * @param actesCourants actes du millésime pointé par
 *        `biology_catalog_versions_courantes`. Passer une liste vide (source
 *        jamais importée) rend `hors_nomenclature`, jamais `remboursable`.
 * @param contexte le constat de l'analyte et le millésime courant ; sans
 *        millésime courant, aucun constat ne vaut.
 */
export function deriverRemboursement(
  correspondances: readonly CorrespondanceNabm[],
  actesCourants: readonly ActeCourant[],
  contexte: { constat: ConstatAucunActe | null; millesimeCourant: string | null } = {
    constat: null,
    millesimeCourant: null,
  },
): Remboursement {
  const signees = correspondances.filter((c) => c.verifiePar !== null);
  if (signees.length === 0) {
    const valable = constatValable(contexte.constat, contexte.millesimeCourant);
    return { statut: valable ? 'hors_nomenclature' : 'non_evalue', conditions: [], codesActesRetenus: [] };
  }

  const parCode = new Map(actesCourants.map((a) => [a.codeActe, a]));
  const retenues = signees.flatMap((c) => {
    const acte = parCode.get(c.codeActe);
    return acte && !acte.inactif ? [{ correspondance: c, acte }] : [];
  });

  if (retenues.length === 0) {
    return { statut: 'hors_nomenclature', conditions: [], codesActesRetenus: [] };
  }

  const conditions = new Set<ConditionRemboursement>();
  for (const { acte } of retenues) {
    if (acte.ententePrealable === true) conditions.add('entente_prealable');
    if (acte.acteReserve === true) conditions.add('acte_reserve');
    if (acte.remboursementTotal === false) conditions.add('remboursement_partiel');
  }

  // Un seul `isole` ou `groupe_ou` suffit à rendre l'analyte cotable seul ;
  // s'il n'existe que des `groupe_et`, il ne l'est qu'accompagné.
  const cotableSeul = retenues.some(
    ({ correspondance }) => correspondance.nature !== 'groupe_et',
  );

  return {
    statut: cotableSeul ? 'remboursable' : 'remboursable_si_groupe',
    conditions: [...conditions],
    codesActesRetenus: retenues.map(({ acte }) => acte.codeActe),
  };
}

/** Une mesure d'un calculé ou d'un regroupement, telle qu'elle a compté. */
export type MesureRemboursement = {
  code: string;
  libelle: string;
  /** L'état qui a compté — celui du groupe signé pour une mesure « si groupé ». */
  statut: StatutRemboursement;
  codesActes: string[];
};

/** Du plus faible au plus fort : ce qui n'a pas été tranché d'abord. */
const ORDRE_FAIBLESSE: readonly StatutRemboursement[] = [
  'non_evalue',
  'hors_nomenclature',
  'remboursable_si_groupe',
  'remboursable',
];

/**
 * Le remboursement d'une valeur calculée ou d'un regroupement ([[D-323]] §4) :
 * il n'a pas d'acte, il hérite de ses mesures. Son état est le PLUS FAIBLE de
 * ceux de ses mesures — « non évalué » si l'une d'elles n'a été ni signée ni
 * constatée : une mesure qu'on n'a pas tranchée ne se lit pas remboursée. Une
 * mesure remboursable seulement accompagnée compte par son groupe signé
 * (`groupe`) ; sans groupe signé, par elle-même.
 *
 * Les conditions et les actes sont ceux des mesures, réunis : une entente
 * préalable sur l'une conditionne le tout.
 */
export function deriverRemboursementParMesures(
  mesures: ReadonlyArray<{
    code: string;
    libelle: string;
    remboursement: Remboursement;
    groupe: Remboursement | null;
  }>,
): Remboursement {
  if (mesures.length === 0) {
    return { statut: 'non_evalue', conditions: [], codesActesRetenus: [] };
  }
  const comptees = mesures.map(m => ({
    m,
    r: m.remboursement.statut === 'remboursable_si_groupe' && m.groupe ? m.groupe : m.remboursement,
  }));
  const statut = comptees
    .map(({ r }) => r.statut)
    .reduce((plusFaible, s) => (ORDRE_FAIBLESSE.indexOf(s) < ORDRE_FAIBLESSE.indexOf(plusFaible) ? s : plusFaible));
  return {
    statut,
    conditions: [...new Set(comptees.flatMap(({ r }) => r.conditions))],
    codesActesRetenus: [...new Set(comptees.flatMap(({ r }) => r.codesActesRetenus))],
    parMesures: comptees.map(({ m, r }) => ({
      code: m.code,
      libelle: m.libelle,
      statut: r.statut,
      codesActes: r.codesActesRetenus,
    })),
  };
}

/**
 * Le régime documentaire du §4 : qui reçoit quoi. Seul un analyte franchement
 * remboursable part par courrier au médecin traitant ; tout le reste — y
 * compris « remboursable si groupé » et « pas encore évalué » — relève du
 * document patient, qui est de toute façon systématique (décision F).
 *
 * En cas de doute, le document patient : il informe sans engager une
 * prescription que le praticien n'a pas le droit de faire.
 */
export function regimeDocumentaire(
  remboursement: Remboursement,
): 'courrier_medecin' | 'document_patient' {
  return remboursement.statut === 'remboursable'
    ? 'courrier_medecin'
    : 'document_patient';
}

/**
 * Mentions de remboursement d'un document, UNE FOIS pour tout le document
 * ([[D-316]] §2-§3) : chaque phrase nomme les analyses distinctes (par code)
 * de son état, dans l'ordre de première apparition. Dites ligne à ligne, elles
 * répétaient les libellés et faisaient passer un bilan complet au-delà de la
 * borne de consignation (8 000 caractères, 12 000 depuis le 2026-10-18). Un état sans analyse ne dit rien.
 */
export function mentionsRemboursement(
  analytes: ReadonlyArray<{ code: string; libelle: string; remboursement: Pick<Remboursement, 'statut'> }>,
  phrases: ReadonlyArray<readonly [StatutRemboursement, string]>,
): string[] {
  return phrases.flatMap(([statut, phrase]) => {
    const libelles = new Map<string, string>();
    for (const analyte of analytes) {
      if (analyte.remboursement.statut === statut && !libelles.has(analyte.code)) {
        libelles.set(analyte.code, analyte.libelle);
      }
    }
    return libelles.size > 0 ? [`${phrase} : ${[...libelles.values()].join(', ')}.`] : [];
  });
}
