### Skills wn : les blocs `git` ne passent plus par `cd` (2026-09-30)

- **`/wn-lot` refusait encore de se charger** après la PR #1271, sur le même
  bloc `cd "$(git rev-parse --show-toplevel)" && git status …`. La règle
  `allow` exacte n'y peut rien : Claude Code soumet à approbation toute
  commande composée qui enchaîne `cd` et `git` (protection contre un dépôt
  « bare » piégé), avant la lecture des règles. Les blocs `cat`/`node`
  ancrés, eux, passaient déjà — seuls les huit blocs `git` échouaient.
- **Les huit blocs `git` des skills `wn-*` perdent l'ancre `cd`** :
  `git status` et `git diff --name-only` couvrent le dépôt entier depuis
  n'importe quel sous-répertoire (seule la présentation des chemins change) ;
  le `git log` de `/wn-conventions` ancre ses chemins par la syntaxe
  `:/CLAUDE.md` de Git, qui les résout à la racine sans `cd`.
- Les trois règles `allow` de ces blocs, devenues inutiles, sont retirées de
  `.claude/settings.json`.
