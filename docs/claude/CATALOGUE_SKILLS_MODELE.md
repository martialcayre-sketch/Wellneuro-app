# Catalogue des skills & agents — routage modèle / effort

> État courant. Décrit les skills et sous-agents Claude Code créés pour choisir le modèle et l'effort selon le contexte WellNeuro. Source canonique des conventions : les fichiers `.claude/skills/*/SKILL.md` et `.claude/agents/*.md` eux-mêmes.

## 1. Éléments créés

| Élément | Type | Fichier | Modèle | Effort |
| --- | --- | --- | --- | --- |
| `/wn-route` | Skill (slash-command, manuel) | `.claude/skills/wn-route/SKILL.md` | — (aide-mémoire complet) | low |
| `wn-fable` | Sous-agent | `.claude/agents/wn-fable.md` | `claude-fable-5` | high |
| `wn-reviewer` | Sous-agent | `.claude/agents/wn-reviewer.md` | `opus` | high |

> `/wn-model` et `/wn-ultra` ont été fusionnés dans `/wn-route` le
> 2026-08-21 (trois pointeurs de la même règle) ; les agents `wn-debugger`,
> `wn-doc-auditor` et `wn-hygiene-operator` ont été retirés le même jour
> (zéro usage tracé ; recouverts par `wn-debug`, `Explore`/`wn-docs` et
> `wn-hygiene`).

## 2. Fonction et intérêt

### `/wn-route` — aide-mémoire routage (manuel)

- **Fonction** : restitue en un écran la règle complète — défaut Sonnet 5 +
  high + solo ; Opus sur risque ou signal Fable unique ; Fable sur ≥ 2
  signaux forts ; Ultracode = largeur en opt-in (mot-clé « ultracode » ou
  `/effort ultracode`, retour `/effort high`) ; overrides `/model`
  (`sonnet`, `opus`, `fable`, `opusplan`). **Le défaut de session est porté
  par `CLAUDE.md`** : il n'y a plus de passe de méta-routage automatique.
- **Intérêt** : le routage ne coûte rien quand la demande tombe sur le
  défaut — aucun affichage, aucune invocation.
- **Options d'appel** : `/wn-route [tâche]` (manuel uniquement).

### `wn-fable` — sous-agent haut de gamme

- **Fonction** : traite en lecture seule les tâches très complexes ou long-cours (architecture, raisonnement clinique lourd, planification transverse) avec `claude-fable-5`.
- **Intérêt** : isole l'usage du modèle le plus coûteux ($10/$50 par MTok) dans un agent dédié, qui refuse les tâches simples et renvoie vers un modèle plus léger.

## 3. Mapping par défaut (version 2 — 2026-08-07)

| Contexte | Modèle | Alias | Effort |
| --- | --- | --- | --- |
| Dev courant, docs, tests, cadrage | Claude Sonnet 5 | `sonnet` (défaut) | high |
| Debug, revue, clinique, sécurité, auth, migration | Claude Opus | `opus` | high |
| Exploration (agent natif `Explore`) | Claude Haiku 4.5 | `haiku` | low |
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
