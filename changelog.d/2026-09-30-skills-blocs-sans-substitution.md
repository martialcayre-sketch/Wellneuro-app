### Skills wn : plus aucun bloc `!` à substitution — racine par `${CLAUDE_PROJECT_DIR}` (2026-09-30)

- **`/wn-lot` refusait toujours de se charger** après #1271 et #1272, cette
  fois sur `cd "$(git rev-parse --show-toplevel)" && node scripts/wn-context-pack.mjs …`.
  Sondes du 2026-09-30 (skills jetables, mode auto) : **tout** bloc contenant
  `$(…)` échoue à la vérification des permissions, qu'une règle `allow`
  exacte le couvre ou non. Échouent aussi un chemin contenant `..` et une
  variable shell (`"$CLAUDE_PROJECT_DIR/…"`). Passent : une lecture sur chemin
  relatif ou absolu, `${CLAUDE_PROJECT_DIR}` entre accolades (remplacé par le
  chargeur de skill AVANT la vérification) et un `node` couvert par une règle.
- **Les 18 blocs ancrés de 11 skills `wn-*`** perdent le `cd "$(…)" &&` ;
  leurs chemins de racine s'écrivent `${CLAUDE_PROJECT_DIR}/…`.
- **`.claude/settings.json`** : les 13 règles `cd "$\(…\)"` de #1271, qui ne
  correspondaient jamais, sont retirées. Trois règles exactes les remplacent
  pour les blocs `node` (`wn-context-pack.mjs --format markdown`,
  `wn-cycle.mjs`, `wn-cycle.mjs --local`), sur le chemin absolu de la copie
  principale. Un joker `node */scripts/…` a été écarté : il laisserait passer
  `node /tmp/x.js a/scripts/wn-cycle.mjs`. Hors de ce chemin, les blocs `node`
  redemandent : c'est visible, pas silencieux.
- **`scripts/lib/skill-bang-cwd.mjs`** : l'ancre `cd "$(…)"` n'exempte plus
  rien ; toute substitution `$(` dans un bloc `!` est une violation CI.
