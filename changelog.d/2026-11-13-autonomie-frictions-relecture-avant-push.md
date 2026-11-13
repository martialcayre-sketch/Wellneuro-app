### Autonomie des sessions, frictions (4) : relecture adverse locale avant le push (2026-11-13)

- `.claude/agents/wn-reviewer.md` reçoit une grille de six classes de
  défauts, que le relecteur passe à chaque revue et sur lesquelles il rend un
  verdict une à une :
  - concurrence et verrous ;
  - ordre des gardes ;
  - horloge et fuseau ;
  - statuts énumérés ;
  - patron d'authentification ;
  - messages bruts persistés ou journalisés.

  Ce sont les classes que les revues externes relevaient après l'ouverture de
  la PR (audit du cadrage « autonomie des sessions », 2026-11-12).
- `docs/claude/POLITIQUE_REVUE.md` : la passe interne du barème
  (`/code-review` ou `wn-reviewer`) se joue de préférence sur le diff local,
  avant le premier push. Le diff non commité suffit, fichiers non suivis
  compris. Il garde la branche avançable par `--ff-only` si `main` bouge
  pendant la revue sans toucher les mêmes fichiers.
  - Ce n'est pas une passe de plus. La passe Codex P0 reste sur le diff poussé
    (D-505).
  - Quand `wn-reviewer` tient lieu de revue exigée (D-499 §2, D-448), son GO
    porte sur la tête poussée, et un commit poussé ensuite demande une revue
    de l'écart. La passe locale ne la remplace pas : elle n'a pas de sha.
  - Le paragraphe d'articulation suit maintenant D-499 : PR-Agent est exigé,
    `wn-reviewer` le remplace à défaut. Il décrivait encore l'ordre
    CodeRabbit, Copilot, PR-Agent.
