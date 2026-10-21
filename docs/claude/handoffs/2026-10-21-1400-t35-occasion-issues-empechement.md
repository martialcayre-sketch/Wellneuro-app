# Handoff — t35 : sans occasion, seules les issues d'empêchement (D-337)

## Branche et état du dépôt

- Branche `lot/t35-occasion-empechement`, worktree `d281-lot3-portail`,
  partie de `origin/main` (e0b9f335). Sans migration, sans drapeau nouveau.

## Objectif

Dette D-JA-03 (D/42, file A) : « Je l'ai fait » et « J'ai adapté » restaient
choisissables quand l'occasion ne s'était pas présentée.

## Décisions prises

- Arbitrage du responsable du 2026-10-21 (file D, D/42), transcrit en
  `D-337` (numéro libre sur main au e0b9f335) : sans occasion, seules
  « En partie, ou empêché·e » et « Oublié ou pas noté ».
- Aucune issue choisie à la place du patient : passer à « Non » efface
  « fait » ou « adapté » ; la trace ne s'enregistre pas sans choix.
- Règle portée par le domaine (`issuesProposees`, refus dans
  `createTrialTrace`), pas seulement par l'écran.

## Fichiers modifiés

- `web/src/lib/food-observation/trace.ts` (+ test).
- `web/src/components/food-observation/PatientFoodObservationPanel.tsx` (+ test).
- `web/src/components/patient-food-observation/FoodObservationJourney.tsx` (+ test).
- `docs/DECISIONS.md` (D-337), `docs/claude/PLAN_WELLNEURO.md` (D/42 soldée),
  `changelog.d/2026-10-21-t35-occasion-issues-empechement.md`, SESSION_LOG.

## Validations exécutées

- Vitest ciblé (food-observation, deux dossiers de composants) : 18 fichiers,
  176 tests verts ; T1 rapide vert ; T1 complet et T2 `--fast` avant la PR
  (résultat dans la PR).

## Problèmes ouverts

- Les traces déjà enregistrées ne sont ni relues ni corrigées (D-337 §4).
- `DETTE_JA.md` n'est plus tenu (le plan fait foi) : sa ligne D-JA-03 reste
  telle quelle.

## Prochaine action exacte

CI, CodeRabbit sur la tête, merge, déploiement constaté ; t35 → « fait » au
suivi ; puis t34 (barème de charge) dans une session dédiée.

## Interdits encore actifs

- Un merge à la fois ; aucune image antérieure à 257807e3 redéployée ; rien
  de clinique sans D-xxx ; revérifier D-337 libre sur main au merge.
