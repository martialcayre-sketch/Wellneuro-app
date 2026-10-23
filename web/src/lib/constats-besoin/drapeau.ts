// Le drapeau du constat du praticien sur un besoin sans score ([[D-347]] §8,
// t40) : `WN_CONSTAT_BESOIN`, né ÉTEINT avec le code qui le lit, fail-closed
// ([[D-081]]). Éteint : l'onglet « Besoins » ne montre rien de plus, la route
// répond 503. Absent = éteint. Le client ne lit jamais l'environnement : la
// page le lit et le passe.

export function isConstatBesoinEnabled(value = process.env.WN_CONSTAT_BESOIN): boolean {
  return value === 'true';
}
