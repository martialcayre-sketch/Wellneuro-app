// `WN_PORTAIL_RAIL_LATERAL` ([[D-447]] §8, lot L5 de l'audit « rails et menus »)
// — valeur exacte `'true'`, absent = fermé. Variable serveur : `portail/layout.tsx`
// la lit à chaque requête.
//
// NEUF ET ÉTEINT à la livraison. Il n'a d'effet que si `WN_PORTAIL_MENU` est
// ouvert, dont le rail reprend la garde. Fermé, le portail est celui d'avant :
// ni rail, ni mise en page à deux colonnes, et le bouton « Menu » paraît à toute
// largeur.
export function railLateralOuvert(value = process.env.WN_PORTAIL_RAIL_LATERAL): boolean {
  return value === 'true';
}
