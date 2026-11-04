# Handoff — 2026-11-04 — Portail patient : lot L2 « rails et menus », « Autres espaces » en quatre groupes, D-423 au registre

## Branche et état Git
- Branche `feat/l2-regroupement-menu-patient`, partie d'`origin/main@02279f1a` (#1851), worktree `.claude/worktrees/l2-regroupement-menu-patient`.
- Une PR, squash ; merge par la session (autorisation du responsable du 2026-11-03 pour toute la série L0-L5).

## Objectif
Lot L2 de l'audit `docs/claude/propositions/2026-11-01-portail-rails-et-menus/` (chapitre 11) : rendre « Autres espaces » en l'ancre « Mon parcours » et les quatre groupes de D-423 §2, sans drapeau (D-423 §7), et verser D-423 au registre.

## Décisions prises
- Rendu depuis la liste : `ENTREES_AUTRES_ESPACES` passe à l'ordre de D-423 §2 ; `groupesServis()` (sur `entreesServies()`) ne rend pas un groupe vide ; composant `NavAutresEspaces` dans `components/patient/autres-espaces/`. Plus aucune liste écrite à la main dans le hub.
- Les dix `Lien*` prennent `sondeSeule` (optionnel, rétrocompatible) : ils sondent et rapportent sans rendre de lien. Leurs sondes, routes et conditions ne changent pas.
- Ancre « Mon parcours » : un lien vers `/questionnaires`, `aria-current="page"` (D-423 §4, hub seul) ; ce n'est pas un titre, le H1 « Mon parcours » reste unique.
- Étiquettes de groupe en `h2` nommant leur `ul` (`aria-labelledby`), sans `uppercase` (nom accessible et lecture d'écran) ; deux colonnes dès `sm`.
- Liens de liste `min-h-11` (44 px en `rem`), libellé dans un `span`, aucun jeton `--rail-*`.
- Compteur « N questionnaires à compléter · ≈ N min » retiré, avec `parseDureeMinutes` (D-423 §6).
- « Mon accompagnement » : `<details open={protocoleDiffuse}>` (signal de `/api/portail/protocole` déjà lu par le hub) ; pas de second repli.
- `/informations` : « ← Mon parcours » ; `/conditions` inchangé.
- Q35 : « Ce que j’ai reçu » à l'apostrophe typographique, dans la liste et ses bancs.
- Commentaire du hub sur l'arbitrage du 2026-09-12 réduit à un renvoi à D-423 §5 (le texte accepté de §5 le porte déjà ; rien n'y est ajouté).
- §4 au-delà du hub (`/fiches`, `/ce-qui-compte`, `/comprehension` qui allument une entrée) : suppose le menu sur d'autres pages, laissé à L3, non inventé.
- D-423 inséré dans `docs/DECISIONS.md` entre D-424 et D-422 ; seule la ligne de statut change (« entré au registre avec L2 le 2026-11-04 »). Réservation `refs/tags/reserve/D-423` vérifiée (b5862ee3).
- PLAN §8, ligne « Autres espaces » : soldée en ligne par D-423 (lot L2), sans fiche Hnn neuve ; compteur des dettes soldées passé de 10 à 11.

## Fichiers modifiés
- Code : `entreesAutresEspaces.ts`, `NavAutresEspaces.tsx` (neuf), `questionnaires/page.tsx`, `informations/page.tsx`, les dix `Lien*`.
- Bancs : `entreesAutresEspaces.test.ts`, `questionnaires/autresEspaces.test.tsx`, `questionnaires/page.test.tsx`, `liensAutresEspaces.failclosed.test.tsx`, commentaire de `autresEspaces.cablage.test.tsx`.
- E2E : `portail-bilan`, `portail-dossier-deux-voix`, `portail-parcours`, `visual` adaptés ; `portail-autres-espaces.spec.ts` neuf ; `portail-transmission-compte-rendu` inchangé (budget de 80 Tab tenu).
- Doc : `docs/DECISIONS.md`, brouillon D-423 (en-tête), audit (chapitre 11, « Constat à l'écran de L2 »), PLAN §8, `changelog.d/2026-11-04-l2-regroupement-menu-patient.md`.

## Validations exécutées
- T1 (`npm run check`) vert après chaque série d'éditions, et en final.
- T2 (`npm run test:worktree -- --fast --keep-db`), premier passage : Vitest vert, E2E 307 passés et 2 rouges, `visual.spec.ts:441` sur les deux projets, par mon adaptation (un sélecteur `details:not([open])` dont les indices bougeaient). Corrigé en lisant `open` au moment du clic.
- T2 final (`--fast`) vert : Vitest 15 875 bancs, E2E 309 passés et 7 ignorés (Chromium et WebKit). `portail-autres-espaces` est vert sur Desktop Chromium et iPhone 13.
- Revue de PR : CodeRabbit sauté (dépôt sans revue automatique), PR-Agent rogné (« pruning diff », `DECISIONS.md` et PLAN hors budget), donc revue CodeRabbit demandée à la main (D-393 §4), après une limite de quota. Un nitpick, corrigé : le test des cibles de `portail-autres-espaces` attend une entrée sondée avant de mesurer. T1 et T2 rejoués verts (E2E 309 passés).
- Deux mutations jouées puis annulées, rouges : ordre dossier/échanges (7 bancs), `sondeSeule` ignoré (2 bancs).
- Constat à l'écran (dev local, navigateur intégré, même base, avant = `origin/main@02279f1a`, après = la branche) ; chiffres au chapitre 11 de l'audit. En bref, hauteur de la nav avant → après :
  - majeur : 239,2 → 349,0 px à 1 024 px ; 490,4 → 566,0 px à 390 px ;
  - mineur : 176,4 → 261,0 et 302,0 → 391,5 ;
  - clos : 239,2 → 349,0 et 427,6 → 479,5.
  Le bloc est plus haut partout : la prévision de Q37 ne se vérifie pas.

## Problèmes ouverts
- Hauteur : l'allègement des liens (44 px, sans écart) ne compense pas l'ancre et les étiquettes. À soumettre au responsable avec son constat de l'écran de L2, avant L2b et L3.
- Constat incident (frise, L2b) : sur un dossier à l'étape 5 courante, la page déborde à 390 px (494 px de large), avant comme après. Le `sr-only` « (étape actuelle) » de `PatientJourneyProgress` sort du conteneur `overflow-x-auto`.
- Dépli de « Mon accompagnement » non constaté à l'écran (aucun dossier de test avec protocole diffusé) ; épinglé au banc.
- Dette de clôture des routes de saisie : une session à part a préparé la question (refus `dossier_cloture` dans cinq routes, recommandé), en attente d'arbitrage ; `portail/valider` est à vérifier.

## Prochaine action exacte
Arrêt avant L2b et L3 : le responsable constate l'écran de L2 (trois dossiers, chiffres ci-dessus) et dit si la hauteur appelle une reprise.

## Interdits encore actifs
- Ne toucher ni `[token]/page.tsx` ni `/api/portail/session` jusqu'à L3 (Q21, EP-07).
- Aucun chiffre sur une surface patient (D-333) ; aucune règle de sonde nouvelle ; aucun jeton `--rail-*` côté patient.
- Patients fictifs seulement : Sophie Nicola, Jennifer Martin, Michel Dogné.
