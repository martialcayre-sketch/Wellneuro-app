// `WN_PORTAIL_BARRE_BASSE` ([[D-444]] §8, lot L4 de l'audit « rails et menus »)
// — valeur exacte `'true'`, absent = fermé. Variable serveur : `portail/layout.tsx`
// la lit à chaque requête.
//
// NEUF ET ÉTEINT à la livraison. Il n'a d'effet que si `WN_PORTAIL_MENU` est
// ouvert, dont la barre reprend la garde. Fermé, le portail est celui d'avant :
// ni barre, ni réserve de bas, ni export `viewport`.
export function barreBasseOuverte(value = process.env.WN_PORTAIL_BARRE_BASSE): boolean {
  return value === 'true';
}
