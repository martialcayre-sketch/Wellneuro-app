// LE DRAPEAU DE L'ATELIER DE LA BIBLIOTHÈQUE DES OPTIONS ([[D-480]] §3, §8,
// BP-17 PR 5) : `WN_BIBLIOTHEQUE_OPTIONS_ATELIER`, éteint par défaut. Éteint,
// les routes rendent 404 avant toute lecture de session et la page n'existe
// pas.
//
// Convention des drapeaux produit (`docs/FEATURE_FLAGS.md`, section A) : seule
// la valeur exacte `true` l'allume ; `1`, `oui` ou une faute de frappe le
// laissent éteint.

export const VARIABLE_ATELIER_OPTIONS = 'WN_BIBLIOTHEQUE_OPTIONS_ATELIER';

export function atelierOptionsActif(env: Record<string, string | undefined> = process.env): boolean {
  return env[VARIABLE_ATELIER_OPTIONS] === 'true';
}

// LE DRAPEAU DU COCKPIT (BP-17 PR 6, D-480 §8) : `WN_BIBLIOTHEQUE_OPTIONS_COCKPIT`,
// éteint par défaut, distinct de celui de l'atelier — l'un ouvre la saisie au
// responsable, l'autre l'affichage au cockpit, sous le constat confirmé d'un
// dossier. Éteint, la bibliothèque n'est pas lue pour le cockpit et rien ne
// s'y affiche. Même convention : `true` exact seul.

export const VARIABLE_COCKPIT_OPTIONS = 'WN_BIBLIOTHEQUE_OPTIONS_COCKPIT';

export function cockpitOptionsActif(env: Record<string, string | undefined> = process.env): boolean {
  return env[VARIABLE_COCKPIT_OPTIONS] === 'true';
}
