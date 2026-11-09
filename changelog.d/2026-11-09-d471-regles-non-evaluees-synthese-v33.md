### Synthèse IA : les règles d'orientation non évaluées partent au modèle, consigne `synthese-v33` (D-471, t61, 2026-11-09)

Arbitrages `20261109-1355-a` à `1357-a` du 2026-11-09 ; texte de la consigne validé par le responsable après deux
corrections de sa main. Prolonge D-433 §3 jusqu'à la synthèse. Aucun seuil, aucune migration, aucune `release-db`.

- Nouveau module `web/src/lib/synthese/blocReglesNonEvaluees.ts` : le bloc « Règles d'orientation non évaluées » lit
  le seul `reglesNonEvaluees` du moteur, jamais l'âge des passations. Une ligne par passation, dans l'ordre de la
  table, sans identifiant de règle ni nombre. Il suit le bloc de recommandation et part même quand celui-ci est
  absent.
- Consigne `synthese-v33` : une mention unique au praticien (« certaines règles qui le lisent n'ont pas été
  évaluées »), aucune proposition de refaire un questionnaire, la passation présentée comme dernière mesure datée et
  non comme l'état actuel, rien dans `narratif_patient`.
- Trace : `donneesEntree.blocReglesNonEvaluees` (texte parti) et `donneesEntree.reglesNonEvaluees` (identifiants,
  hors message).
- Bancs : `blocReglesNonEvaluees.test.ts`, `promptReglesNonEvaluees.guard.test.ts` (section épinglée),
  `reglesNonEvaluees.generation.test.ts` ; empreintes v33 reportées dans `promptAlimentaire.guard.test.ts` et
  `anthropic.corpusActif.guard.test.ts`.
