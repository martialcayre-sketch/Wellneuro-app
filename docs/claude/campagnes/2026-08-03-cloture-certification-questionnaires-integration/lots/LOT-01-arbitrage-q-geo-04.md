---
id: "LOT-01"
titre: "Arbitrage final de Q_GEO_04"
statut: "livré"
dépend_de: "LOT-00"
---

# LOT-01 - Arbitrage final de Q_GEO_04

Statut : livré. Le lot a confirmé le maintien de `Q_GEO_04` en
`contenu_verrouille` et n'a touché ni aux seuils, ni aux bandes, ni au moteur
de scoring.

## Livré

- Arbitrage documenté : `ARBITRAGE_Q_GEO_04.md`.
- Confirmation qu'aucune pièce nouvelle ne permet de lever les quatre bandes
  `27-30`, `21-26`, `10-20`, `0-9` hors du plafond actuel.
- Confirmation que le split runtime déjà en place est voulu :
  `PASSATION_PRATICIEN` oui, `actif: false` oui, assignation non.
- Alignement des traces de campagne sur cette décision.

## Décision

- `Q_GEO_04` reste `contenu_verrouille`.
- Le verrou d'assignation reste en place.
- L'usage praticien en consultation reste autorisé via l'aperçu, sans que cela
  vaille promotion du scoring ou des bandes.

## Constats majeurs

- Le banc établit les items et la structure, pas la provenance des bandes.
- Les bandes restent attribuées à une HAS 2011 non vérifiée sur pièce dans ce
  dépôt.
- Aucune trace lue pendant ce lot ne permet un réalignement honnête vers
  `scoring_verifie`.

## Tests et validations

- `node scripts/wn-campaign-audit.mjs --no-fail`
- `git diff --check -- docs/claude/campagnes/2026-08-03-cloture-certification-questionnaires-integration`

## Validation différée si un futur lot modifie le runtime clinique

- `cd web && npm run scoring-check`
- `cd web && npm run check`
- Tests ciblés sur l'aperçu praticien et l'assignation si le contrat runtime de
  `Q_GEO_04` évolue.

## Done

- [x] `Q_GEO_04` a un statut explicite et cohérent dans toutes les sources lues.
- [x] Le runtime déjà en place reflète correctement ce statut.
- [x] Les limites résiduelles sont documentées sans faux sentiment de réouverture.

## Points de vigilance

- Le verrou `contenu_verrouille` protège une absence de source sur des bandes
  HAS 2011 ; il ne doit pas être levé par simple confort produit.
- Le prochain travail utile n'est pas de retoucher `Q_GEO_04`, mais d'ouvrir
  `LOT-02` pour `Q_PED_03`.
