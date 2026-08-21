---
description: Aide-mémoire routage — modèle, effort, mode d'exécution (manuel).
argument-hint: "[demande]"
disable-model-invocation: true
effort: low
---

# WellNeuro — routage

Demande : `$ARGUMENTS`

- **Défaut : Sonnet 5 + high + solo** (épinglé dans `settings.json` ; le
  frontmatter `model:`/`effort:` des agents `.claude/agents/` fait foi).
- Risque critique (sécurité, auth, migration/Prisma, clinique/scoring, revue
  critique, bug résistant) : **Opus**.
- Difficulté conceptuelle exceptionnelle (≥ 2 signaux forts) : **Fable** ;
  un seul signal fort de cette liste : **Opus**.
- Largeur réellement parallélisable : **Ultracode** — opt-in explicite
  ponctuel (mot-clé « ultracode », ou `/effort ultracode` : xhigh +
  orchestration automatique ; retour par `/effort high`) — jamais un bug
  local, même difficile.
- Profondeur + largeur : **Fable + Ultracode** — rare, chaque moitié garde
  son critère propre.
- Overrides : `/model` (`sonnet`, `opus`, `fable`, `opusplan` — Opus pour le
  plan, Sonnet pour l'exécution) ; effort natif low→max, jamais augmenté
  sans signal. Un override nommé par l'utilisateur prime.
- Sinon : ne rien faire ni commenter. Sortie uniquement si déviation du
  défaut : une ligne + la commande exacte.
