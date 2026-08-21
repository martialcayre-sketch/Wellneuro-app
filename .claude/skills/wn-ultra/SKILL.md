---
description: Mode d'exécution — solo par défaut ; Ultracode = largeur parallélisable en opt-in explicite ; Fable = profondeur exceptionnelle.
argument-hint: "[tâche] | ultracode | solo"
disable-model-invocation: true
effort: low
---

# WellNeuro — mode d'exécution

Demande : `$ARGUMENTS`

- **Défaut : solo.**
- **Fable** répond à la profondeur exceptionnelle ; **Ultracode** à la largeur
  réellement parallélisable — jamais un bug local, même difficile.
- Ultracode : **opt-in explicite ponctuel** — mot-clé « ultracode » dans la
  demande, ou `/effort ultracode` (natif : impose xhigh et l'orchestration
  automatique par workflows ; retour par `/effort high`). Jamais un réglage
  permanent.
- Combiner Fable + Ultracode (profondeur **et** largeur) : rare, exige les
  deux simultanément.
