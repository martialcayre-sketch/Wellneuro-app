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

export type StatutRemboursement =
  /** Aucune correspondance signée : personne n'a encore tranché. Ce n'est
   *  PAS « non remboursé » — c'est « pas évalué », et cela doit se dire. */
  | 'non_evalue'
  /** Des correspondances signées existent mais aucune ne se résout dans le
   *  millésime courant, ou toutes visent un acte inactif. */
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
};

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
 * @param actesCourants actes du millésime pointé par
 *        `biology_catalog_versions_courantes`. Passer une liste vide (source
 *        jamais importée) rend `hors_nomenclature`, jamais `remboursable`.
 */
export function deriverRemboursement(
  correspondances: readonly CorrespondanceNabm[],
  actesCourants: readonly ActeCourant[],
): Remboursement {
  const signees = correspondances.filter((c) => c.verifiePar !== null);
  if (signees.length === 0) {
    return { statut: 'non_evalue', conditions: [], codesActesRetenus: [] };
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
