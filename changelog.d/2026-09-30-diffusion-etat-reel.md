### Diffusion : le panneau dit ce que le portail sert, plus « Non transmis » (2026-09-30)

- **Avant**, le panneau « Validation pour diffusion » affichait toujours
  « Non transmis » et « non transmise au patient ». Ce libellé datait d'avant
  la mise en service du portail : le protocole validé y était pourtant déjà
  servi, et le praticien lisait l'inverse de ce que son patient voyait.
- **Maintenant**, le badge suit le constat que la route calcule déjà, avec la
  même fonction que le portail : « Servi sur le portail », ou « Plus servi au
  patient » (l'alerte de relecture reste en dessous). Sans validation, ou
  tant que le constat n'est pas lu, aucun badge n'est affiché.
- La phrase précise qu'aucun e-mail n'annonce le protocole lui-même : seules
  les fiches d'assiette remises déclenchent l'e-mail neutre.
- Aucun changement d'API, de base ni de logique clinique.
