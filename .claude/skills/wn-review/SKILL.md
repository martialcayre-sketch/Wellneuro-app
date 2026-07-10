---
description: Revue indépendante et en lecture seule du diff WellNeuro : bugs, sécurité, données patients, régressions et tests manquants.
argument-hint: "[zone ou commit]"
disable-model-invocation: true
context: fork
agent: Explore
effort: high
---

# WellNeuro — revue

!`git diff --stat`
!`git diff --name-only`
!`git status --short`

Argument : `$ARGUMENTS`

Examiner d’abord le diff, puis seulement le contexte nécessaire.

Priorité des constats :

1. bug ou perte de données ;
2. secret, auth, RGPD, donnée patient ;
3. migration ou changement clinique non autorisé ;
4. régression fonctionnelle ;
5. test manquant ;
6. dette non bloquante.

Ne pas modifier les fichiers.

Sortie : résumé, constats bloquants avec fichier/ligne, constats non bloquants, tests, go/no-go.
