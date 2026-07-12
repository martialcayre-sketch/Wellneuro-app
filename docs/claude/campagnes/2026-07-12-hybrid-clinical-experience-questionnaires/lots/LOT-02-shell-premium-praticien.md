---
id: "LOT-02-shell-premium-praticien"
titre: "Shell premium praticien, icônes et alignements"
statut: "à_faire"
dépend_de: ["LOT-01"]
---

# LOT-02 — Shell premium praticien, icônes et alignements

## But

Remplacer le shell brouillon par une structure premium, géométriquement cohérente et extensible.

## Périmètre

- rail pleine hauteur ;
- barre de commande ;
- navigation desktop/tablette/mobile ;
- vraies icônes Lucide ;
- profil, notifications et recherche uniquement si fonctionnels ;
- alignements, largeurs, densité et responsive ;
- conservation des routes et de l'authentification.

## Fichiers probables

- `web/src/components/NavBar.tsx` ou nouveau `AppShell.tsx`
- `web/src/components/ui/SidebarRail.tsx`
- `web/src/components/ui/MobileBottomNav.tsx`
- nouveaux composants de navigation ciblés
- `web/src/app/dashboard/layout.tsx`
- `web/package.json` / lockfile pour Lucide si validé
- tests Playwright du shell

## Interdits

- ne pas conserver les abréviations `AC/PT/SY/PM` comme icônes finales ;
- ne pas utiliser emoji ou caractères Unicode comme commandes ;
- ne pas ajouter de patients de démonstration dans le rail permanent ;
- ne pas conserver une recherche ou cloche factice ;
- ne pas créer de nouvelles routes métier dans ce lot ;
- ne pas refondre les pages internes ;
- ne pas introduire une bibliothèque UI massive.

## Géométrie cible

- rail structurel, sans carte englobante flottante ;
- zone d'icône 44×44 px ;
- SVG 20–21 px, `strokeWidth` uniforme ;
- ligne navigation 48–52 px ;
- état actif : un marqueur principal ;
- alignement vertical partagé avec le header ;
- largeur compacte calculée à partir des contenus réels, pas d'une valeur inférieure aux paddings ;
- breakpoints documentés et testés.

## Étapes

1. Choisir l'API du shell et minimiser les changements aux pages enfants.
2. Ajouter Lucide React si validé.
3. Remplacer chaque abréviation/emoji par une icône sémantique.
4. Construire un unique composant de navigation partagé.
5. Supprimer les cartes décoratives du rail.
6. Réaligner logo, entrées, bouton de réduction et profil.
7. Rendre la recherche réellement fonctionnelle ou la retirer temporairement.
8. Rendre les notifications réellement fonctionnelles ou les retirer temporairement.
9. Réconcilier tablette drawer et mobile bottom navigation.
10. Gérer focus trap via primitive accessible si nécessaire.
11. Tester Jour, Nuit et Auto.

## Tests

- captures 375/768/900/1024/1100/1440 px ;
- mesures d'alignement des centres d'icônes ;
- aucune collision padding/largeur ;
- aucun débordement horizontal ;
- navigation clavier ;
- Escape et retour de focus ;
- lecteurs d'écran : libellés de navigation ;
- zones tactiles ;
- routes actives ;
- état rail mémorisé si conservé ;
- mode Jour/Nuit sans décalage de layout.

## Done

- [ ] Rail pleine hauteur validé.
- [ ] Icônes cohérentes et centrées.
- [ ] Aucune affordance factice.
- [ ] Navigation responsive validée.
- [ ] Tests E2E verts.
- [ ] Captures comparatives documentées.
- [ ] LOT-03 autorisé.
