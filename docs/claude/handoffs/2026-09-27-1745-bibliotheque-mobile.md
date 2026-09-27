# Handoff — 2026-09-27 — Bibliothèque : plus de défilement horizontal sur téléphone

## 1. Branche et état Git

`wn-bibliotheque-assignations-mobile`, worktree
`.claude/worktrees/deploy-anti-recul-lot1`, partie de `origin/main` à
`18ba1a78` (#1238). À merger après #1239, un merge à la fois.

## 2. Objectif

La petite PR décidée par le responsable le 2026-09-27 : corriger le débordement
horizontal de la page Bibliothèque sur iPhone, révélé par l'E2E du rayon
« Fiches conseils ».

## 3. Décisions prises

- **Deux causes, pas une.**
  - La première était attribuée au tableau des assignations. Elle est en
    réalité dans `PacksPanel` : la ligne « Vue catégories » du formulaire de
    création ne passait pas à la ligne.
  - Le tableau est déjà dans un conteneur `overflow-x-auto` : son défilement
    est voulu et ne fait pas défiler la page.
  - La seconde cause n'est apparue qu'avec le rayon par défaut : la grille du
    catalogue de `BibliothequePanel`, sans colonnes sous `xl`.
- **Les correctifs sont d'une ligne chacun** : `flex-wrap` et `max-w-full` d'un
  côté, `grid-cols-1` de l'autre. Aucune refonte.
- **Le banc tient la page entière** et ignore les éléments placés dans un
  conteneur à défilement horizontal voulu. Le spec du rayon Fiches conseils
  garde sa vérification de zone.

## 4. Fichiers modifiés

- `web/src/components/PacksPanel.tsx`, `web/src/components/BibliothequePanel.tsx`.
- `web/e2e/bibliotheque-mobile.spec.ts` (nouveau),
  `web/e2e/bibliotheque-fiches-conseils.spec.ts` (commentaire).
- `changelog.d/2026-09-27-bibliotheque-mobile.md`, ce handoff.

## 5. Validations exécutées

- Le banc mobile est vert avec les deux correctifs, sur iPhone 13 et Desktop.
- Il rougit sans l'un **ou** l'autre, et nomme chaque fois les éléments
  fautifs (mutation par la version de `main` de chaque fichier).
- T1 et T2 : voir la PR.

## 6. Problèmes ouverts

- Aucun sur ce lot. Les autres pages du tableau de bord n'ont pas été
  mesurées ; seule la Bibliothèque l'est.

## 7. Prochaine action exacte

Merge après #1239 et le constat du déploiement. Ensuite, produire et déposer
les sept fiches choisissables.

## 8. Interdits encore actifs

- « Un merge à la fois » (D-248).
- Aucun texte de Fiche MY au dépôt, en PR ou au journal.
