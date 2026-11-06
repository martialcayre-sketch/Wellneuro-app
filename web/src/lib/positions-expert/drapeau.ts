// LE DRAPEAU DE L'ATELIER DES POSITIONS D'EXPERT (D-439 §6, [[D-081]]) :
// `WN_POSITIONS_EXPERT`, éteint par défaut. Éteint, les routes rendent 404 et la
// page n'existe pas ; aucun arbitrage ne s'affiche nulle part (A2).
//
// Seule la valeur `1` l'allume : `true`, `oui` ou une faute de frappe le
// laissent éteint.

export const VARIABLE_POSITIONS_EXPERT = 'WN_POSITIONS_EXPERT';

export function positionsExpertActif(env: Record<string, string | undefined> = process.env): boolean {
  return env[VARIABLE_POSITIONS_EXPERT] === '1';
}
