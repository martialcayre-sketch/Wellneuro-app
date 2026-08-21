# Catalogue des skills & agents — routage modèle / effort

> État courant. Décrit les skills et sous-agents Claude Code créés pour choisir le modèle et l'effort selon le contexte WellNeuro. Source canonique des conventions : les fichiers `.claude/skills/*/SKILL.md` et `.claude/agents/*.md` eux-mêmes.

## 1. Éléments créés

| Élément | Type | Fichier | Modèle | Effort |
| --- | --- | --- | --- | --- |
| `/wn-model` | Skill (slash-command) | `.claude/skills/wn-model/SKILL.md` | — (recommande) | low |
| `/wn-ultra` | Skill (slash-command) | `.claude/skills/wn-ultra/SKILL.md` | — (recommande le mode) | low |
| `/wn-route` | Skill (slash-command, manuel) | `.claude/skills/wn-route/SKILL.md` | — (combine route/modèle/mode) | low |
| `wn-fable` | Sous-agent | `.claude/agents/wn-fable.md` | `claude-fable-5` | high |

Modifications associées (épinglage de modèle sur des sous-agents existants) :

| Sous-agent | Avant | Après |
| --- | --- | --- |
| `wn-debugger` | `model: inherit` | `model: opus` |
| `wn-reviewer` | `model: inherit` | `model: opus` |
| `wn-doc-auditor` | `model: inherit` | `model: sonnet` |

## 2. Fonction et intérêt

### `/wn-model` — rappel des overrides de modèle

- **Fonction** : rappelle que le frontmatter `model:`/`effort:` des agents
  `.claude/agents/` fait foi, et les overrides disponibles : `/model`
  (`sonnet`, `opus`, `fable`, `opusplan` — Opus pour le plan, Sonnet pour
  l'exécution) et l'effort natif (`low`→`max`, défaut `high` via
  `settings.json`). Ne modifie aucun fichier, ne duplique pas la grille de
  `CLAUDE.md`.
- **Options d'appel** : `/wn-model` (manuel uniquement).

### `/wn-ultra` — rappel Fable vs Ultracode

- **Fonction** : rappelle la distinction — **Fable = profondeur
  exceptionnelle** (≥ 2 signaux forts), **Ultracode = largeur parallélisable**
  (opt-in explicite ponctuel, jamais un bug local), défaut solo, combinaison
  rare. Ultracode reste un **mode d'exécution, pas une autorisation** :
  migration, Supabase, déploiement et clinique gardent leurs portes.
- **Options d'appel** : `/wn-ultra` (manuel uniquement).

### `/wn-route` — routeur combiné de session

- **Fonction** : combine route, modèle et mode d'exécution en une seule règle courte (« Défaut : Sonnet 5 + high + solo ; Opus si risque critique ; Fable si profondeur exceptionnelle ; Ultracode si largeur parallélisable »). **Le défaut de session est porté directement par `CLAUDE.md`** (section « Modèle, effort, mode d'exécution ») : il n'y a plus de passe de méta-routage automatique en début de session.
- **Intérêt** : le routage ne coûte rien quand la demande tombe sur le défaut — aucun affichage, aucune invocation.
- **Options d'appel** : `/wn-route [tâche]` pour re-router explicitement en cours de session (manuel uniquement).

### `wn-fable` — sous-agent haut de gamme

- **Fonction** : traite en lecture seule les tâches très complexes ou long-cours (architecture, raisonnement clinique lourd, planification transverse) avec `claude-fable-5`.
- **Intérêt** : isole l'usage du modèle le plus coûteux ($10/$50 par MTok) dans un agent dédié, qui refuse les tâches simples et renvoie vers un modèle plus léger.

## 3. Mapping par défaut (version 2 — 2026-08-07)

| Contexte | Modèle | Alias | Effort |
| --- | --- | --- | --- |
| Dev courant, docs, tests, cadrage | Claude Sonnet 5 | `sonnet` (défaut) | high |
| Debug, revue, clinique, sécurité, auth, migration | Claude Opus | `opus` | high |
| Exploration, contexte, routage | Claude Haiku 4.5 | `haiku` | low |
| Profondeur exceptionnelle (≥ 2 signaux forts, forçable) | Claude Fable 5 | `claude-fable-5` | high |

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
| `effort` | Niveau d'effort natif appliqué pendant le tour du skill | `low` / `medium` / `high` / `xhigh` / `max` |

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
- Effort natif : `/effort low|medium|high|xhigh|max` en session, ou champ `effort:` du frontmatter d'un skill ou d'un agent. Les anciens mots-clés `think`/`think hard`/`think harder` ne sont plus reconnus par Claude Code (seul `ultrathink` subsiste, pour un surcroît de réflexion ponctuel — ce n'est pas un réglage d'`effort`).

## 6. Limites

- Une skill ne change pas seule le modèle de la session : elle propose la commande `/model …` à valider.
- Le vrai basculement automatique par contexte passe par les sous-agents (modèles épinglés) et par `/model opusplan`.
- Le champ `effort` du frontmatter (skills et agents) est un champ natif de Claude Code ; défaut WellNeuro : `high`.
