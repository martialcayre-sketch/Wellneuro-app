### Outillage : `repo-hygiene.sh` tourne sur macOS (2026-10-10)

- **`scripts/repo-hygiene.sh`** : trois formes propres à GNU remplacées par des
  formes portables — `du -d 2` (au lieu de `--max-depth`, qui arrêtait
  `audit-only` en code 64), le nom de base calculé par `awk` (au lieu de
  `find -printf`), `sed -i.bak` puis suppression de la copie (au lieu de
  `sed -i` nu, qui lit l'expression comme un suffixe sur BSD).
- **Repli sur `grep` quand `rg` est absent** : sans ripgrep, `apply-safe`
  déplaçait les documents sans réécrire aucune référence (échec masqué par
  `|| true`), et l'audit classait tous les scripts « dormants ». Le repli
  s'en tient, comme `rg`, aux fichiers texte suivis ou non ignorés.
- **Échappement `sed` de la réécriture corrigé** (antérieur à ce lot) : double
  barre oblique inverse et `/` non échappé — le premier `apply-safe` réel
  plantait (`bad flag in substitute command`) **après** avoir déplacé les
  fichiers. `shasum -a 256` en repli de `sha256sum`.
- Constaté sur ce Mac : `audit-only` complet (aussi sans `sha256sum` dans le
  PATH), `apply-safe --dry-run` liste 15 réécritures au lieu de zéro,
  `apply-safe` réel joué dans un dépôt jetable (référence réécrite, fichier
  ignoré intact, aucun `.bak` laissé).
