---
description: Audite, nettoie et réaligne la documentation WellNeuro avec l’état réel du dépôt. Entretien documentaire récurrent.
argument-hint: "[audit|apply|verify] [périmètre]"
disable-model-invocation: true
effort: medium
---

# WellNeuro — maintenance documentaire

!`node ${CLAUDE_PROJECT_DIR}/scripts/wn-context-pack.mjs --format markdown 2>/dev/null || true`
!`git status --short --untracked-files=all`
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
5. `CHANGELOG.md` (entrées à venir : fragments dans `changelog.d/`) ;
6. handoffs de `docs/claude/handoffs/` (le dernier de la branche, D-372) ;
   `SESSION_LOG.md`, résumé sur demande, en historique ;
7. documents datés comme historique.

## Contrôles

- contradictions, routes et commandes périmées ;
- liens relatifs cassés ;
- doublons et documents orphelins ;
- confusion entre état courant, planification et historique ;
- nombres figés devenus faux ;
- secrets ou données patient réelles.

En mode `apply`, modifier uniquement Markdown/MDX, skills et index documentaires. Ne jamais supprimer, déplacer, fusionner ou archiver sans confirmation distincte.
