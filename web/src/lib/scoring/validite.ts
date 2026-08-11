// Validité clinique des passations (LOT-00, campagne « chaîne T0 »).
//
// Le statut vit sur questionnaire_reponses.statut_validite (migration
// 20260811030000). Doctrine, identique au commentaire du schéma : VALID et
// AMBIGUOUS alimentent le raisonnement clinique (AMBIGUOUS est signalé au
// praticien, jamais exclu en silence) ; INVALID, SUPERSEDED et HISTORICAL_ONLY
// en sortent — synthèse, orientation, équilibre/momentum, cockpit — mais la
// ligne reste lisible partout ailleurs (inbox, audit, dejaRepondu).
//
// DRAPEAU ÉTEINT PAR DÉFAUT (WN_ENABLE_VALIDITE_PASSATIONS) : tant que la
// migration n'est pas relâchée en production par release-db, ce module ne doit
// rien changer au comportement — drapeau éteint, aucune passation n'est
// exclue, quel que soit son statut. C'est la matérialisation de la règle
// « migration et code dépendant en PR séparées, ou drapeau éteint ».
//
// Un champ ABSENT (ancien client Prisma, fixture de test, mock) vaut VALID :
// l'exclusion ne s'applique qu'à un statut explicitement porté. Une valeur
// inconnue est impossible en base (contrainte CHECK) ; si elle apparaissait
// malgré tout (fixture erronée), elle serait traitée comme VALID plutôt que
// d'exclure en silence — le CHECK en base est le vrai garde.

export const STATUTS_VALIDITE = [
  'VALID',
  'AMBIGUOUS',
  'INVALID',
  'SUPERSEDED',
  'HISTORICAL_ONLY',
] as const;

export type StatutValidite = (typeof STATUTS_VALIDITE)[number];

const STATUTS_EXCLUS_DU_RAISONNEMENT: ReadonlySet<string> = new Set([
  'INVALID',
  'SUPERSEDED',
  'HISTORICAL_ONLY',
]);

export function validitePassationsActive(): boolean {
  return process.env.WN_ENABLE_VALIDITE_PASSATIONS === '1';
}

/**
 * Vrai si la passation doit sortir du raisonnement clinique. Drapeau éteint ou
 * statut absent → jamais exclue.
 */
export function estExclueDuRaisonnement(statutValidite: string | null | undefined): boolean {
  if (!validitePassationsActive()) return false;
  if (!statutValidite) return false;
  return STATUTS_EXCLUS_DU_RAISONNEMENT.has(statutValidite);
}

/**
 * Filtre une liste de passations pour le raisonnement clinique. Ne retire
 * jamais rien d'autre que les statuts exclus : l'ordre et le reste des lignes
 * sont préservés tels quels.
 */
export function filtrerPassationsExploitables<T extends { statutValidite?: string | null }>(
  reponses: readonly T[],
): T[] {
  if (!validitePassationsActive()) return [...reponses];
  return reponses.filter((r) => !estExclueDuRaisonnement(r.statutValidite));
}
