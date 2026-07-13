---
id: "LOT-02-shell-premium-praticien"
titre: "Shell premium praticien, icônes et alignements"
statut: "terminé"
dépend_de: ["LOT-01"]
---

# LOT-02 — Shell premium praticien, icônes et alignements

## But

Remplacer le shell brouillon par une structure premium, géométriquement cohérente et extensible, puis préparer les accélérateurs praticien sans afficher d'affordance factice.

## Périmètre

- rail pleine hauteur ;
- barre de commande ;
- navigation desktop/tablette/mobile ;
- vraies icônes Lucide ;
- profil, notifications et recherche uniquement si fonctionnels ;
- palette de commandes si son périmètre est validé en LOT-00 ;
- alignements, largeurs, densité et responsive ;
- conservation des routes et de l'authentification.

## Fichiers probables

- `web/src/components/NavBar.tsx` ou nouveau `AppShell.tsx`
- `web/src/components/ui/SidebarRail.tsx`
- `web/src/components/ui/MobileBottomNav.tsx`
- nouveaux composants de navigation ciblés
- éventuel composant `CommandPalette`
- `web/src/app/dashboard/layout.tsx`
- `web/package.json` / lockfile pour Lucide et primitive command si validés
- tests Playwright du shell

## Interdits

- ne pas conserver les abréviations `AC/PT/SY/PM` comme icônes finales ;
- ne pas utiliser emoji ou caractères Unicode comme commandes ;
- ne pas ajouter de patients de démonstration dans le rail permanent ;
- ne pas conserver une recherche ou cloche factice ;
- ne pas créer de nouvelles routes métier dans ce lot ;
- ne pas refondre les pages internes ;
- ne pas introduire une bibliothèque UI massive ;
- ne pas permettre une action destructive directe depuis la palette ;
- ne pas stocker dans l'historique local de la palette des données patient sensibles.

## Géométrie cible

- rail structurel, sans carte englobante flottante ;
- zone d'icône 44×44 px ;
- SVG 20–21 px, `strokeWidth` uniforme ;
- ligne navigation 48–52 px ;
- état actif : un marqueur principal ;
- alignement vertical partagé avec le header ;
- largeur compacte calculée à partir des contenus réels, pas d'une valeur inférieure aux paddings ;
- breakpoints documentés et testés.

## Palette de commandes

Si validée en LOT-00 :

- raccourci `Ctrl/Cmd + K` ;
- recherche patients et navigation vers fonctions réellement disponibles ;
- commandes françaises ;
- droits et disponibilité respectés ;
- aucune suppression, transmission ou prescription immédiate ;
- confirmation ou écran intermédiaire pour les actions engageantes ;
- alternative complète par navigation visible ;
- fermeture par `Escape` et retour du focus.

Une palette partielle ou simulée ne doit pas être livrée. Si la recherche globale réelle n'est pas disponible, réduire le périmètre ou différer.

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
11. Implémenter la palette uniquement si son contrat et ses sources de données sont validés.
12. Tester le mode clair unique (praticien et patient).

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
- mode clair unique sans décalage de layout ;
- palette : résultats corrects, absence d'action destructive directe et aucune donnée sensible persistée.

## Done

- [x] Rail pleine hauteur validé (desktop, tiroir tablette, barre basse mobile).
- [x] Icônes cohérentes et centrées (Lucide, 20–21px, `strokeWidth={2}`, zone 44×44 sur le rail desktop/tiroir).
- [x] Aucune affordance factice (recherche/cloche retirées, carte de démo retirée).
- [x] Navigation responsive validée (desktop/tablette/mobile).
- [x] Palette de commandes différée explicitement (arbitrage LOT-00, non livrée).
- [x] Tests E2E verts (`dashboard-praticien.spec.ts` 4/4, `portail-parcours.spec.ts`).
- [x] Captures comparatives documentées (vérification visuelle manuelle desktop/tablette/mobile, tiroir et sheet ouverts).
- [ ] LOT-03 autorisé — en attente d'instruction explicite séparée.

## Résultats

- Lucide React et `@radix-ui/react-dialog` installés et adoptés (première utilisation réelle des autorisations `design-system-d1.md` §5).
- Tiroir tablette et sheet mobile reconstruits sur `Dialog.Root`/`Dialog.Portal`/`Dialog.Content` Radix : focus trap complet, Escape, retour de focus obtenus nativement — corrige une lacune réelle du tiroir tablette (n'avait ni Escape ni focus trap avant ce lot).
- Bug découvert et corrigé pendant l'implémentation : `Dialog.Portal` rend hors du conteneur `[data-theme="praticien"]`, les tokens `--rail-*` ne résolvaient à rien (fond transparent, page visible au travers). Corrigé en posant `data-theme="praticien"` directement sur `Dialog.Overlay`/`Dialog.Content` — documenté dans `design-system-d1.md` comme piège à éviter pour toute future primitive Radix portée.
- `docs/design-system-d1.md` amendé (section 4 : traçabilité ; nouvelle sous-section « Shell premium praticien — HC-F LOT-02 » ; section 5 : primitives marquées adoptées).
