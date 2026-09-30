### Skills wn : `/wn-handoff` invocable par le modèle, et plus aucun renvoi à la base Supabase morte (2026-09-30)

- **`/wn-handoff` perd `disable-model-invocation`**, avec une description qui
  borne le déclenchement : fin de lot AVANT la PR (fenêtre de clôture), pause
  de plus d'une heure, ou demande explicite — jamais en cours de lot ; après
  le merge, seulement en rattrapage. `handoffs/README.md`, `/wn-finish`,
  `/wn-lot` et `/wn-reprompt` alignés (revue Copilot). Fait nouveau contre l'arbitrage du
  2026-08-03 : sur 30 jours, le modèle a cherché ce skill 9 fois, et les 13
  tentatives d'invoquer un `/wn-*` ont toutes échoué. C'est le seul skill `wn`
  que la méthode « un lot = une session » appelle à chaque lot. Les autres
  restent manuels (aucune demande mesurée ; `wn-pr`/`wn-merge` poussent et
  mergent).
- **`/wn-test` règle 6** renvoyait la lecture de la base de production à
  l'outil MCP Supabase (`execute_sql`), qui vise une base décommissionnée
  depuis le 2026-09-01 (`D-120`). Elle renvoie désormais au conteneur
  Scalingo (`D-087`, `.claude/rules/db-prisma.md`). Même correction dans le
  tableau de classes de `/wn-lot`, qui ajoute que merger n'applique rien.
- Écarté : le correctif `${CLAUDE_SKILL_DIR}` des préfixes `cd` pour faire
  tourner les `/wn-*` en worktree — deux fois refusé. La session principale
  revient dans la copie principale, où ils tournent tels quels.
