### Clinique : l'agenda du sommeil entre au snapshot dès que sa clôture l'a écrit (J3-12g, D-358)

- Le snapshot clinique écartait un agenda du sommeil entier pour une seule
  rubrique absente ou nulle, alors que le cockpit et le portail le
  comptaient. Il l'accepte désormais tel que la clôture l'a écrit : métrique
  non couverte (`null`), compteur ajouté après la clôture, agenda sous le
  seuil d'agrégation. Le nombre de nuits reste exigé, une valeur illisible
  reste refusée, et les autres questionnaires ne changent pas.
- Aucun indice, aucun seuil, aucune source ne bouge ; la version du score
  reste v15. Un agenda à indice compte au besoin 5 du snapshot comme il
  comptait déjà aux écrans ; un agenda sans indice reste non mesuré, sans
  être dit « incomplet ».
- Les cartes de décision dont l'épisode inclut un tel agenda dérivent au
  déploiement : trois approbations de diffusion actives sont à réapprouver par
  le praticien. Inventaire et compte :
  `docs/claude/propositions/2026-10-24-j3-12g-completude-agenda/README.md`.
