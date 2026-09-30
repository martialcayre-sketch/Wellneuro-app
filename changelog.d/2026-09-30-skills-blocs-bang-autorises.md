### Skills wn : les blocs `!` ancrés à la racine sont autorisés dans le dépôt (2026-09-30)

- **`/wn-lot` refusait de se charger** : `Shell command permission check
  failed` sur `cd "$(git rev-parse --show-toplevel)" && git status …`. Une
  substitution `$(…)` n'est jamais approuvée d'office comme lecture, et aucune
  règle `allow` ne couvrait ces blocs : en mode auto (et en mode Plan depuis
  l'extension VS Code), la vérification échoue au lieu de demander. Les blocs
  eux-mêmes n'avaient pas changé depuis août.
- **16 règles exactes** dans `.claude/settings.json` (`permissions.allow`),
  une par bloc `!` ancré en lecture seule des skills `wn-*` (`git status`,
  `git diff`/`log`, `tail`/`grep` du `SESSION_LOG`, `cat` de fichiers nommés,
  `wn-cycle.mjs` sans `--appliquer`, `wn-context-pack.mjs`). Pas de joker :
  aucune commande d'écriture n'entre par ce biais.
- Écarté : le bloc `ls web/src/components/ui/*.tsx` de `/wn-ui` — son `*`
  deviendrait un joker dans la règle ; il continue de demander. Écarté
  aussi : retirer l'ancre `cd` des blocs, imposée par
  `scripts/lib/skill-bang-cwd.mjs`.
