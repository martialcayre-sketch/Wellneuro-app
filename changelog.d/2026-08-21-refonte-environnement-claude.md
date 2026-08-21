### Outillage — l'environnement Claude Code perd son overhead, pas ses verrous

- `CLAUDE.md` redescend de 271 à 186 lignes : les règles de sous-système
  partent dans `.claude/rules/` (path-scopées, mécanisme natif), dont un
  nouveau `tests-validation.md` qui reçoit l'historique E2E/D-049 ; la
  constitution clinique complète vit dans `clinique-scoring.md`.
- Le routage modèle tient en une règle de six lignes (défaut Sonnet 5 + high
  + solo ; Opus sur risque ; Fable sur ≥ 2 signaux forts ; Ultracode = largeur
  opt-in) : `wn-route`/`wn-model`/`wn-ultra`/`wn` passent de 145 à 79 lignes.
- Quatre redondances avec le natif retirées : `wn-plan` (mode Plan natif),
  `wn-review` (`/code-review` + `Agent(wn-reviewer)` — ses contrôles cliniques
  migrés dans `clinique-scoring.md`), `wn-context` (doublon de `wn-handoff`),
  agent `wn-explorer` (agent natif `Explore`).
- `wn-cycle.mjs` gagne `--local` (zéro appel réseau pour les faits de clôture ;
  `wn-finish`/`wn-handoff` l'utilisent) et perd un appel git mort et un
  redondant ; `wn-attendre-ci.mjs` espace ses polls à 120 s au-delà de 15 min
  de délai demandé — tous les diagnostics de sécurité conservés ; le préambule
  de `wn-merge` réutilise le snapshot au lieu d'un `gh pr view`.
- Les récits historiques des workflows CI (129 lignes) rejoignent l'ADR
  `2026-08-07-commentaires-workflows.md` ; les invariants restent sur place.
- Aucun hook ni garde-fou modifié (vérifié motif par motif : 10+3 Bash,
  9+3 fichiers, 6+24 SQL, enveloppes et vecteurs inchangés) ;
  `log-bash-command` était déjà asynchrone.
