### Le plafond mémoire du runtime ne s'applique plus au build — les déploiements repartent (2026-09-01)

Les trois déploiements automatiques du 2026-08-31 23:29 ont échoué en
`build-error` : `next build` atteignait `FATAL ERROR: Reached heap limit` à
~380 MB. Cause : `NODE_OPTIONS=--max-old-space-size=384`, posé dans
l'environnement Scalingo pour protéger les conteneurs web de 512 MiB
(remédiation de l'incident du 2026-08-31), est hérité par le conteneur de
build, dont les limites sont bien plus larges et où Next.js dépasse largement
ce plafond. `web/scripts/build.sh` fait désormais `unset NODE_OPTIONS` en
tête : le build revient au réglage mémoire par défaut, éprouvé pendant des
mois, et le plafond ne vaut plus que pour le runtime. Preuve locale :
compilation verte avec `NODE_OPTIONS=384` injecté dans l'environnement, là où
elle échouait en OOM sans le `unset`. Le déploiement du commit qui porte ce
changement se répare lui-même — c'est son propre build qui exécute le `unset`.
