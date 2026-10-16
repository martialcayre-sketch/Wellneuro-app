// LE VOCABULAIRE FERMÉ DES FICHES D'USAGE ([[D-314]] §3, §8) — pur.
//
// Ces listes sont aussi fermées PAR LA BASE (migration
// `20261016090000_fiches_usage_v1`, CHECK et triggers). Elles vivent ici pour
// que le contrat d'ingestion, la décision et l'écran refusent ce que la base
// refuserait, avec un message qui le dise, avant tout aller-retour.
// `vocabulaire.test.ts` lit la migration et refuse que les deux divergent.
//
// Module PUR, sans `node:crypto` ni Prisma : l'écran praticien l'importe.

/**
 * Les rubriques du TEXTE d'une fiche d'usage : celles du cadrage v3, §3.2,
 * moins « explication patient », hors de ce lot (arbitrage 6, D-314 §8 —
 * arbitrage 13). L'ordre est celui de l'affichage.
 */
export const RUBRIQUES_FICHE_USAGE = [
  'question',
  'population',
  'preanalytique_contexte',
  'resultats_consequences',
  'interpretations',
  'options',
  'precautions',
  'surveillance_arret',
  'limites',
  'argument_preference',
] as const;

export type RubriqueFicheUsage = (typeof RUBRIQUES_FICHE_USAGE)[number];

export function estRubriqueFicheUsage(valeur: string): valeur is RubriqueFicheUsage {
  return (RUBRIQUES_FICHE_USAGE as readonly string[]).includes(valeur);
}

/** Les deux natures d'un terme du vocabulaire signé (arbitrages 3, 7, 12). */
export const NATURES_LIBELLE = ['hypothese', 'population'] as const;
export type NatureLibelle = (typeof NATURES_LIBELLE)[number];

export function estNatureLibelle(valeur: string): valeur is NatureLibelle {
  return (NATURES_LIBELLE as readonly string[]).includes(valeur);
}

/** Formats des identifiants, fixés par la base (arbitrage 14). */
export const RE_FICHE_USAGE = /^FU_[A-Z0-9_]+$/;
export const RE_HYPOTHESE = /^HYP_[A-Z0-9_]+$/;
export const RE_POPULATION = /^POP_[A-Z0-9_]+$/;

/** La nature qu'impose le préfixe d'un terme, ou `null` s'il n'en a aucune. */
export function natureDuTerme(termeId: string): NatureLibelle | null {
  if (RE_HYPOTHESE.test(termeId)) return 'hypothese';
  if (RE_POPULATION.test(termeId)) return 'population';
  return null;
}

/** Les actes du responsable, sur une rubrique comme sur un libellé. */
export const ACTES_FICHE_USAGE = ['validee', 'retiree'] as const;
export type ActeFicheUsage = (typeof ACTES_FICHE_USAGE)[number];

export function estActeFicheUsage(valeur: string): valeur is ActeFicheUsage {
  return (ACTES_FICHE_USAGE as readonly string[]).includes(valeur);
}

/**
 * CHIFFRE TECHNIQUE, PAS UN SEUIL (`DC-20`) : la longueur d'un motif de
 * retrait, contre un dépôt démesuré — la même que celle des fiches d'assiette.
 */
export const MOTIF_MAX = 2_000;

// ─── Les classements de la structure ([[D-266]] §3, arbitrages du 2026-10-16) ─
//
// Trois axes ORTHOGONAUX par fiche, aux valeurs fixées par D-266 §3 — reprises
// ici en identifiants, jamais en phrases. Ils ne vivent que dans la structure
// signée (TS) : la base ne les porte pas, aucune migration ne les ferme.

/** Nature du lien besoin ↔ mesure : la force de preuve. */
export const NATURES_LIEN = [
  'mesure_directe',
  'information_contributive',
  'piste_exploratoire',
  'usage_non_etaye',
] as const;
export type NatureLien = (typeof NATURES_LIEN)[number];

/** Usage décisionnel : à quelle décision la mesure sert. */
export const USAGES_DECISIONNELS = [
  'confirmer_hypothese',
  'reduire_plausibilite',
  'departager_options',
  'surveiller_intervention',
  'reexaminer_strategie',
] as const;
export type UsageDecisionnel = (typeof USAGES_DECISIONNELS)[number];

/** Statut d'usage : ce que l'assistant a le droit d'en faire. */
export const STATUTS_USAGE = ['etaye_valide', 'preuves_limitees', 'non_valide'] as const;
export type StatutUsage = (typeof STATUTS_USAGE)[number];

/**
 * La correspondance nature ↔ statut (arbitrage du 2026-10-16, règle du cadrage
 * v3 §3.1) : une piste exploratoire ou un usage non étayé reste en espace de
 * réflexion — « non validé » seulement ; les deux autres natures admettent les
 * trois statuts. Une structure qui l'enfreint ne se signe pas.
 */
export const STATUTS_ADMIS_PAR_NATURE: Record<NatureLien, readonly StatutUsage[]> = {
  mesure_directe: STATUTS_USAGE,
  information_contributive: STATUTS_USAGE,
  piste_exploratoire: ['non_valide'],
  usage_non_etaye: ['non_valide'],
};

/** Les 12 besoins du guide ([[D-312]]), par leur numéro — la forme des `needIds` du dépôt. */
export const BESOINS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

/**
 * Format de l'identifiant d'une question clinique, déclarée par la structure
 * (arbitrage du 2026-10-16) en attendant la table signée des questions
 * (cadrage v3 §3.3), qui reprendra ces identifiants. Son texte en clair est la
 * rubrique « question » de chaque version, en base.
 */
export const RE_QUESTION = /^QC_[A-Z0-9_]+$/;
