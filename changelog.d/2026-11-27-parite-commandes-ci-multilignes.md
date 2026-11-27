### Banc de parité : un appel node/bash déguisé est refusé (2026-11-27)

`scripts/parite-check-ci.test.mjs` ne lisait, côté CI, que les `run:` dont
`node` ou `bash` ouvre la ligne de shell. Un garde écrit derrière un préfixe —
`cd web && node …`, `FOO=1 bash …`, `then node …`, `$(node …)`, en `run:`
simple comme en bloc `run: |` — sortait sans bruit de la liste attendue, et
pouvait manquer à `npm run check` sans rougir. La forme en tête de ligne, la
seule que `ci.yml` emploie, reste lue ; le mot `node` ou `bash` ailleurs dans
la ligne (préfixe, guillemets, chemin absolu `/usr/bin/node`) est désormais
refusé, et dans un job sans `setup-node` (`verify`) il compte comme une faute.
Un en-tête de bloc avec indicateur ou commentaire (`run: |2`,
`run: | # …`) est lu comme un bloc au lieu d'être sauté, et les clés sœurs
d'un `- run: |` ferment le bloc. Une ligne de commentaire de shell et les mots
qui ne font que contenir `node` (`node_modules`, `scripts/node`, `--node`) ne
sont pas visés. Contre-épreuve par mutation sur le
CI réel : le banc de parité réécrit en bloc derrière un `cd` fait refuser la
lecture. Écart vide sur `main`, `ci.yml` inchangé.
Lot `parite-commandes-ci-multilignes` (file D).
