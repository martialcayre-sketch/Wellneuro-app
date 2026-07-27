# Catalogue des skills & agents — routage modèle / effort

> État courant. Décrit les skills et sous-agents Claude Code créés pour choisir le modèle et l'effort selon le contexte WellNeuro. Source canonique des conventions : les fichiers `.claude/skills/*/SKILL.md` et `.claude/agents/*.md` eux-mêmes.

## 1. Éléments créés

| Élément | Type | Fichier | Modèle | Effort |
| --- | --- | --- | --- | --- |
| `/wn-model` | Skill (slash-command) | `.claude/skills/wn-model/SKILL.md` | — (recommande) | low |
| `/wn-ultra` | Skill (slash-command) | `.claude/skills/wn-ultra/SKILL.md` | — (recommande le mode) | low |
| `/wn-route` | Skill (slash-command, auto en début de session) | `.claude/skills/wn-route/SKILL.md` | — (combine route/modèle/mode) | low |
| `wn-fable` | Sous-agent | `.claude/agents/wn-fable.md` | `claude-fable-5` | high |

Modifications associées (épinglage de modèle sur des sous-agents existants) :

| Sous-agent | Avant | Après |
| --- | --- | --- |
| `wn-debugger` | `model: inherit` | `model: opus` |
| `wn-reviewer` | `model: inherit` | `model: opus` |
| `wn-doc-auditor` | `model: inherit` | `model: sonnet` |
| `wn-explorer` | `model: inherit` | `model: haiku` |

## 2. Fonction et intérêt

### `/wn-model` — routeur de modèle

- **Fonction** : à partir d'une description de tâche, recommande un couple **modèle + effort + intensité de réflexion** et rend la commande exacte à appliquer (`/model …`, délégation à un sous-agent, ou mot-clé de réflexion). Ne modifie aucun fichier.
- **Intérêt** : centralise une décision récurrente (« quel modèle pour cette tâche ? ») au lieu de la laisser implicite. Aligne le coût sur la complexité réelle et rend le choix traçable.
- **Options d'appel** : `/wn-model [tâche]` (recommande), ou override explicite `fable | opus | sonnet | haiku | plan`. Un override prime toujours sur le mapping par défaut.

### `/wn-ultra` — routeur de mode d'exécution

- **Fonction** : à partir d'une description de tâche, tranche le **mode d'exécution** — solo, multi-agent léger (briques existantes : sous-agents épinglés, campagnes), ou **ultracode** (orchestration multi-agent via l'outil Workflow) — via une grille de signaux (largeur / confiance / échelle). Sur un verdict ultracode avec opt-in `ultracode` présent, il lance le Workflow adapté ; sans opt-in, il recommande d'opter sans rien lancer.
- **Intérêt** : centralise la décision « faut-il payer l'orchestration multi-agent pour cette tâche ? » et aligne le coût (jusqu'à des dizaines de sous-agents) sur le besoin réel de largeur ou de confiance. Ultracode reste un **mode d'exécution, pas une autorisation** : migration, Supabase, déploiement et clinique passent toujours par le mode Plan + revue + merge.
- **Options d'appel** : `/wn-ultra [tâche]`, ou override explicite `ultracode | leger | solo`. Un override prime sur la grille.

### `/wn-route` — routeur combiné de session

