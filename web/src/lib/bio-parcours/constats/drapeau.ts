// Le drapeau des constats du praticien ([[D-331]] §8, BP-11) : `WN_BIO_CONSTAT`,
// né ÉTEINT avec le code qui le lit, fail-closed ([[D-081]]). Il exige l'étage
// des résultats réels (`isCbResultsEnabled`, lui-même sur le rayon) : un
// constat cite des lignes de résultat, il ne s'ouvre pas sur un étage fermé.
// Absent = éteint. Le client ne lit jamais l'environnement : la page le lit
// et le passe par `CbFeatureProvider`.

import { isCbResultsEnabled } from '@/lib/biology-library/featureFlag';

export function isBioConstatEnabled(
  value = process.env.WN_BIO_CONSTAT,
  valueResultats = process.env.WN_CB_RESULTS_ENABLED,
  valueRayon = process.env.WN_CB_ENABLED,
): boolean {
  return isCbResultsEnabled(valueResultats, valueRayon) && value === 'true';
}

export const MESSAGE_CONSTAT_DESACTIVE = 'Les constats du parcours ne sont pas ouverts.';
