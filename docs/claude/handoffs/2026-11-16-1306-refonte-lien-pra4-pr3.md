# Handoff — 2026-11-16 — Refonte Lien / Empreinte, PRA-4 PR 3 : compléments, fiches conseils, connaissances (P44 à P46)

## Branche et état du dépôt

- Branche `claude/refonte-lien-pra4-pr3`, créée depuis `origin/main@6a32a9d5` dans le worktree `.claude/worktrees/refonte-lien-pra4-pr3`.
- Avancée deux fois par `--ff-only` avant tout commit :
  - à `e6412209`, docs du dossier du besoin 9, aucun fichier de `web/` ;
  - puis à `e9da2b71` (#2168, #2169), aucun fichier du diff.
- La session ne merge pas : l'intégrateur merge sur « prête @<sha> » (D-373, D-454).

## Objectif

Poser dans le code, sur P44 à P46, les réponses (a) Q1 (titres), Q5 (cibles), Q10 (couleurs) et Q12 (surtitre) du complément DOC-13 de D-481. Seul texte neuf : T-73, mot pour mot de D-488.

## Décisions prises

- Q1, Compléments (P44) : « Fiches » passe de h3 à h2 sous le h1 d'`EnTeteRayon`.
  - Le tiroir était déjà en cascade : `Dialog.Title` de `PanneauSuperpose` en h2, nom commercial en h3, sections en h4.
  - `FicheComplementPanel.tsx` n'est donc pas touché.
- Q1, Fiches conseils (P45) : l'en-tête du panneau passe par `EnTeteRayon`, au niveau des autres rayons. Surtitre, titre et phrase sont repris mot pour mot.
  - Les deux points ouverts sont tranchés sur le prototype (planche « Rayons »).
  - L'en-tête reste au-dessus de la relecture, comme pour les fiches d'usage dans la PR 2. La page garde son h1 ; le titre de la relecture passe en h2 (« Relecture d'une fiche » au chargement, « Relecture — … » ensuite) et les rubriques 1 à 6 en h3.
  - Le retour du focus au titre du rayon est gardé. `EnTeteRayon` reçoit deux props facultatives, `idTitre` et `titreRef`. Avec `titreRef`, le h1 prend `tabIndex={-1}` et l'anneau `focus-visible`. Les autres rayons n'en passent pas : leur rendu est inchangé.
  - L'en-tête est rendu par le panneau (client) et non par la page : la page, composant serveur, ne pourrait pas transmettre de ref. La région « Fiches conseils » (`aria-labelledby` du h1) englobe l'en-tête, la liste et la relecture ; l'E2E la vise.
  - Le prototype pose un h2 « Fiches » au-dessus de la liste. Il n'est pas repris : ce serait un texte visible absent de D-488. La liste suit directement le h1, sans saut.
- Q1, Connaissances (P46) : `RechercheCorpusRayonPanel` n'a toujours aucun titre ; rien n'en ajoute.
- Q5 :
  - Les champs nus en `focus:ring-primary` passent par `ui/Input` (recherche et intention des compléments, recherche de Connaissances) et `ui/Select` (tri des compléments, rayon de Connaissances).
  - `ui/Select` reçoit `CLASSE_SELECT` (44 px, anneau `focus-ring`), même choix que la PR 1 : le composant sert d'autres écrans et n'est pas changé.
  - Les chips de facettes et les cartes de fiche passent à `min-h-11` avec l'anneau ; l'écart entre chips passe de 6 à 8 px.
  - Le motif de retrait (`textarea`) prend l'anneau `focus-visible` du socle.
  - La case « Je déclare avoir relu… » est déjà à `min-h-11` : non touchée. Pagination et boutons passaient déjà par `ui/Button`.
- Q10 : la chip active passe de `border-indigo-600 bg-indigo-600/10` à `border-primary bg-primary/10`, choix de la PR 1.
- Q12 : T-73 « Bibliothèque · claims validés du corpus » remplace le surtitre de Connaissances. Aucun banc ni E2E ne citait l'ancien ; `rayons.test.tsx` vérifie désormais le nouveau et l'absence de l'ancien.
- Validation et retrait d'une fiche conseil : aucune ligne de logique touchée. Confirmations, textes, déclaration de relecture et motif obligatoire restent tels quels.

## Fichiers modifiés

- `web/src/app/dashboard/bibliotheque/EnTeteRayon.tsx` (props facultatives `idTitre`, `titreRef`), `connaissances/page.tsx` (T-73), `fiches-conseils/page.tsx` (commentaire).
- `web/src/components/fiches-assiette/RayonFichesConseilsPanel.tsx` (en-tête commun, relecture sous l'en-tête), `RelectureFicheAssiette.tsx` (titres décalés d'un niveau, anneau du motif).
- `web/src/components/complements/RayonComplementsPanel.tsx`, `web/src/components/corpus/RechercheCorpusRayonPanel.tsx`.
- Tests : `rayons.test.tsx` (T-73), `RayonComplementsPanel.test.tsx` (h2, 44 px, anneau, jetons), `RayonFichesConseilsPanel.test.tsx` (h1 gardé pendant la relecture, h2 dessous), `RelectureFicheAssiette.test.tsx` (h2, rubriques en h3, aucun h4).
- `changelog.d/2026-11-16-refonte-lien-pra4-pr3.md`, ce handoff.

## Validations exécutées

- Vitest ciblé : 10 fichiers, 140 tests, vert ; les trois bancs neufs y passent.
- T1 (`npm run check:rapide`) : vert, 16 étapes, après `npm ci` et `prisma generate` dans le worktree neuf.
- T2 (`npm run test:worktree -- --fast`) : vert au second passage, à `e6412209` plus le diff, en 12 min 11 s, parti à 13 h 12.
  - Machine calme : aucun autre run `wn-test-worktree`, charge 7.
  - Contenu : Vitest entier (17 989 tests) ; 412 E2E réussis, 34 sautés (Chromium et WebKit).
  - Le premier passage, parti à 13 h 07, s'est arrêté sur un seul rouge, hors du diff : `export-dossier/masquage.test.ts`, banc de chronométrage, 1 631 ms pour une borne de 1 500 ms. La charge est montée à 23 pendant la passe Vitest. Rejoué seul aussitôt : vert (170 tests). Les E2E n'avaient pas tourné.
  - L'avance à `e9da2b71` (#2168 : un banc de garde du portail ; #2169 : outillage F05) ne touche aucun fichier du diff.
- T1 complet (`npm run check`) : vert au second passage, à `e9da2b71` plus le diff.
  - Le premier passage a un seul rouge, hors du diff : `scripts/wn-codex-avis.test.mjs`, « bout en bout : avis conforme = 0 ». Un dossier `wn-codex-p0-test-*` est apparu dans le répertoire temporaire pendant le banc, créé par un autre banc lancé en parallèle.
  - Rejoué seul : 30 sur 30.
  - Le répertoire temporaire de la machine garde des centaines de ces dossiers non nettoyés : à signaler, hors de ce lot.
- Relecture `ui-ux-pro-max` (domaine `ux`) sur le diff :
  - « Heading Hierarchy » : conforme ;
  - « Touch Target Size » : conforme ;
  - « Touch Spacing » : conforme, chips à 8 px ;
  - « Focus States » : conforme.
- La session n'a pas fait de contrôle à l'écran à 390, 834, 1 280 et 1 440 px : la connexion praticien passe par OAuth. Les E2E de T2 couvrent les rayons (dont `bibliotheque-fiches-conseils` et `bibliotheque-mobile`).

## Problèmes ouverts

- Le h1 de Fiches conseils passe de `text-2xl` à `text-3xl`, comme les autres rayons ; l'en-tête reste visible au-dessus de la relecture. C'est l'effet voulu de Q1 (a), à constater à l'écran.
- Le prototype note des libellés de champs à 15 px sur Connaissances (`text-xs` aujourd'hui). Non repris : c'est du décor, après COM-1.
- Hors PRA-4 (inchangé) : `chargerBibliotheque` avale l'échec ; `bibliotheque/options` sans entrée ; décor après COM-1 ; libellé accessible du sélecteur de statut des assignations ; titre dynamique de la fiche d'analyte (handoffs des PR 1 et 2).

## Prochaine action exacte

1. CI à 0 (`node scripts/wn-attendre-ci.mjs <N>` en tâche de fond). PR-Agent prouvé sur la tête (`node scripts/wn-revue-pr-agent.mjs <N>` → 0), avec un verdict par remarque ; si le script rend 1 (« pruning diff »), recours à `wn-reviewer` (D-448). Puis « prête @<sha> » sur la PR et dans la boîte `integrateur`, et mise à jour de la ligne PRA-4 de la page de suivi praticien.
2. Après le merge : PRA-4 PR 4 (P47-P50, `wn-reviewer` en plus), dans un worktree neuf sur `origin/main`, reçue séparément.

## Interdits encore actifs

- Aucun texte d'interface hors de D-488 ; aucun décor avant COM-1.
- Fiches conseils : validation et retrait gardent leur logique, leurs confirmations et leurs textes.
- Ni route, ni garde serveur, ni drapeau, ni schéma, ni migration modifiés ; rien de clinique ; production en lecture seule.
- Jamais de merge par la session ; toute écriture ArtifactData se fait avec `if_version`.
