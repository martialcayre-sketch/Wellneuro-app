### Un banc relie enfin `FEATURE_FLAGS.md` à l'état réel des signatures (2026-08-16)

Dette nommée par [[D-064]], soldée. `docs/FEATURE_FLAGS.md` avait annoncé
« `validationExterne: false` → fermé quoi qu'on pose » pendant trois jours sur
deux tables déjà signées, et rien ne l'avait dit : ni le type-check, ni les
contrats SQL, ni la revue ne comparent un tableau de documentation aux
métadonnées qu'il décrit. C'est le document qu'on lit AVANT de poser un drapeau
en production.

- **Tableau d'état épinglé.** `FEATURE_FLAGS.md` porte désormais un bloc
  `ETAT_VERROUS_SIGNATURE` : une ligne par table porteuse d'une signature, avec
  son `validationExterne` et sa `dateValidation`.
- **`verrousSignatureDocumentes.guard.test.ts`** compare ce bloc au code et
  rougit sur quatre situations : un booléen faux, une date fausse, une table
  signée absente du tableau, et le retour de la formule « fermé quoi qu'on
  pose » sur une table signée. Le balayage couvre `clinical/` ET
  `biology-library/` — la table dont la signature est la plus fragile
  ([[D-063]]) n'est pas sous `clinical/`.
- **Éprouvé par mutation**, pas seulement vert : les trois premières situations
  ont été provoquées et le banc les a nommées précisément avant restauration.

Ce banc ne juge aucune signature — signer reste un acte praticien
(`DC-17`, `DC-18`). Il exige seulement que le dépôt le dise là où on vient le
lire. La date compte autant que le booléen : `validationExterne: true` avec
`dateValidation: null` est une signature incomplète, donc un verrou fermé.

Reste ouvert de `D-064` : aucun banc n'éprouve encore « arrêt signé +
contradictions inactives » — la configuration exacte qui a laissé le trou
invisible. Elle appelle d'abord l'arbitrage clinique laissé ouvert par `D-064`
(faut-il conditionner l'extinction à `contradictionsActives()` dans le code ?).
