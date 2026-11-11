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

Identifiant : T-16, à la suite des textes praticien (01-15), selon la règle des familles du `README.md` de l'étape 2, qui est mis à jour. Il a d'abord été pris T-35, puis renuméroté sur la revue `wn-reviewer` ; le texte accepté est inchangé.

## Fichiers modifiés

- `docs/decisions/D-488.md` : paragraphe d'amendement daté, avec le tableau T-16 ; la cible de la page de connexion est précisée (revue CodeRabbit).
- `docs/claude/propositions/2026-11-11-refonte-lien-etape2/plan-praticien.md` : la fiche PRA-2 intègre le lien à son périmètre et à sa réception.
- `changelog.d/2026-11-11-refonte-lien-doc1-evitement-praticien.md`, ce handoff.

## Validations exécutées

- Renvois `[[D-442]]` et `[[D-488]]` présents dans `docs/decisions/`.
- Texte identique, au caractère près, à celui du portail patient (`components/patient/menu/textesMenu.ts:8`, `LIEN_EVITEMENT`).
- Aucun test de code : aucun code touché.

## Problèmes ouverts

- Le chemin cité (`components/NavBar.tsx:122`) est lu au commit `3b9e318f`. PRA-1 (#1997) réécrit ce fichier ; PRA-2 posera l'`id` sur le `<main>` qui en résulte.
- Questions de la revue `wn-reviewer`, non tranchées ici :
  - `app/not-found.tsx` et `app/global-error.tsx` sont communes aux deux rôles et gelées par COM-0 ; `global-error.tsx` a un `<main>` sans `id`. Il reste à décider si « chaque page du portail praticien » les inclut. Le cas échéant, cela passe par un COM-n.
  - Le lien est posé dans `NavBar`, donc il couvre les pages de fiche (PRA-3) dès PRA-2. Si PRA-3a passe avant PRA-2, comme le recommande l'ordre du plan, ces pages restent sans lien jusqu'à PRA-2.

## Prochaine action exacte

Après le merge : le lot PRA-2 applique T-16 (lien, `id="contenu"` sur le `<main>` de `NavBar` et sur un `<main>` créé dans `app/login/page.tsx`, tests : premier arrêt de tabulation, y compris sur `/login` ; caché hors focus et visible au focus ; `#contenu` unique ; texte égal à celui du patient) une fois PRA-1 mergé. La page de suivi praticien porte l'annonce.

## Interdits encore actifs

- Aucun texte hors de [[D-488]] ; aucun chiffre côté patient ([[D-333]]).
- Aucun drapeau posé ou retiré sans demande explicite ; aucune modification clinique, de route, de garde ni de schéma.
- Production en lecture seule, et seulement sur demande. Aucune identité ni aucun identifiant de dossier au dépôt.
