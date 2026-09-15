// LA PROVENANCE DE LA RAISON D'ÊTRE DU PROTOCOLE — [[D-189]] §3, sous
// l'arbitrage du 2026-09-15 : elle se CONSTATE À LA LECTURE, elle ne se
// persiste pas.
//
// POURQUOI PAS DE COLONNE, PAS DE CONTRAT V5. `objectifs_negocies` porte sa
// provenance dans NEUF colonnes ajoutées par une migration ; `protocol_drafts`
// n'en a aucune, et au dépôt chaque référence ajoutée au payload a reçu son
// propre contrat (V2, V3, V4). Les deux voies coûtaient une migration ou une
// version de contrat pour une marque d'affichage. Le responsable a tranché la
// troisième : le serveur RELIT les sources à chaque lecture et compare.
//
// CE QUE CETTE FORME ACHÈTE, ET CE QU'ELLE NE PROMET PAS. La marque tombe au
// premier caractère réécrit PAR CONSTRUCTION — il n'y a rien à retirer, elle ne
// se pose simplement plus. En revanche elle constate l'APPARTENANCE d'un texte
// à une source, jamais son USAGE : un praticien qui écrirait de lui-même
// exactement le libellé d'axe verrait la marque. `syntheses_comprehension`
// documente déjà cette limite comme assumée. C'est le même mécanisme que la vue
// patient recomposée de [[D-191]], et c'est devenu le style de ce chemin.
//
// CE MODULE N'IMPORTE RIEN — ni Prisma, ni route. Il se lit des deux côtés de
// la frontière client/serveur, patron de `marquesProvenance.ts`.

/** La raison d'être reprend le libellé d'axe signé, mot pour mot. */
export const PURPOSE_AXE_SIGNE = 'axe_signe';

/** La raison d'être reprend la priorité de l'objectif négocié actif, mot pour mot. */
export const PURPOSE_OBJECTIF_PRIORITE = 'objectif_priorite';

/** La raison d'être reprend la reformulation du praticien de cet objectif, mot pour mot. */
export const PURPOSE_OBJECTIF_REFORMULATION = 'objectif_reformulation';

export type MarquePurpose =
  | typeof PURPOSE_AXE_SIGNE
  | typeof PURPOSE_OBJECTIF_PRIORITE
  | typeof PURPOSE_OBJECTIF_REFORMULATION;

/** Une source que l'écran a le droit de proposer, et le serveur de constater. */
export type SourceCitablePurpose = {
  marque: MarquePurpose;
  /** Le texte, tel que la source l'énonce. Jamais reformulé ici. */
  texte: string;
  /** L'identifiant de la source citée — règle signée, ou VERSION d'objectif. */
  idSource: string;
  /** Ce que l'écran affiche pour nommer la source, en français. */
  libelle: string;
};

export type ProvenancePurpose = { marque: MarquePurpose; idSource: string } | null;

/**
 * Comparaison de citation — stricte sur le contenu, tolérante sur les bords.
 *
 * `trim` SEULEMENT, JAMAIS DE NORMALISATION PLUS LARGE, et le motif est celui
 * de `provenanceVerifiee.ts` : replier les espaces internes ou la casse ferait
 * passer pour « cité verbatim » un texte que le praticien a retouché — poser la
 * marque sur ses mots à lui, le faux symétrique de celui que `D-167` §6 nomme.
 */
export function citeExactementPurpose(purpose: string | null, source: string): boolean {
  if (purpose === null) return false;
  return purpose.trim() === source.trim();
}

/**
 * La provenance de `purpose`, ou `null`.
 *
 * LA PREMIÈRE SOURCE QUI CORRESPOND, dans l'ordre où l'appelant les a rangées —
 * et l'ordre est celui de l'écran. Deux sources au texte identique ne se
 * départagent pas : elles disent la même chose, et nommer la seconde ne
 * changerait rien à ce que le patient lit.
 */
export function constaterProvenancePurpose(
  purpose: string | null,
  sources: readonly SourceCitablePurpose[],
): ProvenancePurpose {
  const trouvee = sources.find((source) => citeExactementPurpose(purpose, source.texte));
  return trouvee ? { marque: trouvee.marque, idSource: trouvee.idSource } : null;
}

/**
 * Les sources que l'écran a le droit de proposer — liste FERMÉE à deux entrées
 * ([[D-189]] §3), et l'ordre est celui de l'écran.
 *
 * JAMAIS CITABLES, et c'est écrit ici pour que l'omission se voie : le motif
 * praticien de sélection (`DecisionPrioritySelection.rationale`, deux mille
 * caractères écrits face au rang) et le `rationale` du moteur (« Déclencheur
 * atteint — score 8 ≥ 7 »). Ils s'affichent au praticien, ils ne se citent pas
 * au patient. Aucune source non plus pour le critère J21 : il s'écrit AVEC le
 * patient, et un axe n'est pas un critère.
 *
 * Une source au texte vide n'entre pas : proposer « Reprendre » sur du vide
 * effacerait la raison d'être en un clic.
 */
export function sourcesCitablesPurpose(input: {
  /** Le libellé d'axe re-dérivé du registre SIGNÉ, ou `null` s'il ne l'est pas. */
  libelleAxe: { texte: string; idRegle: string } | null;
  /** La tête d'objectif négocié active, ou `null` — zéro ou plusieurs têtes. */
  objectif: { idObjectif: string; priorite: string | null; reformulationPraticien: string | null } | null;
}): SourceCitablePurpose[] {
  const sources: SourceCitablePurpose[] = [];
  if (input.libelleAxe && input.libelleAxe.texte.trim()) {
    sources.push({
      marque: PURPOSE_AXE_SIGNE,
      texte: input.libelleAxe.texte,
      idSource: input.libelleAxe.idRegle,
      libelle: 'L’axe de travail signé',
    });
  }
  if (input.objectif?.priorite?.trim()) {
    sources.push({
      marque: PURPOSE_OBJECTIF_PRIORITE,
      texte: input.objectif.priorite,
      idSource: input.objectif.idObjectif,
      libelle: 'La priorité de l’objectif négocié',
    });
  }
  if (input.objectif?.reformulationPraticien?.trim()) {
    sources.push({
      marque: PURPOSE_OBJECTIF_REFORMULATION,
      texte: input.objectif.reformulationPraticien,
      idSource: input.objectif.idObjectif,
      libelle: 'Votre reformulation de cet objectif',
    });
  }
  return sources;
}

/** Ce que l'écran affiche sous une raison d'être citée. */
export const LIBELLE_MARQUE_PURPOSE: Record<MarquePurpose, string> = {
  [PURPOSE_AXE_SIGNE]: 'Repris de l’axe de travail signé',
  [PURPOSE_OBJECTIF_PRIORITE]: 'Repris de la priorité de l’objectif négocié',
  [PURPOSE_OBJECTIF_REFORMULATION]: 'Repris de votre reformulation de l’objectif',
};
