---
description: Détermine la prochaine action WellNeuro depuis SESSION_LOG, campagne active, roadmap et état Git. Commence toujours par un plan conservateur.
argument-hint: "[R0-R6|campagne|tâche]"
disable-model-invocation: true
effort: low
---

# WellNeuro — reprise automatique

!`cd "$(git rev-parse --show-toplevel)" && test -f docs/claude/SESSION_LOG.md && tail -n 80 docs/claude/SESSION_LOG.md || true`
!`cd "$(git rev-parse --show-toplevel)" && test -f docs/claude/campagnes/ACTIVE_CAMPAIGN.md && cat docs/claude/campagnes/ACTIVE_CAMPAIGN.md || true`
!`cd "$(git rev-parse --show-toplevel)" && grep -nE 'Priorité|prochaine|à faire' docs/ROADMAP_PRODUIT.md docs/ROADMAP_TECHNIQUE.md | head -n 70 || true`
!`git status --short`

Argument : `$ARGUMENTS`

1. Prioriser un lot de campagne explicitement actif.
2. Sinon, reprendre la prochaine action du SESSION_LOG.
3. Sinon, utiliser la roadmap R0-R6.
4. En cas d’ambiguïté, choisir audit/documentation/test.
5. Ne pas modifier le code dans ce premier passage.
6. Si le lot implique des modifications, déléguer le plan technique détaillé au mode Plan avant toute édition.

Présenter : action choisie, justification, fichiers indispensables, interdits, plan court, critères de validation, puis une instruction explicite : « Passer en mode Plan avant toute modification ».
