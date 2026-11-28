### Le contrôle de fusion joue la numérotation des sources du corpus (2026-11-27)

`scripts/wn-controle-fusion.mjs` ne jouait pas `sources-check` sur l'arbre
fusionné (P2-3 de la revue de la partie 13 d'`autonomie-pieges-restes`). Deux
PR vertes chacune, qui ajoutent le même `sourceId` au milieu du registre sans
conflit textuel, pouvaient porter un doublon sur `main`, que seul le CI de
`main` aurait vu après coup. Le garde `sources`
(`scripts/lib/sources-numerotation.mjs`) entre dans `GARDES_NODE`, en mode
local (sans `--pr`, sans `GITHUB_EVENT_NAME`, aucune lecture distante), avec
son code 2 (« registre absent ou vide ») sans verdict, comme la numérotation
des décisions. Les signatures d'une violation ne portent plus le rang de la
notice : une source insérée plus haut ne fait pas passer un doublon
préexistant de `main` pour une violation de plus. Banc
`scripts/wn-controle-fusion.test.mjs` : trois cas neufs (doublon imputable,
signature sans rang, garde inscrit), rouges sous mutation.