- **Fonction** : combine en une seule passe les trois grilles ci-dessus (`/wn` pour la route, `/wn-model` pour le modèle, `/wn-ultra` pour le mode d'exécution) au lieu de trois invocations séquentielles, en chargeant leurs `SKILL.md` comme contexte plutôt qu'en dupliquant leur contenu. Appliqué automatiquement (via `CLAUDE.md`) à la toute première demande d'une session ou juste après `/clear` ; n'affiche un plan que si le résultat dévie du défaut (Sonnet, solo, aucune délégation).
- **Intérêt** : évite trois passes de routage séquentielles pour une même demande, et rend le routage par défaut silencieux — l'économie de tokens vient de ne rien afficher quand rien ne change, pas d'un raisonnement de routage plus élaboré.
- **Options d'appel** : automatique en début de session (voir `CLAUDE.md`), ou `/wn-route [tâche]` pour re-router explicitement en cours de session.

### `wn-fable` — sous-agent haut de gamme

- **Fonction** : traite en lecture seule les tâches très complexes ou long-cours (architecture, raisonnement clinique lourd, planification transverse) avec `claude-fable-5`.
- **Intérêt** : isole l'usage du modèle le plus coûteux ($10/$50 par MTok) dans un agent dédié, qui refuse les tâches simples et renvoie vers un modèle plus léger.

## 3. Mapping par défaut (version 1)

| Contexte | Modèle | Alias | Effort | Réflexion |
| --- | --- | --- | --- | --- |
| Debug, revue, clinique, sécurité | Claude Opus 4.8 | `opus` | high | `think hard` |
| Dev courant, docs, cadrage/plan | Claude Sonnet 5 | `sonnet` | medium | `think` |
| Exploration, contexte, routage | Claude Haiku 4.5 | `haiku` | low | — |
| Override haut de gamme (forçable) | Claude Fable 5 | `claude-fable-5` | high | auto (always-on) |

## 4. Conventions d'écriture

### 4.1 Skill (`.claude/skills/<nom>/SKILL.md`)

Frontmatter YAML puis corps Markdown en français.

| Champ | Rôle | Valeurs |
| --- | --- | --- |
| `description` | Résumé d'une phrase, sert au routage automatique | texte |
| `argument-hint` | Aide à la saisie des arguments | ex. `"[tâche] \| fable \| opus"` |
| `disable-model-invocation` | Empêche l'invocation auto par le modèle (commande manuelle) | `true` / absent |
| `context` | Portée du contexte | ex. `fork` |
| `agent` | Agent d'exécution associé | ex. `Explore`, `general-purpose` |
| `effort` | Consigne d'auto-régulation (alignée sur le paramètre natif) | `low` / `medium` / `high` |

Corps type : `## Contexte` (commandes `!` de collecte), `## Mission` (règles + invariants), `## Sortie` (format attendu). Toujours rappeler les invariants WellNeuro : pas de migration, de lecture `.env`, d'écriture Supabase ni de modification clinique sans demande explicite.

### 4.2 Sous-agent (`.claude/agents/<nom>.md`)

| Champ | Rôle | Valeurs |
| --- | --- | --- |
| `name` | Identifiant unique | ex. `wn-fable` |
| `description` | Résumé pour la sélection de l'agent | texte |
| `tools` | Outils autorisés | ex. `Read, Grep, Glob, Bash` (lecture seule) |
| `model` | Modèle épinglé | `opus` / `sonnet` / `haiku` / `inherit` / id (`claude-fable-5`) |
| `effort` | Niveau d'effort | `low` / `medium` / `high` |

Corps : rôle en une ligne, périmètre (lecture seule, invariants), format de sortie.

## 5. Options de modèle (Claude Code)

- `/model opus | sonnet | haiku | default` : bascule manuelle en session.
- `/model opusplan` : bascule automatique (modèle fort en Plan, exécution allégée).
- `/model claude-fable-5` : force Claude Fable 5.
- Champ `model:` d'un sous-agent : déléguer à cet agent = basculer de modèle pour la tâche.
- Effort natif : réglé par l'intensité de réflexion `think` < `think hard` < `think harder` < `ultrathink`.

## 6. Limites

- Une skill ne change pas seule le modèle de la session : elle propose la commande `/model …` à valider.
- Le vrai basculement automatique par contexte passe par les sous-agents (modèles épinglés) et par `/model opusplan`.
- Le champ `effort` du frontmatter est une consigne d'auto-régulation ; il reste cohérent avec le paramètre `effort` natif (défaut `high` sur Opus 4.8 / Sonnet 5).
