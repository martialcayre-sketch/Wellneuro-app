---
description: Prépare une branche, un commit et une description de PR WellNeuro à partir du diff. Aucun push ni création de PR sans argument `apply`.
argument-hint: "[apply] [titre]"
disable-model-invocation: true
effort: medium
---

# WellNeuro — préparation de PR

!`git status --short`
!`git diff --stat`
!`git log -n 5 --oneline`

Arguments : `$ARGUMENTS`

Toujours :

- vérifier que le diff appartient à une seule finalité ;
- exécuter ou rappeler les tests nécessaires ;
- proposer un titre conventionnel ;
- rédiger résumé, périmètre, validations, risques et test manuel ;
- exclure secrets et données patient réelles.

Sans `apply` : ne créer ni branche, ni commit, ni push, ni PR.

Avec `apply` : branche et commit locaux autorisés. Le push, la création ou le merge d’une PR nécessitent encore une demande explicite claire.
