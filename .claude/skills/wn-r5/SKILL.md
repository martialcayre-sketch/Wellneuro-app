---
description: Lot R5 WellNeuro — validation de la synthèse IA enrichie par anamnèse et vigilances, sans extension clinique.
---

# LOT R5 — Validation synthèse IA enrichie

## Contexte injecté

!`test -f docs/claude/SESSION_LOG.md && tail -n 80 docs/claude/SESSION_LOG.md || true`
!`git status --short`

## Objectif

Valider que la synthèse IA exploite correctement fiche signalétique, anamnèse, traitements, compléments, signaux d’alerte et scores, sans ajouter de nouveau moteur clinique.

## Scénarios

- Sans anamnèse.
- Avec anamnèse complète.
- Avec traitements.
- Avec compléments.
- Avec signal d’alerte.
- Avec DNSM.
- Avec questionnaires partiels.

## Interdits

- Pas de prescription automatique.
- Pas de protocole 21 jours automatisé.
- Pas de modification des seuils de scoring.
- Pas de migration.
- Pas de donnée patient réelle.

## Méthode

1. Lire les routes/services de synthèse strictement nécessaires.
2. Lister les entrées réellement utilisées.
3. Établir checklist de validation.
4. Proposer correctifs uniquement si bug objectivé.
5. Attendre validation avant toute modification.
