# Handoff — 2026-11-09 — Espacement des entrées de « Mon espace » (D-460)

## Branche et état Git

`fix/portail-espacement-entrees`, worktree `.claude/worktrees/portail-espacement-entrees`, partie d'`origin/main@2b3156aa`. Le `main` local n'est pas touché.

## Objectif

Séparer les entrées de deux lignes avant la pose de `WN_PORTAIL_MENU_ICONES`, à la demande du responsable (« Corriger d'abord »).

## Décisions prises

- `py-1` sur les liens de `ListeMonEspace`, actif compris, sous le drapeau seul. Une marge entre les éléments aurait aussi desserré les entrées d'une ligne ; le remplissage est absorbé par `min-h-11`, et seules les entrées qui passent à la ligne grandissent.
- PR déclarée « prête @<sha> » à l'intégrateur : la reprise définitive du 2026-11-08 ([[D-454]], amendement) l'emporte sur la consigne du 2026-11-03 propre à cette série. Filet à vingt minutes.

## Fichiers modifiés

- `web/src/components/patient/menu/MenuMonEspace.tsx` et `organisationIcones.test.tsx`.
- `docs/claude/propositions/2026-11-01-portail-rails-et-menus/README.md` : point du constat local.
- `docs/claude/PLAN_WELLNEURO.md` : ligne de la file C.
- `changelog.d/2026-11-09-d460-espacement-entrees.md`, `docs/claude/plan-journal/H83/2026-11-09-01-espacement-entrees.md` et ce handoff.

## Validations exécutées

- T1 vert. T2 rapide local, drapeau armé : 357 E2E passés, 23 ignorés, aucun échec.
- Spec Playwright jetable, retiré du dépôt, sur sept réglages : 13 px entre deux entrées voisines d'un même groupe, 14 px à 112,5 %, pour 5 px entre deux lignes d'un libellé ; entrée d'une ligne à 44 px, 49,5 px à 112,5 % ; aucun débordement. Captures relues à 800 et 1 024 px. Base de test détruite.

## Problèmes ouverts

- Non constaté : quatrième case et quatrième onglet, vrai questionnaire en cours, page imprimée, appareil à encoche, production.

## Prochaine action exacte

Le responsable demande ou non la pose de `WN_PORTAIL_MENU_ICONES`, suivie d'un constat en production.

## Interdits encore actifs

- Aucun drapeau posé ou retiré sans demande explicite du responsable.
- Jamais le `main` local.
