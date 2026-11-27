### Banc de parité : commentaires recalés sur le job `controles` et sur le sens check → CI (2026-11-27)

L'en-tête de `scripts/parite-check-ci.test.mjs` et la JSDoc de
`commandesCiAvantNpm` nommaient encore le job `verify`, alors que la lecture
porte sur `controles` depuis le découpage du 2026-10-27 ; le commentaire de
l'étape « Parité » de `.github/workflows/ci.yml` disait « L'inverse n'est pas
contrôlé », faux pour la liste `bancs-outillage-check` depuis le sens
check → CI. Diff de commentaires seul : aucune ligne de code, de test ni
d'étape du CI ne change. La JSDoc d'`etapesHorsParite`, qui nomme à bon droit
le job `verify` (sans `setup-node`), reste telle quelle.
