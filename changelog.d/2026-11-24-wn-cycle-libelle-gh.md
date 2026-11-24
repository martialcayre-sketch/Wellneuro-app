### wn-cycle : « nom de branche non interrogeable » au lieu d'un faux « gh indisponible » (2026-11-24)

P3 laissé de la revue de #2287. Sur une branche dont le nom sort de
l'alphabet sûr, `scripts/wn-cycle.mjs` ne lit jamais GitHub — le nom n'est
pas envoyé — mais sa ligne PR disait « inconnue (gh indisponible — verdict
partiel) », comme si `gh` avait échoué. Elle dit désormais « inconnue (nom de
branche non interrogeable — verdict partiel) », le libellé de
`nettoyage-branches.sh` depuis #2287. Le verdict de phase est inchangé ; un
banc de `scripts/wn-cycle.test.mjs` le vérifie. Aucun autre script, aucun
autre comportement de `wn-cycle`.
