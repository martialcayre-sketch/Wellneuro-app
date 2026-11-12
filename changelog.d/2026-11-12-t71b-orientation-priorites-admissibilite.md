### Orientation et priorités : validité des claims constatée au service (D-495, t71, 2026-11-12)

Dette t71 (§8), versée par t66. Les arbitrages du responsable portent sur les questions 20261111-1556-a à 1559-a, puis
sur 2116-a à 2118-a. Le lot ne comporte aucune migration ni aucune re-signature : `ORIENTATION_RULES_V1`,
`PRIORITY_RULES_V1`, leurs empreintes, le référentiel `rules` de la revue et `VERSION_DECISION_CARD` sont inchangés.
`release-db` est à approuver séparément.

- **Orientation.** Une règle dont un claim n'est pas admissible n'est pas passée au moteur et ne propose rien. Le
  cockpit affiche « Règle d’orientation non appliquée », avec les claims concernés, dans une rubrique distincte des
  « non évaluées ». Si le corpus est illisible, l'orientation n'est pas affichée et le panneau le dit.
- **Convergence (DC-29).** Seules les règles appliquées comptent, au cockpit comme dans la synthèse. Une règle non
  appliquée n'ouvre plus de besoin et ses conditions ne sont plus comptées. Si le corpus est illisible, le panneau
  affiche « Convergences non évaluées ».
- **Priorités.** Une priorité dont un claim n'est pas admissible est écartée après la gate de population, avant le
  classement. La carte l'affiche (« Priorité non proposée »), et la priorité reste reprenable comme priorité libre.
  Si le corpus est illisible, la carte indique « Aucune priorité issue des règles n’est proposée ». Les quatre
  constructions de la chaîne C1 lisent l'admissibilité par la même fonction.
- **Empreinte et protocole diffusé.** Les deux champs nouveaux de la carte sont absents quand ils sont vides : la carte
  d'un dossier ordinaire garde son empreinte. Sur un dossier où une priorité tombe, le protocole diffusé s'interrompt
  sans révocation et reprend seul si l'empreinte approuvée revient.
- **Fixture E2E.** Elle pose aussi les couples d'orientation et de priorité comme admissibles.
- **§8 du plan.**
  - La ligne t71 est soldée.
  - La ligne t77 est complétée : la synthèse n'explique ni une règle non appliquée, ni une convergence retirée, ni un
    corpus illisible.
  - Une nouvelle dette est inscrite : le texte de l'écran de diffusion attribue la dérive au « dossier ».
