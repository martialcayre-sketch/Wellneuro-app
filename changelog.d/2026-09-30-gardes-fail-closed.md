### Gardes : un garde introuvable bloque au lieu de se taire, et les agents de revue ne touchent plus à Git (2026-09-30)

- **Trou constaté par l'audit de consommation du 2026-09-30** : environ la
  moitié du travail de septembre s'est faite dans des sessions dont la racine
  était `~/Developer`. `$CLAUDE_PROJECT_DIR` y pointait hors du dépôt, `node`
  ne trouvait pas le script de garde et sortait en code 1 — non bloquant. Les
  six gardes (`block-risky-commands`, `gate-codex-p0`,
  `protect-wellneuro-files`, `git-freshness` ×2, `guard-supabase-mcp`)
  laissaient tout passer, sans signal.
- **Lanceur fermé** dans `.claude/settings.json` : résolution par
  `$CLAUDE_PROJECT_DIR`, puis par la racine Git du répertoire courant, puis
  **code 2** si le script reste introuvable. Le journal Bash, asynchrone et
  sans décision, n'est pas concerné. Banc `settings-gardes.test.mjs` : quatre
  situations jouées sur la commande réellement déclarée.
- **`lecture-seule-git.mjs`**, armé depuis le frontmatter de `wn-reviewer` et
  `wn-fable` : refuse checkout, switch, reset, stash, commit, push et autres
  commandes Git mutantes ; laisse diff, show, log, status, blame, fetch. Un
  agent de revue avait fait un `checkout` dans la copie principale partagée.
  `wn-reviewer` reçoit aussi `maxTurns: 100` contre les boucles.
- Écarté : `isolation: worktree` pour `wn-reviewer` — la copie partirait de
  `main`, pas de la branche à relire.
