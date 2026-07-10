---
description: Lot R1 — validation E2E patient WellNeuro.
argument-hint: "[plan|apply|verify]"
disable-model-invocation: true
effort: medium
---

# R1 — validation E2E patient

!`test -f docs/claude/SESSION_LOG.md && tail -n 70 docs/claude/SESSION_LOG.md || true`
!`git status --short`

Argument : `$ARGUMENTS`

## Objectif

Valider le parcours patient unifié de bout en bout sans ajouter de fonctionnalité.

## Périmètre

portail, consentement, fiche, anamnèse, hub, brouillon, transmission, correction, mobile.

## Interdits

migration, refactor, scoring, donnée réelle. Toujours : aucun secret, aucune donnée patient réelle ; exemples limités à Sophie Nicola, Jennifer Martin et Michel Dogne.

## Méthode

- Par défaut : audit et plan sans modification.
- Avec `apply` : changement minimal dans le périmètre.
- Avec `verify` : lecture seule et go/no-go.
- Vérifier le dépôt réel avant toute affirmation.
- Terminer par validations, fichiers modifiés, risques et prochaine action.
