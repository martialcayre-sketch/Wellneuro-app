// LE VOCABULAIRE DE LA BIBLIOTHÈQUE DES OPTIONS ([[D-480]] §1 à §4, BP-17) —
// module pur, sans base ni `node:crypto` : un composant client peut l'importer.
//
// Deux listes vivent aussi en base, fermées par la migration
// `20261111180000_bibliotheque_options_textes_v1` (PR 2) : les neuf rubriques
// et le format de l'identifiant d'option. `vocabulaire.test.ts` lit la
// migration et rougit si le code et la base divergent. Aucun identifiant ni
// format ne porte de sens clinique : ce sont des clés.

/**
 * Les neuf rubriques d'une option ([[D-480]] §1), dans l'ordre de la
 * migration. Produit et statut réglementaire forment UNE rubrique (arbitrage
 * du 2026-11-11). La population n'en est pas une : elle passe par renvoi au
 * vocabulaire `POP_…` des fiches d'usage ([[D-417]] §1).
 */
export const RUBRIQUES_OPTION = [
  'produit_statut_reglementaire',
  'dose',
  'duree',
  'precautions',
  'contre_indications',
  'interactions',
  'surveillance',
  'critere_arret',
  'role_praticien',
] as const;

export type RubriqueOption = (typeof RUBRIQUES_OPTION)[number];

export function estRubriqueOption(valeur: string): valeur is RubriqueOption {
  return (RUBRIQUES_OPTION as readonly string[]).includes(valeur);
}

/**
 * CHIFFRE TECHNIQUE, PAS UN SEUIL (`DC-20`) : la longueur maximale d'un
 * identifiant d'option, celle du CHECK `bibliotheque_options_textes_option_format`.
 */
export const OPTION_ID_LONGUEUR_MAX = 128;

/**
 * L'identifiant d'une option : `OPT_` puis des majuscules ASCII, des chiffres
 * et des soulignés, au plus 128 caractères en tout. OPAQUE — il ne dit ni le
 * produit, ni la dose, ni l'hypothèse — et JAMAIS RÉATTRIBUÉ : une option
 * retirée garde son identifiant dans `optionsRetirees`, et aucune autre ne le
 * reprend. Un identifiant conforme passe le CHECK de la base (aucun blanc,
 * 128 caractères au plus).
 */
export const RE_OPTION = /^OPT_[A-Z0-9_]+$/;

export function estIdentifiantOption(valeur: string): boolean {
  return RE_OPTION.test(valeur) && valeur.length <= OPTION_ID_LONGUEUR_MAX;
}

// ─── Les renvois d'une rubrique ([[D-480]] §4) ──────────────────────────────
//
// Une rubrique renvoie à ses sources, jamais à un texte : un claim certifié,
// cité `identifiant@version` ; une position d'expert, citée par version
// `WN-PE-NNNN@vN.M` ([[D-480]] §5.3) ; ou, pour la DOSE seule, l'information
// manquante, jamais une valeur (cadrage §4.2, `DC-01`). Les formats sont ceux
// des claims épinglés des tables signées et des positions d'expert.

/** `WN-CL-NNNN-NNN@vN.M` — le `v` est exigé, comme dans les claims épinglés. */
export const RE_RENVOI_CLAIM = /^(WN-CL-[0-9]{4}-[0-9]{3})@(v[0-9]+\.[0-9]+)$/;
/** `WN-PE-NNNN@vN.M` — le format des versions de position ([[D-439]]). */
export const RE_RENVOI_POSITION = /^(WN-PE-[0-9]{4})@(v[0-9]{1,4}\.[0-9]{1,4})$/;
/** La dose sans source : « information manquante », jamais une valeur. */
export const INFORMATION_MANQUANTE = 'information_manquante';

/** La seule rubrique qui admet l'information manquante ([[D-480]] §4). */
export const RUBRIQUES_INFORMATION_MANQUANTE: readonly RubriqueOption[] = ['dose'];

export type Renvoi =
  | { nature: 'claim'; claimId: string; versionClaim: string }
  | { nature: 'position'; positionId: string; version: string }
  | { nature: 'information_manquante' };

/** Le renvoi lu, ou `null` s'il est mal formé. */
export function lireRenvoi(valeur: string): Renvoi | null {
  if (valeur === INFORMATION_MANQUANTE) return { nature: 'information_manquante' };
  const claim = RE_RENVOI_CLAIM.exec(valeur);
  if (claim) return { nature: 'claim', claimId: claim[1], versionClaim: claim[2] };
  const position = RE_RENVOI_POSITION.exec(valeur);
  if (position) return { nature: 'position', positionId: position[1], version: position[2] };
  return null;
}
