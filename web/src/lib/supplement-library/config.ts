// Configuration de la voie d'ingestion du catalogue de compléments (C4A).
//
// Même motif que web/src/lib/rag/config.ts : un secret partagé, lu depuis
// l'environnement, jamais en dur. Fail-closed — si le secret n'est pas
// configuré, getSupplementLibraryConfig() lève et la route répond 503 avant
// toute tentative d'authentification.

// Un lot d'ingestion ne pose jamais 141k fiches d'un coup : le client découpe
// en lots ; la route refuse tout dépassement.
export const SUPPLEMENTS_MAX_BATCH_SIZE = 500;

// Vocabulaires FERMÉS, alignés sur les CHECK de la migration
// 20260724133000_c4_supplement_product_catalogue. Toute valeur hors de ces
// ensembles est rejetée à la validation (jamais laissée à la base).
export const SUPPLEMENTS_PROVENANCES = ['complalim', 'dgccrf', 'saisie_praticien'] as const;
export const SUPPLEMENTS_NIVEAUX_COMPLETUDE = ['bien_documentee', 'partielle', 'lacunaire'] as const;
export const SUPPLEMENTS_UNITES = ['µg', 'mg', 'g', 'mL', 'UI'] as const;

// Seul statut que la voie d'ingestion écrit : décision n°11 du moteur
// d'intention clinique — une source externe ne produit que des brouillons.
export const SUPPLEMENTS_STATUT_IMPORT = 'importee' as const;

export type SupplementProvenance = (typeof SUPPLEMENTS_PROVENANCES)[number];
export type SupplementNiveauCompletude = (typeof SUPPLEMENTS_NIVEAUX_COMPLETUDE)[number];
export type SupplementUnite = (typeof SUPPLEMENTS_UNITES)[number];

export type SupplementLibraryConfig = {
  enabled: true;
  internalSecret: string;
};

export function getSupplementLibraryConfig(): SupplementLibraryConfig {
  const internalSecret = process.env.SUPPLEMENTS_INTERNAL_SECRET?.trim();

  if (!internalSecret || internalSecret.length < 32) {
    throw new Error(
      'SUPPLEMENTS_INTERNAL_SECRET est absent ou trop court (minimum 32 caractères).',
    );
  }

  return {
    enabled: true,
    internalSecret,
  };
}
