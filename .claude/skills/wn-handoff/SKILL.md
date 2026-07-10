---
description: Produit un handoff compact et réutilisable pour reprendre le travail dans une nouvelle session ou un autre agent.
argument-hint: "[write]"
disable-model-invocation: true
effort: low
---

# WellNeuro — handoff

!`node scripts/wn-context-pack.mjs --format markdown`

Argument : `$ARGUMENTS`

Créer un handoff de moins de 120 lignes comprenant :

- branche et état Git ;
- objectif actuel ;
- décisions prises ;
- fichiers modifiés ;
- validations exécutées ;
- problèmes ouverts ;
- prochaine action exacte ;
- interdits encore actifs.

Sans `write`, afficher seulement. Avec `write`, remplacer `docs/claude/HANDOFF_CURRENT.md`. Ne pas modifier `SESSION_LOG.md`.
