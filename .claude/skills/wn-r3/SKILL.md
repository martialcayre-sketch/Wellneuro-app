---
description: Lot R3 WellNeuro — transition progressive vers registre relationnel avec fallback legacy.
---

# LOT R3 — Registre relationnel packs/questionnaires

## Contexte injecté

!`test -f docs/claude/SESSION_LOG.md && tail -n 80 docs/claude/SESSION_LOG.md || true`
!`git status --short`

## Objectif

Faire lire progressivement les packs depuis le registre relationnel, avec fallback temporaire sur `packs.qids`.

## Contraintes fortes

- Ne pas supprimer `packs.qids`.
- Ne pas créer de migration destructive.
- Ne pas changer l’expérience praticien si non nécessaire.
- Préserver l’assignation existante.
- Changement minimal et réversible.

## Méthode

1. Lire les routes et services qui lisent les packs.
2. Identifier source actuelle : `packs.qids`, `questionnaire_packs`, `pack_questionnaires`.
3. Proposer un plan de lecture primaire registre + fallback legacy.
4. Attendre validation avant modification.
5. Ajouter ou proposer un rapport non destructif de cohérence si utile.
6. Vérifier aucun questionnaire perdu.

## Sortie attendue

- Fichiers lus/modifiés.
- Stratégie fallback.
- Risques résiduels.
- Commandes de test.
