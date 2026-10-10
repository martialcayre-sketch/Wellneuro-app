### Outillage — `repo-hygiene.sh` tourne sur macOS, et ne déplace plus sans réécrire (2026-10-10)

- `audit-only` s'arrêtait sur deux options GNU absentes de macOS :
  `du --max-depth` (code 64, masqué par `2>/dev/null` sous `pipefail`) et
  `find -printf`. Remplacées par `du -d` et `find -print | awk`.
- `apply-safe` réel : `sed -i` sans suffixe échoue sur macOS ; passé à
  `sed -i.bak` puis suppression de la copie.
- Sans `rg`, le comptage des références et la réécriture des liens rendaient
  vide en silence : un `apply-safe` aurait déplacé des documents sans
  réécrire leurs liens. `audit-only` et `apply-safe` refusent désormais de
  tourner sans `rg`, en le nommant.
- Empreintes : `sha256sum` quand il existe, sinon `shasum -a 256` (macOS
  anciens), refus explicite sans l'un ni l'autre.
