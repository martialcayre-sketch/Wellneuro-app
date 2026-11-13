// LE DRAPEAU DE L'ATELIER DE LA BIBLIOTHÈQUE DES OPTIONS ([[D-480]] §3, §8,
// BP-17 PR 5) : `WN_BIBLIOTHEQUE_OPTIONS_ATELIER`, éteint par défaut. Éteint,
// les routes rendent 404 avant toute lecture de session et la page n'existe
// pas.
//
// Convention des drapeaux produit (`docs/FEATURE_FLAGS.md`, section A) : seule
// la valeur exacte `true` l'allume ; `1`, `oui` ou une faute de frappe le
// laissent éteint. Le cockpit (PR 6) aura son propre drapeau, décidé par sa PR.

export const VARIABLE_ATELIER_OPTIONS = 'WN_BIBLIOTHEQUE_OPTIONS_ATELIER';

export function atelierOptionsActif(env: Record<string, string | undefined> = process.env): boolean {
  return env[VARIABLE_ATELIER_OPTIONS] === 'true';
}
