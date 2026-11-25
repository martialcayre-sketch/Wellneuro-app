### Parité check → CI pour les bancs d'outillage (2026-11-25)

`scripts/parite-check-ci.test.mjs` contrôlait un seul sens : tout ce que le CI
joue avant npm doit être joué par `npm run check`. Il exige désormais aussi
l'inverse, borné à la liste `bancs-outillage-check` (`web/package.json`) :
chacun de ses fichiers doit figurer dans un `node --test` du CI avant
`setup-node`. Un banc ajouté à cette liste sans son câblage CI rougit en local
— l'écart que #2337 a dû corriger ne se reproduit plus en silence. L'écart est
vide aujourd'hui (56 bancs). Contre-épreuve par mutation : un banc retiré de
`ci.yml` en mémoire est signalé ; un banc câblé après `setup-node` compte comme
absent. Le reste de `check` (lint, type-check, Vitest…) n'est pas concerné.
Lot `parite-bancs-outillage-sens-check-ci` (file D).
