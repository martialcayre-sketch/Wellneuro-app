### Corrigé

- **`wn-cycle` : le premier fichier non committé était amputé de sa première
  lettre.** Le wrapper `git()` appliquait un `.trim()` global sur la sortie de
  `status --porcelain`, ce qui mange l'espace de tête de la **première ligne**
  (` M chemin`). Le découpage par position emportait alors un caractère du
  chemin — `docs/claude/HANDOFF_CURRENT.md` devenait `ocs/…` — et la clôture
  disparaissait du verdict, silencieusement et sur cette seule ligne. Le défaut
  s'est révélé à la première utilisation réelle du script, sur lui-même. Le
  découpage se fait désormais par motif de statut, et la sortie porcelain n'est
  plus trimée. Banc de régression ajouté.
