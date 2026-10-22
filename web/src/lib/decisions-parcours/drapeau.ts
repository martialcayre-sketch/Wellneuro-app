// Le drapeau des décisions de parcours ([[D-343]] §11, BP-15) :
// `WN_DECISIONS_PARCOURS`, né ÉTEINT avec le code qui le lit, fail-closed
// ([[D-081]]). Éteint : le cockpit ne montre rien, la route répond 503.
// Absent = éteint. Le client ne lit jamais l'environnement : la page le lit
// et le passe, ou la route le dit.

export function isDecisionsParcoursEnabled(value = process.env.WN_DECISIONS_PARCOURS): boolean {
  return value === 'true';
}
