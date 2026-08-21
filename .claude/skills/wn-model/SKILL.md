---
description: Choix de modèle et d'effort — le frontmatter des agents fait foi ; overrides par /model.
argument-hint: "[tâche] | sonnet | opus | fable | opusplan"
disable-model-invocation: true
effort: low
---

# WellNeuro — modèle et effort

Demande : `$ARGUMENTS`

- Le frontmatter `model:`/`effort:` des agents `.claude/agents/` fait foi.
- Overrides : `/model` — `sonnet`, `opus`, `fable`, `opusplan` (Opus pour le
  plan, Sonnet pour l'exécution).
- Effort natif : `low`/`medium`/`high`/`xhigh`/`max` ; défaut `high`
  (`settings.json`).
- La grille de choix vit dans `CLAUDE.md` § Modèle, effort, exécution — pas de
  duplication ici.
