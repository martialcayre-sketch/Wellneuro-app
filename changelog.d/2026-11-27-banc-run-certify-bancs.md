### Banc de `run-certify-bancs.sh` : sa promesse « jamais vert sur zéro banc » est prouvée (2026-11-27)

`scripts/run-certify-bancs.sh` est un garde bloquant de `npm run check`
(`certify-check`) et du CI, et un garde d'outillage joué par `check` sans banc.
Sa promesse, écrite en tête — un dossier de `tools/corpus/*/lib` sans aucun
`*.test.mjs` fait échouer en 1, avec un message, au lieu du `# tests 0` vert
d'un motif nu — n'était prouvée nulle part. Nouveau banc hermétique
`scripts/run-certify-bancs.test.mjs` : le script est copié dans une
arborescence jetable (il dérive sa racine de `BASH_SOURCE`) et joué depuis un
`cwd` hors de cette racine. Quatre dossiers garnis d'un banc trivial : code
0, liste imprimée, chaque banc joué (fichier témoin). Chacun des quatre
dossiers vidé de ses bancs (suffixe changé, fichier d'outil restant), ou un
dossier absent : code 1, message qui le nomme, aucun banc joué. Un banc rouge
rend le script rouge. Contre-épreuve par mutation du script (contrôle
explicite retiré, dossier retiré de la liste, code de `node --test` avalé) :
chacune rougit le banc. Inscrit à `bancs-outillage-check` (web/package.json)
et à l'étape d'outillage de `ci.yml` ; comportement du script inchangé.
Lot `banc-run-certify-bancs` (file D).
