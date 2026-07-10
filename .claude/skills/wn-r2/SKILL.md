---
description: Lot R2 WellNeuro — finalisation du pack Base de consultation avec changements minimaux.
---

# LOT R2 — Pack « Base de consultation »

## Contexte injecté

!`test -f docs/claude/SESSION_LOG.md && tail -n 80 docs/claude/SESSION_LOG.md || true`
!`git status --short`

## Objectif

Stabiliser le pack « Base de consultation » comme socle clinique du premier rendez-vous.

## À vérifier

- Questionnaires réellement disponibles dans le catalogue.
- IDs utilisables.
- Ordre d’affichage.
- Durée totale estimée.
- Lisibilité patient.
- Doublons avec fiche signalétique/anamnèse.
- Pack assignable côté praticien.
- Pack visible côté patient.

## Périmètre probable

- Registre questionnaires/packs.
- UI praticien d’assignation si nécessaire.
- UI patient hub si nécessaire.
- Documentation si nécessaire.

## Interdits

- Pas de migration Prisma/SQL.
- Pas de suppression `packs.qids`.
- Pas de refonte UI globale.
- Pas de modification scoring clinique.
- Pas d’ajout de moteur clinique.

## Méthode

1. Lire `SESSION_LOG.md` dernière entrée.
2. Identifier les fichiers strictement nécessaires.
3. Présenter un plan et attendre validation avant modification.
4. Faire le changement minimal.
5. Vérifier build/type-check si possible.
6. Donner diff résumé et prochaine étape.
