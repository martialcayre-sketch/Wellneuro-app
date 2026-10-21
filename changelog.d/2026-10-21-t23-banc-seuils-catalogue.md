### Tests : les seuils du catalogue ne bougent plus sans décision (t23)

- Les seuils, bandes et interprétations des 65 questionnaires — ceux des blocs
  `scoring` ET ceux que le moteur de `questions.ts` écrit en dur (Horne, QIF,
  Berlin, AUDIT, composantes du PSQI, Karasek, Bristol…) — n'étaient gardés
  que par une procédure. Un banc (`seuilsCatalogue.guard.test.ts`) les fige
  désormais dans un instantané d'empreintes (`seuilsCatalogue.instantane.json`)
  : toute retouche, refactoring du moteur compris, rougit le CI tant que
  l'historique n'a pas reçu une étape portant une décision `D-xxx` présente au
  registre et postérieure à la pose. Les étapes de pose ne se réécrivent pas.
  Jamais un verrou : le scoring en production n'est pas touché. Arbitrages du
  2026-10-21 (forme, puis portée après contre-revue). Limites déclarées : les
  valeurs d'options (`sections`) et le contenu des modules importés par
  `questions.ts` (seul l'import l'est). Aucun seuil, aucune règle clinique
  modifiés.
