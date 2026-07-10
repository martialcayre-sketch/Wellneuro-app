---
description: Clôture un lot WellNeuro en générant une entrée SESSION_LOG courte, un résumé diff et la prochaine action.
---

# WellNeuro — clôture de lot

## Contexte injecté

Dernière entrée session :

!`test -f docs/claude/SESSION_LOG.md && tail -n 80 docs/claude/SESSION_LOG.md || true`

Diff stat :

!`git diff --stat`

Fichiers modifiés :

!`git status --short`

## Mission

1. Résume le lot réalisé en moins de 120 mots.
2. Propose une entrée prête à coller dans `docs/claude/SESSION_LOG.md`.
3. Si tu as l’autorisation de modifier la documentation, ajoute cette entrée à `docs/claude/SESSION_LOG.md` uniquement.
4. Liste :
   - décisions prises ;
   - options écartées ;
   - fichiers modifiés ;
   - risques résiduels ;
   - prochaine action prioritaire.
5. Ne modifie aucun code applicatif.

## Format attendu

```md
## YYYY-MM-DD — [Lot] [Titre]

Décisions prises : ...
Options écartées : ...
Prochaine action prioritaire : ...
Questions ouvertes : ...
```
