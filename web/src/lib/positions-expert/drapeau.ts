// LE DRAPEAU DE L'ATELIER DES POSITIONS D'EXPERT (D-439 §6, [[D-081]]) :
// `WN_POSITIONS_EXPERT`, éteint par défaut. Éteint, les routes rendent 404 et la
// page n'existe pas ; aucun arbitrage ne s'affiche nulle part (A2).
//
// Convention des drapeaux produit (`docs/FEATURE_FLAGS.md`, section A) : seule
// la valeur exacte `true` l'allume ; `1`, `oui` ou une faute de frappe le
// laissent éteint. Le `1` est celui des doubles verrous cliniques (section C),
// que ce drapeau n'est pas (revue PR-Agent de #1893).

export const VARIABLE_POSITIONS_EXPERT = 'WN_POSITIONS_EXPERT';

export function positionsExpertActif(env: Record<string, string | undefined> = process.env): boolean {
  return env[VARIABLE_POSITIONS_EXPERT] === 'true';
}
