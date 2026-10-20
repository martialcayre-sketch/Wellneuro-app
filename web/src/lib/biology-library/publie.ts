// L'ENTRÉE PUBLIÉE DE BIOFLOW — [[D-306]] §1 et §4 (lettre j, J3-bioflow, plan F63).
//
// Un module est publié quand quatre choses sont écrites : son entrée publiée
// (la liste fermée des fichiers que les autres domaines peuvent importer), les
// tables dont il est propriétaire, les drapeaux dont l'extinction le ferme, et
// un lecteur hors de son domaine qui passe par cette seule entrée. Les quatre
// sont ici ; `bioflowPublie.guard.test.ts` les tient.
//
// RÈGLE DE DÉPENDANCE ([[D-306]] §2) : un autre domaine ne lit la biologie que
// par ce fichier. Les imports directs qui existaient le jour de la publication
// sont des dérogations datées, listées dans le banc ; leur liste ne peut que
// diminuer. Publier un symbole de plus, c'est étendre `FICHIERS_PUBLIES` et la
// ré-export ci-dessous, par un diff relu.
//
// ENTRÉE SERVEUR : elle ré-exporte du code qui lit la base. Un composant client
// n'importe pas ce fichier (`bundleClient.guard.test.ts`).

// Premier lecteur hors biologie : la clôture et la désactivation d'un dossier
// ([[D-282]] §9), qui refusent tant qu'une lecture de compte rendu est ouverte.
export {
  aucuneLectureDemandee,
  DELAI_TRANSACTION_CLOTURE_MS,
  MESSAGE_LECTURE_EN_COURS,
  RAISON_LECTURE_EN_COURS,
} from './import/lectureDemandee';

// Deuxième lecteur hors biologie : « Mes échanges » au portail ([[D-293]]), qui
// liste les comptes rendus transmis par le patient — date seule, sous le
// drapeau de la surface qui les sert.
export { isBioPortailEnabled } from './featureFlag';
export { listerTransmissions } from './import/transmission';

// Troisième lecteur hors biologie : la collecte documentaire ([[D-330]],
// J3-collecte), dont les bornes sont celles du compte rendu (arbitrage 4) — la
// validation du fichier (signature des octets, 10 Mio, image réencodée sans
// métadonnées, empreinte), jamais le dépôt d'un compte rendu ni ses tables.
export {
  empreinteSha256,
  estTypeCompteRendu,
  jugerFichier,
  MESSAGES_DEPOT,
  preparerImage,
  TAILLE_MAX_OCTETS,
  type TypeMimeCompteRendu,
} from './import/depot';

/** Les fichiers de `biology-library` que cette entrée ré-exporte — liste fermée. */
export const FICHIERS_PUBLIES = ['import/lectureDemandee', 'featureFlag', 'import/transmission', 'import/depot'] as const;

/**
 * Les tables dont BioFlow est propriétaire (`@@map` du schéma). Le banc vérifie
 * que chacune existe et qu'aucune table de biologie n'y manque.
 */
export const TABLES_BIOFLOW = [
  'annulations_resultats_biologiques',
  'arbitrages_biologiques',
  'biology_analyte_composition_items',
  'biology_analyte_compositions',
  'biology_analyte_links',
  'biology_analyte_nabm',
  'biology_analyte_nabm_constats',
  'biology_analyte_nabm_journal',
  'biology_analytes',
  'biology_catalog_versions_courantes',
  'biology_functional_ranges',
  'biology_nabm_actes',
  'biology_panel_items',
  'biology_panels',
  'biology_preanalytics',
  'biology_ratios',
  'biology_reference_ranges',
  'biology_source_snapshots',
  'comptes_rendus_biologiques',
  'documents_patient_biologie',
  'imports_biologiques',
  'lectures_imports_biologiques',
  'lignes_biologiques_candidates',
  'masquages_comptes_rendus',
  'panels_biologie_documentes',
  'resultats_biologiques',
  'statuts_poses_resultats_biologiques',
  'travaux_extraction_biologique',
] as const;

/**
 * Les drapeaux dont l'extinction ferme BioFlow, lus par `featureFlag.ts`.
 * `WN_CB_ENABLED` ferme tout ; chacun des autres ferme son étage.
 */
export const DRAPEAUX_BIOFLOW = [
  'WN_CB_ENABLED',
  'WN_CB_PROPOSITION',
  'WN_CB_RESULTS_ENABLED',
  'WN_BIO_INGEST_ENABLED',
  'WN_BIO_LECTURE_ENABLED',
  'WN_BIO_PORTAIL_ENABLED',
] as const;
