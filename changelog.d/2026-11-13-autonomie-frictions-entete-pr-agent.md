### Autonomie des sessions, frictions (2) : l'en-tête de `pr_agent.yml` suit D-499 (2026-11-13)

- `.github/workflows/pr_agent.yml`, commentaires seulement : l'en-tête ne
  renvoie plus une PR de clôture seule à CodeRabbit « demandé à la main ».
  Il pose la condition de D-499 : la revue de PR-Agent sur la tête, prouvée
  par `wn-revue-pr-agent.mjs` → 0, et, à défaut, `wn-reviewer` sur la tête
  (D-448, D-499 §2). Même correction sur le commentaire du plafond de
  contexte, qui renvoyait une revue compressée à CodeRabbit.
- Aucun réglage, déclencheur, permission ni image ne change : la revue
  produite est identique.
