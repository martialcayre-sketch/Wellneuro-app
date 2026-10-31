### Corrigé

- **Feuille « Plus » du cockpit mobile : le libellé de l'item actif redevient
  lisible.** L'item actif ne posait pas de couleur de texte. Comme `<body>`
  n'en pose aucune, son libellé héritait du noir par défaut, sur le fond nuit
  du rail. Seul « Paramètres » la posait jusque-là, et le passage à
  `plusItems` l'avait perdue. L'item actif porte désormais
  `text-rail-foreground`, comme le rail desktop. Nouveau banc
  `MobileBottomNav.test.tsx` : `data-theme` sur le portail, et libellé actif
  en `rail-foreground` sur chacune des douze destinations.
