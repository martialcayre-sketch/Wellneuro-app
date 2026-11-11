# Handoff — 2026-11-11 — Refonte Lien / Empreinte, PRA-1 : shell et navigation praticien

## Branche et état du dépôt

- Branche `claude/refonte-lien-pra1`, créée depuis `origin/main` (`20911e7b`, après le merge de COM-0 #1989), dans le worktree `wt-refonte-pra1`.
- Un commit de lot. À déclarer « prête @<sha> » pour l'intégrateur après la CI et la revue de bot ; la session ne merge pas.
- Checkout principal non touché. Aucun fichier COM-0 ni patient modifié.

## Objectif

Lot PRA-1 du plan praticien (`docs/claude/propositions/2026-11-11-refonte-lien-etape2/plan-praticien.md`) : X02 praticien et l'activation de P01, P02, P35. Cadre : [[D-484]] (vues rapides retirées), [[D-485]] (déclaration unique), [[D-486]] (trois états du rail), [[D-487]] (quatre groupes), [[D-488]] (T-01 à T-05, T-07, T-10 à T-13). Reprises routées par la revue de COM-0 : entrée active `rail-surface` + `rail-accent`, marque `EmpreinteMarque tone="night"`, icônes à `TRAIT_ICONE`.

## Décisions prises

- **Déclaration unique** : `web/src/lib/navigation/destinationsPraticien.ts` (`DESTINATIONS_PRATICIEN`, `GROUPES_NAVIGATION`, `RACCOURCIS_TELEPHONE`, `DESTINATIONS_FEUILLE_PLUS`, `estActive`). Deux règles d'activation : `exacte` (Le Fil du jour, Patients) et `rubrique` (route et `route/…`), plus `prefixesActifs` (une fiche allume « Fiche-trajectoire » et « Fiches »). La règle « rubrique » exige le `/` : l'ancien `startsWith(href)` aurait allumé un préfixe voisin ; aucune route servie n'en dépendait (banc sur les 22 routes de `app/dashboard`).
- **Feuille « Plus »** = menu moins les deux destinations déjà sur la barre (Le Fil, Fiches), par groupes et sous leurs intertitres ; « Synthèses » reste propre au téléphone ([[D-324]] §5).
- **Escamotage** : clé `wn-rail-escamote-praticien`, valeur `true` seule ; supprimée à la réouverture. `wn-rail-expanded` inchangée. Le rail escamoté reste monté avec l'attribut `hidden` (pas de relecture des compteurs). Focus : « Masquer » → « Afficher la navigation » ; « Afficher » → « Masquer la navigation », au pied du rail rouvert. Le bouton de réouverture n'existe qu'au bureau (≥ 1 024 px) : sous cette largeur, tiroir et barre basse sont inchangés.
- **Rail réduit** : infobulle `aria-hidden` (le nom reste `aria-label`), visible au survol, au focus clavier, à l'appui du doigt (1,5 s après relâche) ; Échap la masque jusqu'au prochain mouvement du pointeur ou du focus. Commandes du pied rendues par `SidebarRail` (prop `commandes`), pour partager ce mécanisme.
- **Icônes** : « Masquer la navigation » `X`, « Afficher la navigation » `Menu` (correspondances de l'artefact).
- **Marque** : rail `EmpreinteMarque tone="night"` (compacte quand le rail est réduit) ; en-tête tablette `tone="light" compact` à la place des initiales « WN ».
- **Écarts à l'artefact assumés** : sa commande « Ouvrir le menu » devient « Afficher la navigation » (T-13 prime) ; pas de rappel de la destination courante près de la commande ([[D-484]] §1 : l'en-tête ne recopie aucune entrée) ; pas de lien « Aller au contenu » côté praticien (texte absent de [[D-488]] pour ce rôle, voir « Problèmes ouverts »).

## Fichiers modifiés

- Neufs : `web/src/lib/navigation/destinationsPraticien.ts` et son banc ; `web/src/components/NavBar.test.tsx`.
- `web/src/components/NavBar.tsx` : trois états, commande d'en-tête, vues rapides démontées, en-tête opaque, contours `control-border`, marque, `TRAIT_ICONE`.
- `web/src/components/ui/SidebarRail.tsx` et son banc : déclaration, quatre groupes, nom T-10, entrée active Lien, infobulles, pied de rail.
- `web/src/components/ui/MobileBottomNav.tsx` et son banc : déclaration, intertitres de la feuille, entrée active Lien, barre opaque `bg-rail`.
- Supprimés : `web/src/components/ui/VuesRapides.tsx` et `VuesRapides.test.tsx` ([[D-484]], montage compris).
- E2E praticien : `dashboard-praticien.spec.ts` (bloc « rail praticien escamotable », `:visible` sur la barre basse), `trajectoires.spec.ts`, `comptes-cabinet.spec.ts`, `correspondance-rayon.spec.ts` (rail désigné par son nom, plus par « La Spirale »).
- `changelog.d/2026-11-11-refonte-lien-pra1-shell-navigation.md`, ce handoff.

## Validations exécutées

- Bancs Vitest ciblés verts : déclaration (13), rail (25), barre et feuille (9), en-tête et trois états (9).
- **T1** (`cd web && npm run check`) vert : type-check, lint, `test:court14` (1718 passés, 21 ignorés), `test:changed` (56 passés), anti-secrets, crochets et contrôles de registre.
- **T2** (`npm run test:worktree -- --fast`) vert : Vitest 16 805 passés (50 ignorés) ; Playwright, build de production, Chromium et WebKit : 360 passés, 26 ignorés, 0 échec — dont le bloc « rail praticien escamotable » et `mode-consultation.spec.ts` (mode consultation intact).
- **Constat à l'écran local** (build de production sur la base éphémère de T2, patients fictifs Sophie Nicola, Jennifer Martin, Michel Dogné), captures Chromium : bureau 1 280 px déplié (groupes Travail et Bibliothèque, entrée active en `rail-surface` et barre champagne, marque Empreinte) ; réduit en icônes, infobulle « Atelier corpus » au survol ; escamoté à 1 024 × 576 (200 %) : « Afficher la navigation » dans l'en-tête, colonne de contenu pleine largeur, pas de défilement horizontal ; tiroir 900 px avec les quatre intertitres ; téléphone 390 px : « Fiches » actif sur une fiche, filet champagne, feuille « Plus » par groupes. Captures non versées.
- **Relecture `ui-ux-pro-max`** (lecture seule, `.claude/skills/ui-ux-pro-max/data/ux-guidelines.csv`, lignes du fichier) :
  - l.4 « Active State » : respectée, l'entrée courante se lit par fond, barre et graisse, et `aria-current` ;
  - l.29 « Focus States » et l.42 « Keyboard Navigation » : anneau `rail-focus-ring` sur chaque entrée et commande ; rail escamoté hors du parcours ; focus déplacé vers la commande visible ;
  - l.101 « Focus Not Obscured (Minimum) » : la commande de réouverture vit dans l'en-tête collant, jamais sous une superposition ;
  - l.113 « Text Reflow and Spacing » et l.17 « Overflow Hidden » : libellés passés à la ligne, rail déplié défilant au zoom ;
  - l.117 « Compact Label Overflow » : l'infobulle du rail réduit s'ouvre aussi au focus et au doigt, pas au seul survol ;
  - l.10 « Reduced Motion » : la transition de largeur est coupée sous `prefers-reduced-motion` ;
  - l.46 « Skip Links » : **non respectée**, voir « Problèmes ouverts » ([[D-456]] : la relecture ne prime pas sur [[D-488]]).

## Problèmes ouverts

- **Lien d'évitement praticien** (`ux-guidelines.csv` l.46, « Skip Links ») : le shell praticien n'en a pas ; « Aller au contenu » n'est inscrit à [[D-488]] que pour le patient. L'ajouter demande un micro-lot `DOC-n` (texte T-nn praticien) avant un lot PRA.
- **Éclair au chargement** : l'état mémorisé (réduit, escamoté) est lu après l'hydratation ; le rail paraît déplié une fraction de seconde. Comportement préexistant pour `wn-rail-expanded`, étendu à l'escamotage.
- **Références visuelles** (`e2e/visual.spec.ts`) : les captures praticien changent (rail, en-tête, barre basse) ; à régénérer par le workflow `visual-baselines` si la CI les signale.

## Prochaine action exacte

Commit, push, PR, CI (`node scripts/wn-attendre-ci.mjs <N>`), revue CodeRabbit (`@coderabbitai full review`), verdicts, puis « prête @<sha> ». Page de suivi praticien : PRA-1 à `prete` avec `pr` et `sha`.

## Interdits encore actifs

- Fichiers COM-0 gelés ; tout besoin commun passe par un `COM-n`, un seul ouvert à la fois, annoncé dans les deux pages de suivi.
- Aucun texte hors de [[D-488]] ; aucun drapeau posé ou retiré ; aucune modification clinique, de questionnaire, de scoring, de route, de garde ni de schéma ; aucune migration.
- Aucun fichier patient (`components/patient/**`, `app/portail/**`, `lib/portail/**`).
- Production en lecture seule, et seulement sur demande. Aucune identité ni identifiant de dossier réel au dépôt.
