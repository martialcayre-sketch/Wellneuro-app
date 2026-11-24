### Nettoyage des branches : un nom accentué se dit « non interrogeable » sous bash 3.2 aussi (nettoyage-branches-bash32, 2026-11-24)

`scripts/nettoyage-branches.sh` n'envoie à GitHub qu'un nom de branche écrit
dans `[A-Za-z0-9._/-]` (`branche_sure`). Sous bash 3.2 (macOS), une plage
`a-z` suit l'ordre de collation de la locale, où « é » tombe entre « e » et
« f » : un nom accentué passait pour sûr, partait non encodé vers `gh`, et
revenait « lecture GitHub en échec » — sûr (code 2, aucune suppression) mais
muet sur la cause (P3 laissé de #2287). L'alphabet s'écrit désormais en
toutes lettres, sans plage : un nom accentué se dit nommément « nom de
branche non interrogeable », sur toutes les versions de bash, et n'est
jamais interrogé. La logique de preuve et de suppression ne change pas.
Le banc `scripts/nettoyage-branches.test.mjs` ajoute une branche `fix-é`
(jamais envoyée au faux `gh`) et une sentinelle qui refuse toute plage dans
l'alphabet de `branche_sure`.
