# Dettes ouvertes — JA (Ma spirale alimentaire)

> Dettes non bloquantes, consciemment acceptées. Chaque entrée a un
> propriétaire et une échéance de revue. Aucune n'a été maquillée comme
> résolue.

## JA5-02 — Parcours patient (harnais `/dev/validation-ja`, PR #134, 2026-07-18)

Issues de la revue indépendante du lot. Le code livré est un harnais de
validation local (route verrouillée `NODE_ENV=development`, aucun réseau /
stockage / persistance / donnée patient réelle) ; les dettes ci-dessous
concernent la robustesse des garanties, pas un comportement livré défaillant.

| # | Dette | Propriétaire | Échéance de revue |
|---|---|---|---|
| D-JA-01 | Garde architecturale « no-network/no-storage » (`ja5Architecture.test.ts`) à élargir : ne scanne que `FoodObservationJourney.tsx` (pas `ValidationJaHarness.tsx` ni `ja5ValidationFixture.ts`) et par sous-chaîne — ne couvre pas `XMLHttpRequest`, `navigator.sendBeacon`, `indexedDB`, `import()` dynamique. Aucune fuite réelle constatée aujourd'hui. | dev | avant tout branchement patient réel (activation JA5-05) |
| D-JA-02 | Test manquant : vérifier que `page.tsx` (`ValidationJaPage`) appelle bien `notFound()` quand `NODE_ENV !== 'development'` (seule la fonction pure `isValidationJaHarnessAvailable` est testée). | dev | prochaine passe tests JA |
| D-JA-03 | Cohérence clinique : l'issue « Je l'ai fait » / « J'ai adapté » reste sélectionnable quand l'occasion ne s'est **pas** présentée (occasion = Non). À trancher côté clinique (restreindre aux issues d'empêchement, ou laisser libre) ; documenter dans `CHANGELOG.md` si changement de logique. | praticien | revue clinique JA5-03 |
