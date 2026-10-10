### Outillage : `repo-hygiene.sh` tourne sur macOS (2026-10-10)

- **`scripts/repo-hygiene.sh`** : trois formes propres à GNU remplacées par des
  formes portables — `du -d 2` (au lieu de `--max-depth`, qui arrêtait
  `audit-only` en code 64), le nom de base calculé par `awk` (au lieu de
  `find -printf`), `sed -i.bak` puis suppression de la copie (au lieu de
  `sed -i` nu, qui lit l'expression comme un suffixe sur BSD).
- **Repli sur `grep` quand `rg` est absent** : sans ripgrep, `apply-safe`
  déplaçait les documents sans réécrire aucune référence (échec masqué par
  `|| true`), et l'audit classait tous les scripts « dormants ».
- Constaté sur ce Mac : `audit-only` complet, `apply-safe --dry-run` liste
  désormais 15 réécritures de références au lieu de zéro.
