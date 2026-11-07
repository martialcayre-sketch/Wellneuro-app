# Handoff — 2026-11-07 — Trois défauts de la série « rails et menus »

## Branche et état Git

`fix/portail-defauts-rails-et-menus`, worktree `.claude/worktrees/constat-rails-et-menus`, partie de `origin/main@b5b4c040`. Le `main` local n'est pas touché.

## Objectif

Corriger, à la demande du responsable, les défauts relevés au constat du 2026-11-07.

## Décisions prises

- Mineur clos et saut de colonne : le responsable n'a pas répondu aux options posées. Options recommandées, amendements datés à [[D-341]] §5 et [[D-447]] §6, retenus par le responsable le 2026-11-07.
- « Reprendre » ou « Commencer » : pas un défaut. `hasDraft` lit un brouillon gardé sur l'appareil, et la page le dit au patient. Le corriger exigerait de stocker des réponses de santé côté serveur.
- `ui-ux-pro-max` : `D-456` le réserve à la relecture. Le catalogue a servi à vérifier ; les corrections sont écrites à la main.

## Fichiers modifiés

- `web/src/components/patient/frise/FriseEtapesNavigable.tsx`, `web/src/components/patient/DateNaissanceEcran.tsx`, `web/src/app/portail/[token]/questionnaires/page.tsx`, `web/src/components/patient/menu/MenuMonEspace.tsx`, `web/src/components/patient/rail/RailMonEspace.tsx`, leurs bancs et `web/e2e/portail-rail-lateral.spec.ts`.
- `docs/decisions/D-341.md`, `docs/decisions/D-447.md`, `changelog.d/2026-11-07-defauts-rails-et-menus.md` et ce handoff.

## Validations exécutées

Voir le corps de la PR : Vitest ciblé, T2 rapide local.

## Problèmes ouverts

- Aucun constat de ces corrections en production ; aucun dossier de test mineur n'y existe.
- La copie cloud de `ui-ux-pro-max` et `scripts/design_system.py` (`D-456` §5) ne sont pas traités ici.
- L'organisation avec icônes demandée le même jour suit dans une autre PR.

## Prochaine action exacte

L'intégrateur prend la PR déclarée prête. Ensuite, recaler #1925 sur `main`.

## Interdits encore actifs

- Aucun drapeau posé ou retiré sans demande explicite du responsable.
- Pas d'identifiant de dossier ni de nom réel dans un fichier durable.
- Aucun chiffre sur une surface patient (`D-333`). Jamais le `main` local.
