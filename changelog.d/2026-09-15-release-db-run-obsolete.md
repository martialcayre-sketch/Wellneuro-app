### Release DB : run push obsolète quand `main` avance avec une migration (2026-09-15)

Le job `release` ne passe plus en échec lorsqu’un run `push` approuvé trop tard
constate que `main` a avancé avec de nouvelles migrations. Il sort désormais
sans écriture, avec un message explicite indiquant qu’un run plus récent doit
être approuvé.

Le refus strict est conservé pour les déclenchements manuels (`workflow_dispatch`)
afin d’éviter tout déploiement d’un SQL non approuvé.
