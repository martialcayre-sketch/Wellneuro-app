// LA COLLECTE DOCUMENTAIRE — domaine PUR ([[D-330]], J3-collecte). Aucun accès
// base : l'écran du portail, celui du praticien et les routes en importent les
// listes, les libellés et les messages.
//
// Les deux listes fermées (catégories, motifs de retrait) sont celles des CHECK
// de la migration `documents_deposes_patient_v1` : un ajout ici sans migration
// serait refusé par la base.

export const CATEGORIES_DOCUMENT = [
  'courrier',
  'compte_rendu_consultation',
  'traitements_complements',
  'autre',
] as const;
export type CategorieDocument = (typeof CATEGORIES_DOCUMENT)[number];

/** Les mots de [[D-330]] §2 et du texte de collecte de G-11. */
export const LIBELLES_CATEGORIE_DOCUMENT: Readonly<Record<CategorieDocument, string>> = Object.freeze({
  courrier: 'Courrier',
  compte_rendu_consultation: 'Compte rendu de consultation',
  traitements_complements: 'Liste de traitements ou de compléments',
  autre: 'Autre',
});

export function estCategorieDocument(valeur: unknown): valeur is CategorieDocument {
  return typeof valeur === 'string' && (CATEGORIES_DOCUMENT as readonly string[]).includes(valeur);
}

export const MOTIFS_RETRAIT_DOCUMENT = ['depot_par_erreur', 'demande_droit'] as const;
export type MotifRetraitDocument = (typeof MOTIFS_RETRAIT_DOCUMENT)[number];

export const LIBELLES_MOTIF_RETRAIT: Readonly<Record<MotifRetraitDocument, string>> = Object.freeze({
  depot_par_erreur: 'Déposé par erreur',
  demande_droit: 'Demande de droit',
});

export function estMotifRetrait(valeur: unknown): valeur is MotifRetraitDocument {
  return typeof valeur === 'string' && (MOTIFS_RETRAIT_DOCUMENT as readonly string[]).includes(valeur);
}

/**
 * Au plus 10 dépôts par 24 heures et par dossier, à l'horloge de la base
 * ([[D-330]] §2, bornes de [[D-269]] §5). Chiffre technique (`DC-20`).
 */
export const PLAFOND_DEPOTS_24H = 10;

/** Au plus 3 documents non consultés et non retirés à la fois, par dossier. Chiffre technique (`DC-20`). */
export const PLAFOND_DOCUMENTS_NON_CONSULTES = 3;

/**
 * La catégorie COURANTE : le dernier classement du praticien, à défaut celle
 * que le patient a proposée ([[D-330]] §2). `classements` est en ordre
 * croissant d'`ordre`.
 */
export function categorieCourante(
  categorieProposee: string,
  classements: readonly { categorie: string }[],
): string {
  return classements.length > 0 ? classements[classements.length - 1].categorie : categorieProposee;
}

export function libelleCategorie(categorie: string): string {
  return estCategorieDocument(categorie) ? LIBELLES_CATEGORIE_DOCUMENT[categorie] : 'Autre';
}

/**
 * Les refus du dépôt, dits au patient. Ceux du fichier lui-même (format,
 * taille, image) sont ceux du compte rendu (`MESSAGES_DEPOT`), mêmes bornes.
 */
export const MESSAGES_DEPOT_DOCUMENT: Readonly<Record<string, string>> = Object.freeze({
  desactive: 'Cette page n’est pas disponible.',
  fichier_absent: 'Joignez le document : PDF, ou photo JPEG, PNG ou WebP.',
  categorie_absente: 'Indiquez ce que contient le document.',
  plafond_non_consultes:
    'Trois documents attendent déjà que votre praticien les ouvre. Vous pourrez en déposer un autre ensuite.',
  plafond_24h: 'Vous avez déposé dix documents en 24 heures. Réessayez plus tard.',
  document_deja_depose: 'Ce document est déjà déposé dans votre dossier.',
  dossier_cloture: 'Votre suivi est clôturé : vous ne pouvez plus déposer de document.',
});
