---
description: Détermine la prochaine action WellNeuro depuis SESSION_LOG, campagne active, roadmap et état Git. Commence toujours par un plan conservateur.
argument-hint: "[R0-R6|campagne|tâche]"
disable-model-invocation: true
effort: low
---

# WellNeuro — reprise automatique

!`test -f docs/claude/SESSION_LOG.md && tail -n 80 docs/claude/SESSION_LOG.md || true`
!`node scripts/wn-campaign.mjs next --quiet 2>/dev/null || true`
!`test -f docs/roadmap.md && grep -nE 'R[0-6]|Priorité|prochaine' docs/roadmap.md | head -n 70 || true`
!`git status --short`

Argument : `$ARGUMENTS`

1. Prioriser un lot de campagne explicitement actif.
2. Sinon, reprendre la prochaine action du SESSION_LOG.
3. Sinon, utiliser la roadmap R0-R6.
4. En cas d’ambiguïté, choisir audit/documentation/test.
5. Ne pas modifier le code dans ce premier passage.
6. Si le lot implique des modifications, déléguer le plan technique détaillé au mode Plan avant toute édition.

Présenter : action choisie, justification, fichiers indispensables, interdits, plan court, critères de validation, puis une instruction explicite : « Passer en mode Plan avant toute modification ».
