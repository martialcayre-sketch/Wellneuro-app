---
id: "LOT-01"
titre: "Revue des apports résiduels"
statut: "à_faire"
dépend_de: "LOT-00"
---

# LOT-01 — Revue des apports résiduels

## But

Déterminer si 21 branches contiennent encore un apport absent de `main`.

## Périmètre

- les 21 branches de la section « Apport résiduel à vérifier » de
  `CAMPAGNE.md`.

## Étapes

- comparer chaque branche à son merge-base avec `origin/main` ;
- distinguer contenu unique, duplication et suppression parasite ;
- documenter un verdict par branche ;
- extraire uniquement un changement prouvé utile, jamais la branche entière.

## Interdits

- aucune modification de scoring, de seuil ou d'interprétation ;
- aucun merge ou cherry-pick global ;
- aucune suppression de branche.

## Tests

- audit en lecture seule ; si un changement documentaire est retenu, T1 ;
- si un changement clinique apparaît nécessaire, arrêt et plan séparé avec T3.

## Critères de done

- verdict et preuve pour chacune des 21 branches ;
- absence de régression ou de réimport de contenu déjà mergé.
