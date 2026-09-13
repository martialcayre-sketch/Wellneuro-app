### Les accusés de lecture ont écrit en production (2026-09-13)

Constatation seule — aucun changement de code.

Au soir du 2026-09-12, `portail_lectures_patient` était en service depuis
`16:00:51 UTC` et **vide** : son chemin d'écriture n'avait jamais été emprunté
autrement que par ses bancs et un E2E, et le fragment de la veille le disait pour
qu'on ne prenne pas ce silence pour un usage.

Lu au conteneur le 2026-09-13 à `10:02` (one-off-1057) :

```
lectures_lignes=2
lectures_par_espece=bilan:1
lectures_par_espece=synthese:1
reperes_encore_la=0
```

Un patient a ouvert un bilan et une synthèse ; les deux accusés sont là, un par
espèce. **La tâche correspondante a donc quitté son fil du jour** — c'est la
règle de `D-175` observée sur une vraie ligne, et non plus seulement sur un banc.

`portail_journal_reperes` reste absente.
