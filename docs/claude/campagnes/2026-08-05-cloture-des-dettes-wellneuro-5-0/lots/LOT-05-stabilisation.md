---
id: "LOT-05"
titre: "Matrice de consommation du savoir"
statut: "à_faire"
dépend_de: "LOT-01"
---

# LOT-05 — Matrice de consommation du savoir

## But

L'ingestion est complète, la consommation ne l'est pas. Plusieurs corpus validés à
100 % sont mappés sans appelant, cachés derrière un flag, exposés dans une
bibliothèque sans être intégrés au raisonnement clinique, ou jamais transformés en
règle de conduite.

Deux doubles verrous connus laissent des surfaces livrées **et dormantes** :
`WN_ENABLE_ORIENTATION_NNPP2` + `tableSignee`, et `WN_ENABLE_CORPUS_CLINIQUE_V1` +
`validationExterne`. La table d'orientation elle-même est livrée depuis le
2026-07-25 (#361) et dort en fail-closed.

La prochaine étape n'est **pas** davantage d'ingestion. C'est de savoir ce qui est
consommé et par quoi.

## Résultat observable

Une matrice, **générée** et non rédigée à la main, à cinq colonnes :

| Source de savoir | Surface qui la consomme | Décision produite | Validation requise | Patient visible |
|---|---|---|---|---|

Chaque ligne est dérivée du code : une source sans appelant apparaît avec une
surface vide — c'est précisément l'information recherchée.

## Périmètre

- Écrire le générateur de la matrice (extension naturelle de `wn-etat-reel.mjs`,
  LOT-01, ou script frère).
- Recenser les sources de savoir, les flags qui les gardent, et leurs appelants.
- Pour chaque source sans appelant : trancher entre *à brancher*, *à laisser
  dormante avec sa raison*, ou *à retirer*.
- Décider explicitement du sort de #372 (rubriques de six questionnaires,
  ouverte depuis le 2026-07-25) : son périmètre a-t-il été absorbé par #566/#567 ?

## Hors périmètre

- **Toute nouvelle ingestion de savoir** — contrainte de campagne.
- Lever un flag ou activer une surface en production : c'est une décision
  praticien, hors de ce lot.
- Modifier une règle d'orientation.

## Fichiers probables

- `scripts/wn-matrice-consommation.mjs` (nouveau)
- `web/src/lib/clinical/orientationRulesV1.ts`, `orientationEngine.ts`
- `web/src/lib/supplement-library/featureFlag.ts`, `catalogue.ts`
- `web/src/lib/anthropic.ts`
- `docs/claude/PROJET_CONTEXTE.md`
- `changelog.d/2026-08-05-matrice-de-consommation.md`

## Interdits

- Aucune ingestion.
- Aucun changement de valeur de flag.
- Pas d'appel de modèle facturé sans validation explicite du coût.

## Étapes

- [ ] Recenser sources, flags et appelants.
- [ ] Écrire le générateur.
- [ ] Lister les sources sans appelant, et trancher pour chacune.
- [ ] Statuer sur #372.
- [ ] T1 puis T2.

## Tests

- Test du générateur sur fixtures : une source sans appelant doit apparaître avec
  une surface vide, pas être silencieusement omise.

## Critères de done

- [ ] La matrice est générée et non vide.
- [ ] Chaque source sans appelant porte une décision datée.
- [ ] Le sort de #372 est tranché.
- [ ] La matrice est référencée depuis `docs/claude/PROJET_CONTEXTE.md`.

## Résultats

À compléter à la clôture.
