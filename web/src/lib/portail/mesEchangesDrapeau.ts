// `WN_PORTAIL_MES_ECHANGES` ([[D-293]], J3-base) — valeur exacte `'true'`,
// absent = fermé. Variable serveur : la page et la route la lisent, un composant
// client ne la voit pas.
//
// NEUF ET ÉTEINT à la livraison. Il ne se pose pas avant le code de ai
// ([[D-293]] §4 : « tant qu'il n'existe pas, Mes échanges ne s'ouvre pas ») ; il
// s'ouvre avec ACT-3, place 3 de la file C (H76).

export function mesEchangesOuvert(value = process.env.WN_PORTAIL_MES_ECHANGES): boolean {
  return value === 'true';
}
