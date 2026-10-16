### Déploiement : le build reçoit un tas de 4 Go — la vérification des types dépassait le réglage par défaut (2026-10-17)

Les deux déploiements de 20b6f865 (#1508, lettre f) ont échoué en manque de
mémoire sur Scalingo, à l'étape « Linting and checking validity of types » de
`next build`, vers 2 Go de tas (le réglage par défaut du conteneur de build,
le plafond runtime de 384 Mo étant déjà retiré par `web/scripts/build.sh`).
La production est restée sur 363285cf, sans recul.

- **Cause** : la limite était atteinte, pas franchie par un lot. Le même
  build plafonné à 2 048 Mo échoue en local sur 363285cf, le commit en service
  juste avant ; il était passé de justesse sur Scalingo.
- **Correctif** (`web/scripts/build.sh`) : `NODE_OPTIONS=--max-old-space-size=4096`
  pour le seul build ; les conteneurs web gardent leurs 384 Mo. Build local
  vérifié sous ce plafond.
- **À constater au déploiement** : la mémoire du conteneur de build est
  déduite de son tas par défaut, non mesurée.
