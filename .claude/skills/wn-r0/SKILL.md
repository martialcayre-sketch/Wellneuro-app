---
description: Lot R0 — réalignement documentaire WellNeuro.
argument-hint: "[plan|apply|verify]"
disable-model-invocation: true
effort: medium
---

# R0 — réalignement documentaire

!`test -f docs/claude/SESSION_LOG.md && tail -n 70 docs/claude/SESSION_LOG.md || true`
!`git status --short`

Argument : `$ARGUMENTS`

## Objectif

Mettre les documents canoniques au niveau réel du dépôt, sans code applicatif.

## Périmètre

README.md, AGENTS.md, CLAUDE.md, docs/roadmap.md, docs/claude/PROJET_CONTEXTE.md.

## Interdits

code applicatif, Prisma, migrations, scoring. Toujours : aucun secret, aucune donnée patient réelle ; exemples limités à Sophie Nicola, Jennifer Martin et Michel Dogne.

## Méthode

- Par défaut : audit et plan sans modification.
- Si des modifications deviennent nécessaires : passer en mode Plan avant toute édition.
- Avec `apply` : changement minimal dans le périmètre, uniquement après plan validé en mode Plan.
- Avec `verify` : lecture seule et go/no-go.
- Vérifier le dépôt réel avant toute affirmation.
- Terminer par validations, fichiers modifiés, risques et prochaine action.
