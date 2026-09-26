### Décision : la fiche d'assiette part au patient au clic « Valider pour diffusion » (2026-09-26)

- **Décision seule, aucun code livré** (`D-251`). Quand le praticien choisit
  une assiette dans une action « Alimentation », le patient recevra la Fiche MY
  de cette assiette, adaptée par IA puis relue et validée par le praticien. Il
  la lira dans un espace de son portail, annoncée par un e-mail neutre qui ne
  nomme pas l'assiette.
- Les réserves de sécurité de chaque assiette figurent dans la fiche, en renvoi
  vers le praticien. Aucune quantité ni recette n'est inventée ; les recettes
  types viendront en seconde version, validées une à une.
- Le texte des fiches ne touche jamais le dépôt : il vit en base. Onze lots,
  dont deux migrations ; le drapeau `WN_FICHES_ASSIETTE` est livré fermé.
