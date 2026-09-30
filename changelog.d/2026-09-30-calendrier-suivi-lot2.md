### Portail : les points d'étape et le cycle se comptent depuis le jour 0 du cycle — lot 2 (D-255) (2026-09-30)

- **Avant**, chaque rediffusion du protocole relançait les points d'étape
  J7, J14 et J21, la fin de cycle et le début de l'agenda alimentaire.
- **Maintenant**, ils se comptent depuis la première diffusion du cycle. Seul
  un pivot, c'est-à-dire une priorité changée, les relance.
- **Un point déjà rempli reste rempli** après une rediffusion qui ne relance
  rien : les check-ins se lisent sur toutes les versions diffusées depuis le
  jour 0.
- Le carnet praticien affiche le même début de cycle que le portail.
- En production, avec une seule diffusion et aucun check-in, rien ne change
  à l'écran.
