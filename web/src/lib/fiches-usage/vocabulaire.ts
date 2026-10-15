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
