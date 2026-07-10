---
description: Lot R6 WellNeuro — stabilisation build, tests, go/no-go et documentation de release.
---

# LOT R6 — Stabilisation / release go-no-go

## Contexte injecté

!`test -f docs/claude/SESSION_LOG.md && tail -n 80 docs/claude/SESSION_LOG.md || true`
!`git status --short`

## Objectif

Stabiliser la branche après R0-R5 et produire un go/no-go clair.

## Vérifications

- Type-check.
- Lint si disponible.
- Scoring-check si disponible.
- Script no-secrets si disponible.
- Build si environnement compatible.
- Vérification ciblée parcours patient.
- Diff review.

## Interdits

- Pas de nouvelle fonctionnalité.
- Pas de refactor.
- Pas de migration.
- Pas de changement clinique.

## Sortie attendue

- Résultat des commandes.
- Fichiers modifiés depuis le début du lot.
- Bugs bloquants / non bloquants.
- Go / no-go.
- Entrée SESSION_LOG proposée.
