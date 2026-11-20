### Corpus : la notice HAS lombalgie entre au registre des interventions (2026-11-20)

- `main` rougissait sur `npm run interventions-check` depuis #2288 : la notice
  `WN-SRC-0821` (HAS 2019, « Prise en charge du patient présentant une
  lombalgie commune ») entre dans le critère de sélection par son titre
  (« prise en charge ») mais manquait à `nnpp2_interventions_registry.json`.
- Entrée ajoutée : axe `douleurs-chroniques` (notebook 06), `sousAxe` null
  (aucune règle de titre ne la reconnaît), 0 claim, `sans_claim` motivé par la
  notice seule accordée par le responsable. Aucun code, aucun seuil, aucune
  donnée de production.
