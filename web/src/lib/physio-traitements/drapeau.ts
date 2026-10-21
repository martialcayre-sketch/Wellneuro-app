// Le drapeau des données physiologiques et des traitements en cours
// ([[D-335]] §9, BP-13) : `WN_PHYSIO_TRAITEMENTS`, né ÉTEINT avec le code qui
// le lit, fail-closed ([[D-081]]). Éteint : le portail garde ses groupes de
// texte libre, le cockpit ne montre rien, la synthèse lit l'anamnèse comme
// avant, les routes répondent 503. Absent = éteint. Le client ne lit jamais
// l'environnement : la page le lit et le passe, ou la route le dit.

export function isPhysioTraitementsEnabled(value = process.env.WN_PHYSIO_TRAITEMENTS): boolean {
  return value === 'true';
}
