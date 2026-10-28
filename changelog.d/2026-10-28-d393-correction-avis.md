### Gouvernance : D-393 §2(d), l'avis de mise à jour de PR-Agent n'est pas une revue (2026-10-28)

- La condition (d) de la preuve d'une revue de PR-Agent se lit en liste
  fermée. À côté du commentaire persistant, seuls la description
  (`pr-agent:describe:persistent`) et l'avis d'une ligne « Persistent review
  … updated to latest commit » sont admis. Tout autre commentaire, dont une
  revue « ## Standalone PR Review », la fait échouer. Pris à la lettre,
  l'ancien texte faisait échouer (d) à chaque PR : c'est constaté sur #1766
  et #1769.
- Ligne datée sous D-393 §2. Règle 1.6 et étape 6 de `wn-merge` alignées.
  Journal de H93 : (a) et (b) mergées, premier merge sur la preuve.
