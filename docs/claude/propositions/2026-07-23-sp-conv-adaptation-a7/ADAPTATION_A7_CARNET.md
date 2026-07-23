---
statut: adaptation_actee
---

# Adaptation d'A7 — « Ma spirale alimentaire » devient « Mon carnet alimentaire »

> Décision utilisateur recueillie le 2026-07-22 (cadrage SP-CONV, question
> ouverte n°1 : « nom du module alimentaire = Mon Carnet Alimentaire »),
> **actée au registre le 2026-07-23** (amendement daté de l'entrée A7, sur
> place, jamais réécrite). Modèle du geste :
> `2026-07-16-journal-alimentaire-5-0/12_CONTREPOINT_ET_ADAPTATION.md`.

## Le problème

L'audit UX du 2026-07-22 l'a nommé : la métaphore centrale du produit a été
fragmentée par le vocabulaire. Le sous-module alimentaire portait la marque
la plus forte (« Ma spirale alimentaire », A7 du 2026-07-16), tandis que la
trajectoire globale du patient s'appelait « Mon parcours » — précisément
parce que le mot Spirale était déjà pris (commentaire de
`MonParcoursAccueil.tsx`). La Spirale doit rester le concept fédérateur de
WellNeuro, pas le nom d'un instrument particulier.

## La décision

- Le **nom patient** de l'instrument devient **« Mon carnet alimentaire »**
  (casse de surface alignée sur « Mon équilibre » / « Mon parcours »).
- « Spirale » est **réservée à la trajectoire globale** — côté praticien
  (Fiche-trajectoire, index temporel) comme côté patient (le parcours).
- Le nom praticien (« Trajectoire alimentaire ») est inchangé.

## Ce qui ne change pas

Tout le fond d'A7 : les trois régimes (calibrage / essai / silence), les
politiques A7-1…A7-14, la gouvernance métrologique, les frontières JA. Un
renommage de surface n'est pas un recadrage d'instrument.

## Exécution

SP-CONV LOT-05 (2026-07-23) : `LABEL_INSTRUMENT_PATIENT` dans
`web/src/lib/food-observation/labels.ts` + quatre occurrences codées en dur
(hub questionnaires, boussole, `PatientFoodObservationPanel`,
`ValidationJaHarness`) + tests et E2E. Coût mesuré : six fichiers de
surface, zéro logique.
