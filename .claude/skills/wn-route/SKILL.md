---
description: Aide-mémoire routage — modèle, effort, mode d'exécution (manuel).
argument-hint: "[demande]"
disable-model-invocation: true
effort: low
---

# WellNeuro — routage

Demande : `$ARGUMENTS`

- **Défaut : Opus 5.5 + high + solo** (épinglé dans `settings.json`,
  arbitrage du 2026-09-30 ; le frontmatter `model:`/`effort:` des agents
  `.claude/agents/` fait foi).
- **Délégué : Sonnet** — `Explore` dès ~5 lectures prévues ; sous-agents sans
  modèle via `CLAUDE_CODE_SUBAGENT_MODEL`.
- Risque critique (sécurité, auth, migration/Prisma, clinique/scoring, revue
  critique, bug résistant) : le défaut Opus, plus `Agent(wn-reviewer)`.
- Difficulté conceptuelle exceptionnelle (≥ 2 signaux forts) : **Fable** ;
  un seul signal fort de cette liste : **Opus**.
- Largeur réellement parallélisable : **Ultracode** — opt-in explicite
  ponctuel (mot-clé « ultracode », ou `/effort ultracode` : xhigh +
  orchestration automatique ; retour par `/effort high`) — jamais un bug
  local, même difficile.
- Profondeur + largeur : **Fable + Ultracode** — rare, chaque moitié garde
  son critère propre.
- Overrides : `/model` (`sonnet`, `fable`) **juste après `/clear`** —
  changer de modèle en cours de session réécrit tout le cache ; effort natif
  low→max, jamais augmenté sans signal. Un override nommé par l'utilisateur
  prime.
- Sinon : ne rien faire ni commenter. Sortie uniquement si déviation du
  défaut : une ligne + la commande exacte.
