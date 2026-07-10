---
description: Revue token-économe du diff WellNeuro, avec risques, tests à lancer et conformité aux règles projet.
---

# WellNeuro — revue du diff

## Contexte injecté

!`git diff --stat`
!`git diff --name-only`
!`git status --short`

## Mission

Relis les changements non commités sans modifier les fichiers.

Vérifie :

- Aucun secret.
- Aucun patient réel.
- Patients fictifs uniquement si exemples : Sophie Nicola, Jennifer Martin, Michel Dogne.
- UI en français.
- Pas de migration non demandée.
- Pas de modification scoring clinique non demandée.
- Pas de refactor hors périmètre.
- Cohérence avec le lot en cours.

## Sortie attendue

- Résumé en 5 lignes maximum.
- Risques bloquants.
- Risques non bloquants.
- Tests à lancer.
- Go / no-go pour clôture du lot.
