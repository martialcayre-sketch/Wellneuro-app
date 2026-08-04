---
description: Affiche un contexte WellNeuro compact et factuel pour reprendre une session sans recharger toute la documentation. N'écrit rien — pour produire un document de reprise, voir /wn-handoff.
argument-hint: "[afficher]"
disable-model-invocation: true
effort: low
---

# WellNeuro — contexte compact

!`cd "$(git rev-parse --show-toplevel)" && node scripts/wn-context-pack.mjs --format markdown`

Argument : `$ARGUMENTS`

- **Affichage seul : ce skill n'écrit aucun fichier.** Il rend l'état factuel —
  branche, campagne, corpus, derniers commits — et rien d'autre. Le document de
  reprise (décisions, interdits, prochaine action) est le ressort de
  `/wn-handoff`, seul à poser un fragment dans `docs/claude/handoffs/`. <!-- mention-seule: wn-handoff -->
- Ne jamais inclure de secret, valeur `.env`, token patient ou donnée patient réelle.
- Limiter le document à 120 lignes.
