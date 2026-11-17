# Handoff — 2026-11-17 — Refonte Lien / Empreinte, PRA-5 PR 1 : impression sans rail ni menu (X06)

## Branche et état du dépôt

- Branche `claude/refonte-lien-pra5-pr1-impression`, partie de `origin/main` après le merge de DOC-15 (#2197, `3705c814`), avancée par `--ff-only` à `7535d6675`, dans le worktree `.claude/worktrees/refonte-lien-pra5-864fe3`.
- Un seul commit, poussé avec la PR. La session ne merge pas : l'intégrateur merge sur « prête @<sha> ».

## Objectif

PR 1 des trois PR de code de PRA-5 (D-481, complément DOC-15, Q13 a). Elle applique Q9 (a) : à l'impression d'une page `/dashboard/**`, le chrome s'efface et le contenu prend toute la largeur.

## Décisions prises

- Rien de neuf : la PR applique Q9 (a) telle qu'inscrite par DOC-15. Elle n'ajoute aucune règle d'impression globale, aucun bouton « Imprimer », aucun texte et aucun décor (COM-1 reporté).
- Chrome masqué :
  - l'en-tête, le rail, le tiroir de tablette et son voile (`NavBar`) ;
  - la barre basse, sa feuille « Plus » et son voile (`MobileBottomNav`) ;
  - les quatre commandes de repli de la fiche (« Masquer / Afficher les phases », « Masquer / Afficher le contexte »). « Masquer les phases » vit seule dans un pied bordé : c'est ce pied qui porte la classe.
- Les colonnes des phases et du contexte de la fiche sont du contenu : elles restent imprimées.
- Pleine largeur : la colonne de contenu perd à l'impression sa largeur bornée (1 600 px) et ses marges ; `main` perd la marge de la barre basse ; la racine perd `min-h-screen`.
- Le lien d'évitement portait déjà `print:hidden` (PRA-2a).
- Dans Tailwind 3.4.19, la variante `print` est émise après les variantes de largeur (`setupContextUtils.js`, `afterVariants`) : `print:hidden` l'emporte sur `lg:flex`, même sur une feuille en paysage.

## Fichiers modifiés

- `web/src/components/NavBar.tsx`, `web/src/components/ui/MobileBottomNav.tsx`, `web/src/components/FichePatientPanel.tsx` (classes seules).
- Bancs : `web/src/components/NavBar.test.tsx`, `web/src/components/FichePatientPanel.test.tsx`, `web/e2e/dashboard-praticien.spec.ts` (deux tests, sur les deux projets).
- `changelog.d/2026-11-17-refonte-lien-pra5-impression.md`, et ce handoff.

## Validations exécutées

- Vitest ciblé : NavBar, fiche et barre basse, 212 tests passent.
- T1 rapide et T1 complet (`npm run check`) : 0 ; anti-secrets sur l'index : OK.
- T2 (`npm run test:worktree -- --fast`) : 0. Vitest : 18 078 tests passent, 54 ignorés. E2E : 416 passent, 34 ignorés, dont les quatre tests d'impression neufs (`/dashboard/synthese` et `/dashboard/documents`, en Desktop Chromium à 1 280 px et en iPhone 13 WebKit).

## Problèmes ouverts

- Le geste « Imprimer cet aperçu » (P52) appelle `contentWindow.print()` sur l'iframe : le document y garde sa propre composition, et l'iframe n'hérite pas des classes de la page. L'E2E ne peut pas ouvrir la boîte d'impression du système ; il n'y a donc pas de contrôle automatique du rendu imprimé de l'iframe, seulement de la page.

## Prochaine action exacte

Après le merge de la PR 1 par l'intégrateur, ouvrir la PR 2 (copilote P34 : h1, panneau de contexte repliable par T-15, état de session, escamotage d'office de 1 024 à 1 279 px, rien de critique dans le panneau replié), dans une branche neuve sur `origin/main`.

## Interdits encore actifs

- Ni route, ni garde, ni drapeau, ni schéma, ni règle clinique ; aucun score ni export ajouté.
- Aucun texte d'interface hors D-488 dans le code ; identités de fixture seulement.
- La session ne merge pas. Une PR à la fois, dans l'ordre PR 1, PR 2, PR 3 ; la PR 3 reçoit en plus la revue `wn-reviewer`.
