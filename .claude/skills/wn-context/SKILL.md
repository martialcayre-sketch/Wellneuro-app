---
description: Produit un contexte WellNeuro compact et factuel pour reprendre une session sans recharger toute la documentation.
argument-hint: "[afficher|write]"
disable-model-invocation: true
effort: low
---

# WellNeuro — contexte compact

!`node scripts/wn-context-pack.mjs --format markdown`

Argument : `$ARGUMENTS`

- Par défaut, afficher le contexte généré sans modifier le dépôt.
- Avec `write`, écrire le résultat dans `docs/claude/HANDOFF_CURRENT.md`.
- Ne jamais inclure de secret, valeur `.env`, token patient ou donnée patient réelle.
- Limiter le document à 120 lignes.
