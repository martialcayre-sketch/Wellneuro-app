---
description: Recommande le couple modèle + effort + réflexion adapté au contexte WellNeuro et donne la commande exacte à appliquer. Permet aussi de forcer un modèle (dont Fable).
argument-hint: "[tâche] | fable | opus | sonnet | haiku | plan"
disable-model-invocation: true
effort: low
---

# WellNeuro — routeur de modèle

## Contexte

!`git status --short`
!`test -f docs/claude/SESSION_LOG.md && tail -n 20 docs/claude/SESSION_LOG.md || true`

Demande : `$ARGUMENTS`

## Mission

À partir de la demande, choisir un seul couple **modèle + effort + réflexion** et rendre la commande exacte à appliquer. Ne modifier aucun fichier. Ne jamais interpréter ce skill comme une autorisation de migration, d'écriture Supabase, de déploiement ou de modification clinique.

Rappels techniques (à ne pas réexpliquer, seulement appliquer) :

- Le modèle se change en session avec `/model <alias|id>` ou automatiquement avec `/model opusplan` (Opus/Fable en Plan, exécution allégée).
- Un sous-agent épingle son propre modèle : déléguer à un sous-agent = basculer de modèle pour cette tâche.
- L'effort natif se règle via l'intensité de réflexion : `think` < `think hard` < `think harder` < `ultrathink`.
- Le champ `effort` du frontmatter WellNeuro est une consigne d'auto-régulation, cohérente avec le paramètre `effort` natif (défaut `high` sur Opus 4.8 / Sonnet 5).

## Mapping par défaut (version 1)

| Contexte | Modèle | Alias `/model` | Effort | Réflexion |
| --- | --- | --- | --- | --- |
| Débogage, revue, logique clinique, sécurité | Claude Opus 4.8 | `opus` | high | `think hard` |
| Développement courant, documentation, cadrage/plan | Claude Sonnet 5 | `sonnet` | medium | `think` |
| Hygiène documentaire multi-dépôts (`repo-hygiene`) | Claude Sonnet 5 | `sonnet` | medium | `think hard` |
| Exploration, reprise de contexte, routage | Claude Haiku 4.5 | `haiku` | low | — |

Correspondance sous-agents (déjà épinglés) : `wn-debugger` et `wn-reviewer` → `opus` ; `wn-doc-auditor` → `sonnet` ; `wn-explorer` → `haiku`.

Routage spécialisé : si la demande concerne le nettoyage documentaire multi-dépôts, l’archivage de snapshots datés, ou l’exécution de `scripts/repo-hygiene.sh`, recommander explicitement la route `/wn-hygiene` (puis le mode `audit-only`, `apply-safe --dry-run` ou `report-pr` selon la demande).

## Overrides forçables

L'utilisateur peut forcer un modèle en le nommant explicitement dans la demande.

- **`fable`** — Claude Fable 5 (`claude-fable-5`), modèle haut de gamme pour tâches très complexes ou long-cours (grosse refonte, planification transverse, raisonnement clinique lourd). Commande : `/model claude-fable-5`, ou délégation au sous-agent `wn-fable` (déjà épinglé sur ce modèle). Signaler que c'est le modèle le plus coûteux ($10/$50 par MTok) : à réserver aux cas qui le justifient.
- **`opus`** → `/model opus`
- **`sonnet`** → `/model sonnet`
- **`haiku`** → `/model haiku`
- **`plan`** → `/model opusplan` (bascule automatique selon le mode Plan/exécution)

Un override explicite prime toujours sur le mapping par défaut.

## Sortie

1. Contexte détecté (une phrase).
2. Recommandation : modèle + alias, effort, mot-clé de réflexion.
3. Commande exacte à coller (`/model …` et/ou délégation sous-agent).
	Si le cas relève de l’hygiène documentaire multi-dépôts, inclure aussi la commande `/wn-hygiene ...` adaptée.
4. Alternative si l'utilisateur veut monter en puissance (`fable`) ou réduire le coût (`haiku`).
