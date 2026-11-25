### ProtocolMiniBuilder : un délai de 20 s pour les cinq cas à sept actions (miniBuilder-test-delai-propre, 2026-11-25)

Dans `web/src/components/patient-cockpit/ProtocolMiniBuilder.test.tsx`, les
cas qui saisissent sept actions une à une (« 7 typées », « 4 typées + 3
suspendues », « 1 typée + 6 vierges », et les brouillons 1 + 6 et 4 + 3 du
banc des actions vierges supprimées) dépassaient les 5 s par défaut sous la
charge de la suite entière locale. Seuls, ils prennent de 180 à 390 ms. Ils
reçoivent un délai explicite de 20 s, sur le modèle de
`FichePatientPanel.test.tsx`, avec un commentaire d'une ligne. Les autres
cas gardent le délai par défaut. Test seul : aucune assertion modifiée,
aucun code servi, `vitest.config.ts` inchangé.
