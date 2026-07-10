---
description: Audite, nettoie et réaligne la documentation WellNeuro avec l’état réel du dépôt. Entretien documentaire récurrent.
argument-hint: "[audit|apply|verify] [périmètre]"
disable-model-invocation: true
effort: medium
---

# WellNeuro — maintenance documentaire

!`test -f docs/claude/SESSION_LOG.md && tail -n 70 docs/claude/SESSION_LOG.md || true`
!`git status --short`
!`git log -n 10 --date=short --pretty='format:%h %ad %s' -- '*.md' '*.mdx' 2>/dev/null || true`

Arguments : `$ARGUMENTS`

## Modes

- aucun argument ou `audit` : lecture seule ;
- `apply` : corrections documentaires sûres ;
- `verify` : contrôle final en lecture seule.

## Sources de vérité

1. code et configuration présents ;
2. tests, scripts et schéma en lecture seule ;
3. `docs/claude/PROJET_CONTEXTE.md` ;
4. roadmaps actives ;
5. `CHANGELOG.md` ;
6. `SESSION_LOG.md` ;
7. documents datés comme historique.

## Contrôles

- contradictions, routes et commandes périmées ;
- liens relatifs cassés ;
- doublons et documents orphelins ;
- confusion entre état courant, planification et historique ;
- nombres figés devenus faux ;
- secrets ou données patient réelles.

En mode `apply`, modifier uniquement Markdown/MDX, skills et index documentaires. Ne jamais supprimer, déplacer, fusionner ou archiver sans confirmation distincte.
