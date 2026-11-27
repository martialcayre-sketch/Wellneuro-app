### `repo-hygiene.sh apply-safe` résout ses déplacements contre `--root`, plus contre le `cwd` (2026-11-27)

`move_file_safe` faisait son `mkdir -p` et le `mv` d'un fichier non suivi avec
des chemins relatifs au répertoire courant. Lancé d'ailleurs que `--root`,
`apply-safe` créait `docs/archive/…` dans le `cwd` (même en `--dry-run`) et
échouait sur un fichier non suivi (P2-1 de `wn-reviewer` sur #2374). Les deux
chemins passent par `abs_path` ; `git -C "$ROOT" mv` était déjà juste. Deux
scènes neuves au banc `scripts/repo-hygiene.test.mjs` jouent `apply-safe` et son
`--dry-run` depuis un `cwd` hors de la racine : rouges avant le correctif,
vertes après. `audit-only`, seul mode joué par la passe cloud, n'appelle pas
`move_file_safe` et ne change pas. Hors périmètre : l'option inconnue
d'`audit-only` avalée par `REM_ARGS`, `report-pr`.
