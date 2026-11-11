# Handoff — 2026-11-11 — Refonte Lien / Empreinte, DOC-1 : lien d'évitement praticien (amendement de D-488)

## Branche et état du dépôt

- Branche `claude/refonte-lien-doc1`, créée depuis `origin/main` (`3b9e318f`) dans le worktree `wt-refonte-doc1`. Documentation seule.
- À déclarer « prête @<sha> » pour l'intégrateur après la CI et la revue. La session ne merge pas.
- Checkout principal non touché.

## Objectif

Inscrire le texte du lien d'évitement praticien. Le lot PRA-1 (#1997, `docs/claude/handoffs/2026-11-11-2030-refonte-lien-pra1.md`, problèmes ouverts) a constaté que le shell praticien n'a pas de lien d'évitement, et que « Aller au contenu » n'était inscrit que pour le patient ([[D-442]] §6). Le code viendra au lot PRA-2.

## Décisions prises

Le responsable a répondu par écrit le 2026-11-11, en retenant les trois options recommandées :
- texte « Aller au contenu » accepté mot pour mot, avec le comportement du patient ;
- inscription par amendement de [[D-488]], sans nouveau numéro ;
- application au lot PRA-2.

Identifiant pris : T-35, le premier libre après T-34.

## Fichiers modifiés

- `docs/decisions/D-488.md` : paragraphe d'amendement daté, avec le tableau T-35.
- `docs/claude/propositions/2026-11-11-refonte-lien-etape2/plan-praticien.md` : la fiche PRA-2 intègre le lien à son périmètre et à sa réception.
- `changelog.d/2026-11-11-refonte-lien-doc1-evitement-praticien.md`, ce handoff.

## Validations exécutées

- Renvois `[[D-442]]` et `[[D-488]]` présents dans `docs/decisions/`.
- Texte identique, au caractère près, à celui du portail patient (`components/patient/menu/textesMenu.ts:8`, `LIEN_EVITEMENT`).
- Aucun test de code : aucun code touché.

## Problèmes ouverts

- Le chemin cité (`components/NavBar.tsx:122`) est lu au commit `3b9e318f`. PRA-1 (#1997) réécrit ce fichier ; PRA-2 posera l'`id` sur le `<main>` qui en résulte.

## Prochaine action exacte

Après le merge : le lot PRA-2 applique T-35 (lien, `id="contenu"`, test de premier arrêt de tabulation) une fois PRA-1 mergé. La page de suivi praticien porte l'annonce.

## Interdits encore actifs

- Aucun texte hors de [[D-488]] ; aucun chiffre côté patient ([[D-333]]).
- Aucun drapeau posé ou retiré sans demande explicite ; aucune modification clinique, de route, de garde ni de schéma.
- Production en lecture seule, et seulement sur demande. Aucune identité ni aucun identifiant de dossier au dépôt.
