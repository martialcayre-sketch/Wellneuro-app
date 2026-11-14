### Autonomie des sessions, frictions (5) : la session avance seule par `--ff-only` sa branche sans commit propre (D-518) (2026-11-13)

- `D-518` (question `20261113-1905-d`, réponse A) : quand le garde de
  fraîcheur refuse une édition parce qu'`origin/main` a avancé, la session
  remet sa branche à niveau par `git merge --ff-only origin/main`, si cette
  branche, dans son propre worktree, n'a aucun commit propre. Un commit
  propre, ou une avance qui échoue, restent à l'arbitrage du responsable ; la
  session ne force pas l'avance, ni par `stash` ni par un commit.
- `.claude/hooks/git-freshness.mjs` : le message de refus et l'avis de
  démarrage disent ce geste et ce recours au lieu d'« arbitrage humain » seul.
  Le jugement du garde ne change pas : il refuse, et n'avance rien lui-même.
- `.claude/rules/hooks-garde-fous.md` et `CLAUDE.md` § Début de session
  suivent `D-518`.
