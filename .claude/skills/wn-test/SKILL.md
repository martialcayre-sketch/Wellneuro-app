---
description: Sélectionne et exécute la matrice de tests minimale adaptée au diff WellNeuro, puis élargit seulement si nécessaire.
argument-hint: "[quick|full|fichier-ou-zone]"
disable-model-invocation: true
effort: medium
---

# WellNeuro — validation ciblée

!`git diff --stat`
!`git diff --name-only`
!`git status --short`

Argument : `$ARGUMENTS`

1. Classer les fichiers modifiés : docs, UI, API, scoring, Prisma, scripts.
2. Commencer par les contrôles les moins coûteux.
3. Utiliser les scripts déjà présents dans `package.json` et `scripts/`.
4. Ne jamais créer de donnée patient réelle.
5. Ne jamais lancer migration, seed production, écriture Supabase ou déploiement.
6. En mode `quick`, s’arrêter après les validations ciblées.
7. En mode `full`, exécuter aussi build et contrôles de release disponibles.

Rendre : commandes, résultats, échecs, cause probable, prochain test utile et go/no-go.
