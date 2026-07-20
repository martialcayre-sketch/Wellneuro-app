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

## Attendre le CI sans le sonder en boucle

Un seul appel, en tâche de fond, qui rend la main dès que les checks se figent :

```bash
until [ -z "$(gh pr checks <N> --json bucket --jq '.[]|select(.bucket=="pending")' 2>/dev/null)" ]; do sleep 20; done
gh pr checks <N>
```

Ne pas enchaîner `gh pr checks` / `gh pr view` manuellement : le 2026-07-20 la
session a produit 81 appels de sondage pour l'information que cette boucle rend
en un seul.

Avant d’annoncer qu’une PR est prête à merger, **lire son CI** : `npm test`
n’exécute pas les E2E, une suite Vitest verte ne dit rien des parcours.

## Corps de PR

Rédiger le corps dans un fichier et le passer par `--body-file`. Le garde-fou
Bash inspecte la commande brute pour les motifs destructifs ; un corps de PR
long, cité en ligne, est une source inutile de collisions.
