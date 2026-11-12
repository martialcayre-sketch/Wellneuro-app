### Gouvernance des PR : PR-Agent devient la revue exigée (D-499, 2026-11-12)

- **Une seule revue de bot est exigée sur la tête : celle de PR-Agent**,
  prouvée par `node scripts/wn-revue-pr-agent.mjs <N>` à `0`. CodeRabbit,
  trop lent et le plus souvent sauté ou à court de quota, n'est plus attendu
  ni relancé ; Copilot n'est plus demandé.
- À défaut d'une revue de PR-Agent recevable (diff élagué, fichier exclu, run
  sur commentaire non conclu), la revue exigée est celle de `wn-reviewer`.
- Une remarque de CodeRabbit ou de Copilot, s'il en vient une, reçoit
  toujours son verdict. La passe Codex des lots P0 reste due.
- Amendés : `CLAUDE.md`, `REGLES_PR_MERGE.md`, règle de revue §1.6, skill
  `wn-merge` (étape 6).
- **Le merge est signalé à la session de la PR** (`D-499` §5) : à chaque
  merge, l'intégrateur envoie un message direct à la session qui a déclaré
  la PR, si elle est joignable, en plus de son commentaire sur la PR, qui
  fait foi.
