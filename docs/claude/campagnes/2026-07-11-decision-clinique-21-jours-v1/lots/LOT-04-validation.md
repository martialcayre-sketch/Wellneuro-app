---
id: "LOT-04"
titre: "Protocole 21 jours minimal"
statut: "à_faire"
dépend_de: "LOT-03"
---

# LOT-04 — Protocole 21 jours minimal

## But

Permettre la composition d'un brouillon de protocole sobre, limité à trois
actions, puis sa validation explicite par le praticien.

## Résultat observable

Un ProtocolDraft avec objectif, actions, plans, charge, critères observables,
précautions, versions et statut de validation.

## Périmètre

- trois actions maximum ;
- plans idéal, minimal et secours ;
- budget de charge et justification des dérogations ;
- brouillon et validation praticien.

## Hors périmètre

- persistance longitudinale C2 ;
- envoi automatique ;
- choix autonome de produit, dose ou priorité.

## Fichiers probables

- DecisionCard LOT-03
- intentions cliniques existantes après audit
- composants partagés HC-F

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de migration ou écriture Supabase sans confirmation distincte.
- Pas de refactor hors lot.

## Étapes

- [ ] Vérifier les hypothèses.
- [ ] Implémenter le changement minimal.
- [ ] Exécuter les validations.
- [ ] Relire le diff.
- [ ] Documenter les résultats.

## Tests

Tests unitaires du budget de charge, validation des transitions d'état et E2E
brouillon→validation sans transmission implicite.

## Critères de done

- maximum de trois actions garanti ;
- protocole excessif bloqué ou justifié ;
- plans et critères présents ;
- validation humaine obligatoire.

## Résultats

À compléter à la clôture.
