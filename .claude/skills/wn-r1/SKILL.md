---
description: Lot R1 WellNeuro — validation E2E du parcours patient unifié, sans modification.
---

# LOT R1 — Validation E2E du parcours patient unifié

## Contexte injecté

!`test -f docs/claude/SESSION_LOG.md && tail -n 80 docs/claude/SESSION_LOG.md || true`
!`git status --short`

## Objectif

Tester et documenter le parcours patient complet sans ajouter de fonctionnalité.

## Patient de test

Utiliser uniquement : Sophie Nicola, Jennifer Martin ou Michel Dogne.

## Parcours à vérifier

1. Accès portail `/portail/[token]`.
2. Email saisi une seule fois.
3. Consentement groupé non répété inutilement.
4. Fiche signalétique.
5. Anamnèse.
6. Hub « Mes questionnaires ».
7. Choix libre du questionnaire.
8. Page autonome du questionnaire.
9. Sauvegarde brouillon.
10. Restauration brouillon.
11. Reset uniquement si non transmis.
12. Transmission au praticien.
13. Verrouillage après transmission.
14. Demande de correction avec commentaire.
15. Affichage côté praticien si nécessaire.
16. Correction puis retransmission.
17. Lisibilité mobile.

## Interdits

- Ne modifie rien au départ.
- Pas de migration.
- Pas de refactor.
- Pas de changement scoring.
- Pas de donnée patient réelle.

## Sortie attendue

Checklist E2E avec : étape, attendu, observé, bug éventuel, priorité, lot correctif proposé si nécessaire.
