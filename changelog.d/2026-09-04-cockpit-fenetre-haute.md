### La baseline du cockpit se prend en fenêtre haute, pas en page entière (2026-09-04)

Correction d'un correctif du même jour. Le passage de `fiche-cockpit` en
`fullPage` reposait sur une prémisse fausse : que le cockpit dépassait la
fenêtre par le bas. **Mesuré sur l'image produite, il n'a gagné que 88 pixels**
— 1440×988 contre 1440×900 — sans rien montrer de plus.

Le cockpit est un **trois-colonnes dont chaque colonne défile pour elle-même**,
bornée à la hauteur de fenêtre (`FichePatientPanel`,
`lg:h-[calc(100dvh-11.75rem)] lg:overflow-y-auto`). C'est le principe `A6-R1` :
naviguer par phase, jamais défiler la page. `fullPage` photographie donc la
page, qui ne dépasse presque pas — l'intérieur des colonnes lui reste
inaccessible.

Les colonnes étant dimensionnées sur `100dvh`, **seule une fenêtre haute les
étire**. La capture se prend désormais à 1440×2200, et le cockpit y tient
entier. Le tiroir des 12 besoins reste en fenêtre ordinaire : c'est un `dialog`
ancré au viewport, que l'étirer ne rendrait pas plus lisible.

La leçon vaut au-delà de ce cas : `fullPage` ne voit pas ce qu'un conteneur
cache. Une interface conçue pour ne pas défiler ne se photographie pas en page
entière.
