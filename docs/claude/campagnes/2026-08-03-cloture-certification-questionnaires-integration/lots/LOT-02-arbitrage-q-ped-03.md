---
id: "LOT-02"
titre: "Arbitrage final de Q_PED_03"
statut: "livré"
dépend_de: "LOT-00"
---

# LOT-02 - Arbitrage final de Q_PED_03

Statut : livré. Le lot confirme le maintien de la suspension et réaligne les
traces qui continuaient à promouvoir une somme brute comme scoring certifié.

## Livré

- Arbitrage documenté : `ARBITRAGE_Q_PED_03.md`.
- Maintien de `Q_PED_03` en `suspendu`.
- Réalignement du scoring servi, du banc et de la matrice : la somme brute `/324`
  reste stable en interne, mais n'est plus promue comme `certifie`.

## Décision

- `Q_PED_03` reste fermé.
- La réouverture sur somme brute est explicitement rejetée.
- Toute réactivation future repartira de `repere` avec scoring dimensionnel
  complet et échelles de validité.

## Constats majeurs

- Le registre, le catalogue et l'aperçu praticien étaient déjà alignés sur la
  suspension.
- Le désalignement restant était interne : `Q_PED_03` était encore déclaré
  `certifie` dans le scoring servi et dans le banc `check_questionnaire_certification`.
- Corriger ce point ne rouvre pas l'instrument ; cela empêche seulement de
  présenter comme certifié un comportement que l'arbitrage clinique refuse.

## Tests et validations

- `cd web && npm run scoring-check`
- `cd web && npm run check`

## Done

- [x] `Q_PED_03` n'est plus dans une zone grise documentaire.
- [x] Le produit et ses gardes cessent de le présenter comme scoring certifié.
- [x] Les raisons du choix sont lisibles sans dépendre du contexte oral du 2026-08-01.

## Points de vigilance

- L'absence d'usage en production reste un argument fort pour conserver la suspension si le coût clinique et documentaire de reconstruction est disproportionné.
- Le prochain lot utile est `LOT-03`, pas une reprise immédiate de `Q_PED_03`.
