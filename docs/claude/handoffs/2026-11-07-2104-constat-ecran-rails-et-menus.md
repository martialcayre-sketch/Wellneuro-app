# Handoff — 2026-11-07 — Constat à l'écran partiel de la série « rails et menus »

## Branche et état Git

`docs/constat-ecran-rails-et-menus`, worktree `.claude/worktrees/constat-rails-et-menus`, partie de `origin/main@c0ee6856`. Le `main` local n'est pas touché.

## Objectif

Consigner le constat à l'écran des quatre drapeaux de la série, posés en production le 2026-11-05.

## Décisions prises

- Le responsable a demandé à l'assistant de faire le constat lui-même, au lieu de remplir le bloc « Ce que j'ai vu ». Le texte le dit : l'observation est celle de l'assistant, dans le navigateur intégré, en largeur émulée.
- Le responsable a écarté le mineur (aucun dossier de test en production) et renoncé au clos : le constat reste partiel.
- PR déclarée prête pour l'intégrateur, choix du responsable.
- Le fragment de journal va sous H83, faute de fiche propre à la série.

## Fichiers modifiés

- `docs/FEATURE_FLAGS.md` : les quatre lignes.
- `docs/claude/PLAN_WELLNEURO.md` : les quatre lignes de la série dans la table de la file C.
- `docs/claude/propositions/2026-11-01-portail-rails-et-menus/README.md` : section du chapitre 11.
- `docs/claude/plan-journal/H83/2026-11-07-01-constat-ecran-rails-et-menus.md` et ce handoff.

## Validations exécutées

- Observation en production : un dossier de test majeur, lecture et mesure seulement ; drapeaux relus à `true`.
- T2 rapide local sur `origin/main@c0ee6856` : 355 passés, 21 ignorés, aucun échec. Démontré dans le code, sans valeur de constat en production.
- Rien sous `web/`.

## Problèmes ouverts

- Non constaté : mineur, clos, vrai questionnaire en cours, barre sans fiche remise, page imprimée, appareil à encoche.
- La frise défile dans sa colonne à 1 024 px avec le rail : consigné, non qualifié, à trancher par le responsable.
- Points déjà ouverts, non traités : le mineur clos perd l'encart « En cas d'urgence » 15/112 (Q36) ; la largeur de colonne change à l'arrivée d'une garde ; « Reprendre » ou « Commencer » selon le navigateur ; la copie cloud de `ui-ux-pro-max` hors du verdict et sans la garde ; `scripts/design_system.py` appelable en direct (`D-456` §5).

## Prochaine action exacte

L'intégrateur prend la PR déclarée prête. Une remarque de bot arrivée ensuite revient à la file, depuis ce handoff.

## Interdits encore actifs

- Aucun drapeau posé ou retiré sans demande explicite du responsable.
- Aucune correction de la série sans demande : ni `[token]/page.tsx`, ni `/api/portail/session`, ni `MobileBottomNav`, `NavBar`, `SidebarRail`, le menu « Mon espace » ou la barre basse.
- Pas d'identifiant de dossier ni d'heure de constat dans un fichier durable.
- Base de production en lecture seule ; jamais le `main` local.
