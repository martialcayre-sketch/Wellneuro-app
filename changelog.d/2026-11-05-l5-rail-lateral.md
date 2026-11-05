### Portail patient : le rail latéral « Mon espace », livré éteint (2026-11-05)

Lot L5 de l'audit « rails et menus », sous [[D-447]], acceptée mot pour mot
par le responsable le 2026-11-05 avant tout code.

- Sous `WN_PORTAIL_RAIL_LATERAL` (neuf, éteint, sans effet tant que
  `WN_PORTAIL_MENU` est fermé), à partir de 1 024 px, un rail latéral
  `<nav aria-label="Mon espace">` porte la liste du menu : « Mon parcours »
  puis les quatre groupes, même source, même ordre, même activation ; un seul
  `aria-current="page"`.
- Là où il paraît, il remplace le bouton « Menu » (amendement de [[D-442]]
  §1) ; un panneau ouvert se ferme au seuil. Sous 1 024 px rien ne change, et
  le questionnaire en cours garde le bouton à toute largeur, sans rail.
- Mêmes pages et même garde que le menu (majeurs seuls, murs franchis,
  fail-closed). « Autres espaces » reste sur le hub.
- Toujours déplié, sans bascule ni état mémorisé ; collé en haut de sa colonne,
  jamais fixé, donc jamais sur le pied d'urgence ; ne s'imprime pas ; cibles
  de 44 px au moins.
- Deux jetons du thème patient, `nav-rail` (15,75 rem) et `nav-active` (filet
  forêt de l'entrée active) ; mise en page du shell praticien (`gap-6`, `px-6`,
  le `px-4` du `main`) : colonne de 668 px à 1 024 px, 623,5 px en confort
  112,5 %.
- A6-R1 reçoit une troisième précision côté patient ; `.claude/rules/frontend-ui.md`
  range le rail parmi les navigations hors de `PanneauSuperpose`.

Aucune route, aucune sonde neuve, aucune migration ; `[token]/page.tsx` et
`/api/portail/session` ne sont pas touchés ; aucun composant du shell
praticien n'est repris.
