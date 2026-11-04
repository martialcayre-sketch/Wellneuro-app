// `WN_PORTAIL_FRISE_NAVIGABLE` ([[D-423]] §7 et §8, lot L2b de l'audit « rails
// et menus ») — valeur exacte `'true'`, absent = fermé. Variable serveur : le
// layout du hub la lit et la passe au composant client par contexte.
//
// NEUF ET ÉTEINT à la livraison. Fermé, le hub rend la frise d'avant, repère
// non navigable ; ouvert, la même frise devient une navigation vers des cibles
// existantes seulement.
export function friseNavigableOuverte(value = process.env.WN_PORTAIL_FRISE_NAVIGABLE): boolean {
  return value === 'true';
}
