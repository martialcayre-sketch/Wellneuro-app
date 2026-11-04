// `WN_PORTAIL_MENU` ([[D-442]] §8, lot L3 de l'audit « rails et menus ») —
// valeur exacte `'true'`, absent = fermé. Variable serveur : `portail/layout.tsx`
// la lit à chaque requête.
//
// NEUF ET ÉTEINT à la livraison. Fermé, le portail est celui d'avant : ni bouton
// « Menu », ni lien d'accueil sur le mot-symbole, ni lien d'évitement.
export function menuPortailOuvert(value = process.env.WN_PORTAIL_MENU): boolean {
  return value === 'true';
}
