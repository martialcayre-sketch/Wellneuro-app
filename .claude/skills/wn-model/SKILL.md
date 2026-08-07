---
description: Recommande ou force un modèle/effort pour la session WellNeuro. Overrides : fable | opus | sonnet | haiku | plan.
argument-hint: "[tâche] | fable | opus | sonnet | haiku | plan"
disable-model-invocation: true
effort: low
---

# WellNeuro — choix de modèle

Demande : `$ARGUMENTS`

| Contexte | `/model` | Effort |
|---|---|---|
| Développement courant, docs, tests, cadrage | `sonnet` (défaut) | high |
| Débogage, revue, clinique, sécurité, auth, migration | `opus` | high |
| Architecture transverse, arbitrage exceptionnel (≥ 2 signaux forts) | `claude-fable-5` | high |
| Exploration, reprise de contexte | `haiku` — ou agents `Explore`/`wn-explorer` | low |
| Plan difficile puis exécution courante | `opusplan` (Opus au plan, Sonnet en exécution) | — |

- Un override explicite de l'utilisateur prime toujours sur la grille.
- Déléguer à un sous-agent épinglé = basculer de modèle pour la tâche
  (`wn-reviewer`/`wn-debugger` → opus, `wn-explorer` → haiku, `wn-fable` →
  fable) ; le frontmatter de l'agent fait foi.
- Ne jamais monter modèle ou effort sans signal concret. Fable est
  exceptionnel (< 10 % des tâches — jamais pour du CRUD, des docs, des tests
  ou un bug déjà localisé) et coûteux : la durée ou la transversalité de la
  tâche doivent le justifier.
- La dépense se traite par la délégation en contexte isolé (le contexte du
  sous-agent est jeté, jamais repayé) — pas en descendant de modèle sur un
  verdict à risque.

Sortie : recommandation sur une ligne + commande exacte à coller. Ce skill
n'autorise ni migration, ni écriture Supabase, ni changement clinique.
