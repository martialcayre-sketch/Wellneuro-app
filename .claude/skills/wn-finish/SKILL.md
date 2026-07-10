---
description: Clôture un lot WellNeuro : validations, mise à jour du statut de campagne et entrée courte dans SESSION_LOG.
argument-hint: "[sujet]"
disable-model-invocation: true
effort: medium
---

# WellNeuro — fin de lot

!`git status --short`
!`git diff --stat`
!`node scripts/wn-campaign.mjs next --quiet 2>/dev/null || true`

Sujet : `$ARGUMENTS`

1. Vérifier que le périmètre est respecté.
2. Résumer les validations réellement exécutées.
3. Mettre à jour le lot actif s’il existe.
4. Ajouter à `docs/claude/SESSION_LOG.md` une entrée de moins de 150 mots :
   - décisions prises ;
   - options écartées et raison ;
   - prochaine action prioritaire ;
   - questions ouvertes.
5. Ne jamais réécrire les entrées précédentes.
6. Produire ensuite un handoff court.
