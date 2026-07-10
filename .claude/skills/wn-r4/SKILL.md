---
description: Lot R4 WellNeuro — harmonisation UX patient selon design system, sans refonte fonctionnelle.
---

# LOT R4 — Harmonisation UX patient

## Contexte injecté

!`test -f docs/claude/SESSION_LOG.md && tail -n 80 docs/claude/SESSION_LOG.md || true`
!`git status --short`

## Objectif

Aligner le parcours patient sur la charte WellNeuro sans modifier la logique métier.

## Cibles

- Hub « Mes questionnaires ».
- Page questionnaire.
- Boutons sauvegarde/reset/transmission/correction.
- Badges de statut.
- Messages d’erreur et d’aide.
- Mobile/tactile.

## Direction visuelle

- Ambiance patient : claire, douce, lisible, mobile first.
- Éviter les bleus Tailwind génériques.
- Ne jamais coder un statut uniquement par la couleur.
- UI en français.

## Interdits

- Pas de changement API.
- Pas de migration.
- Pas de scoring.
- Pas de refonte du dashboard praticien.
- Pas de refactor large.

## Méthode

1. Identifier uniquement les composants patient concernés.
2. Proposer un mini-plan visuel.
3. Attendre validation avant modification.
4. Appliquer des changements CSS/composants minimaux.
5. Vérifier responsive et accessibilité de base.
