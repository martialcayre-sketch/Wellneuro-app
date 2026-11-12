# Handoff — 2026-11-12 — Refonte Lien / Empreinte, PRA-2b : Fil, fiches, Comptes, Correspondance, Confiance & droits, Paramètres, « Réessayer »

## Branche et état du dépôt

- Branche `claude/jolly-noyce-53e3bf`, dans le worktree `jolly-noyce-53e3bf`. Elle part de `origin/main` à `7b322374`. Elle a été avancée en `--ff-only` deux fois avant le premier commit :
  - à `36f3bee2` (#2036, corpus) ;
  - à `a84e5a69` (#2037, docs, [[D-503]]).
  Aucun fichier n'est commun avec le lot.
- Un commit de lot. Il sera déclaré « prête @<sha> » pour l'intégrateur après la CI et la revue de bot. La session ne merge pas.
- Préalable vérifié : PRA-2a (#2033) et DOC-6 (#2034) sont mergées.
- Le checkout principal n'est pas touché. Aucun fichier COM-0 n'est modifié. Aucun fichier patient n'est modifié : aucun fichier touché n'est importé par `app/portail`, `components/patient`, `components/patient-companion` ni `lib/portail` (vérifié par recherche).

## Objectif

Second temps du lot PRA-2 « Écrans de travail transverses » du plan praticien (`docs/claude/propositions/2026-11-11-refonte-lien-etape2/plan-praticien.md`, §3) :

- P01 Fil du jour, P35 fiches-trajectoires, P36 Comptes du cabinet, P53 Correspondance, P54–P56 Confiance & droits, P57 Paramètres ;
- T-17 « Réessayer » sous les deux échecs de PRA-2a.

Les bases sont le prototype validé par écrit (https://claude.ai/artifact/K2F8X4jSeemNSSi3QhNMbP, Q1 a à Q11 a, avec Q4 b, Q9 b et Q10 b), [[D-481]] (complément DOC-6) et [[D-488]] (amendement DOC-6, T-17 à T-19).

## Décisions prises

- **Titres** : un `h1` par page (Q2) et des `h2` de zone. Cela vaut pour les panneaux du rail du Fil, par `PanneauRail`, ainsi que pour « Aujourd'hui » et les tables des Comptes. Dans la lecture des questionnaires, le titre d'une réponse passe de `h4` à `h3`, sous le `Dialog.Title`, qui est un `h2`. Le spec `correspondance-rayon` suit le niveau 1.
- **Icônes** : le trait passe à `TRAIT_ICONE` sur les icônes existantes. Aucune icône n'est ajoutée, sauf `RefreshCw` (« Réessayer ») et `ArrowLeft` (« Retour à la file »). Les chevrons de ligne du prototype (Fiches, Correspondance) ne sont pas posés : le README du prototype dit « aucune icône ajoutée ».
- **Fil.**
  - L'action principale est en plein seulement sur la carte « Maintenant ». Ailleurs, c'est un lien pétrole souligné. « Écarter » devient sans bordure.
  - La cible reste `carte.href`. Un banc la vérifie pour chacun des quinze types, sur une liste `Record<TypeCarteFil, true>` : un type ajouté sans banc ne compile pas.
- **T-18** : le badge apparaît sur chaque carte quand la lecture de `/api/praticien/meteo-adhesion` échoue (panne, `!ok` ou `unavailable`).
  - La route lit toute la patientèle en une fois. Il n'existe donc pas d'échec par patient : un patient « indéterminé » est une abstention, pas un échec, et il ne porte pas le badge.
  - Le panneau « Météo d'adhésion » garde son propre état.
- **Confiance & droits (Q10 b)**, sans route neuve.
  - `TrustPanel` lit `?depot=` par `useSearchParams` et construit les liens par `usePathname`.
  - La file et le détail se montrent ou se cachent par classes : au bureau (`lg`), les deux sont visibles ; au-dessous, la file seule, ou le détail seul si un dépôt est choisi.
  - Un `matchMedia` (`useBureau`) sert à deux choses seulement : `aria-current` sur le dépôt montré d'office, et le déplacement du focus. Hors bureau, ouvrir un dépôt pose le focus sur « Retour à la file ». Revenir, par ce lien ou par le précédent du navigateur, le rend à la ligne quittée.
  - Le détail porte `key={s.id}`, pour que l'erreur locale d'un avis ne suive pas un autre dépôt.
  - **Brouillon d'avis** : `ValidationEffetIndesirable` reçoit `brouillon` et `onBrouillon`, tous deux optionnels, et garde un état local s'ils manquent. Ses bancs existants passent donc sans changement. `TrustPanel` tient les brouillons par dépôt.
  - L'avis garde ses textes. Seul l'habillage change : filet `control-border`, et bandeau `voice-practitioner` en tête qui porte « Avis en vigueur… » ou « En attente de votre avis. ». Le contenu est déplacé, aucun texte n'est réécrit. « Avis corrigés (N) » reste un `<details>`, qui est l'historique : l'avis lui-même n'est jamais replié.
  - La sélection du statut passe à 44 px.
- **T-17** : « Réessayer » est un `Button` `outline` de 44 px. Il relit le seul tableau, avec la page, la recherche et le tri de l'écran, ou la seule liste de l'Agenda. Pendant la relecture, il disparaît : le focus passe au `h2` de la zone (`tabIndex={-1}`). C'est le constat de la relecture `ui-ux-pro-max`.
- Correspondance : « Ouvrir un dossier » devient l'action pleine, et les deux zones sont côte à côte au bureau. Comptes et Paramètres : les chiffres et les versions sont en `font-mono`, et les Paramètres passent en deux colonnes au bureau.

## Fichiers modifiés

- Pages : `web/src/app/dashboard/{page,trajectoires/page,cabinet/page,correspondance/page,droits/page,parametres/page}.tsx`.
- Fil :
  - `web/src/components/fil/FilDuJour.tsx` et son banc ;
  - `PanneauRail.tsx` ;
  - `InboxQuestionnaires.tsx`.
- Confiance & droits :
  - `web/src/components/TrustPanel.tsx` et son banc ;
  - `ValidationEffetIndesirable.tsx`.
- Comptes : `web/src/components/cabinet/ComptesCabinetPanel.tsx`.
- T-17 :
  - `web/src/components/dossier/RayonPatientsPanel.tsx` et son banc ;
  - `web/src/components/agenda/AgendaPraticien.tsx` et son banc.
- `web/e2e/correspondance-rayon.spec.ts`.
- `changelog.d/2026-11-12-refonte-lien-pra2b-ecrans-transverses.md`, et ce handoff.

## Validations exécutées

- **Vitest ciblé** : Fil (94), Confiance & droits et validation (22), Patients (60), Agenda. Tout est vert.
- **T1** (`npm run check:rapide`) : vert, 16 étapes vertes et 3 sautées. **T1 complet** (`npm run check`) : vert sur l'état final du code.
- **T2** (`npm run test:worktree -- --fast --keep-db`) : exit 0.
  - Vitest : 17 100 passés, 50 ignorés.
  - Playwright sur le build de production : 368 passés, 34 ignorés, aucun échec.
  - Le run est parti de `7b322374` avec le diff du lot. L'avance à `36f3bee2` (#2036, corpus seul) est arrivée pendant le run.
  - Le déplacement du focus sous « Réessayer » a été ajouté après T2. Il est couvert par Vitest, par T1 complet et par le contrôle à l'écran, fait sur un build reconstruit.
- **Contrôle à l'écran** : build de production reconstruit sur l'état final, servi sur la base éphémère de T2. La base contient les trois patients fictifs et cinq dépôts de test, insérés à la main dans cette base jetable puis détruite. Le script Chromium et les captures restent dans le bloc-notes et ne sont pas versés.
  - Largeurs : 1 440, 1 280, 1 100, 834 et 390 px. Pages : Fil, Fiche-trajectoire, Comptes, Correspondance, Confiance & droits, Paramètres, Patients et Agenda.
  - À chaque largeur et sur chaque page :
    - un seul `h1` ;
    - un `#contenu` unique ;
    - le premier Tab rend « Aller au contenu » ;
    - aucun débordement de côté ;
    - aucune alerte hors échec provoqué.
  - Confiance & droits :
    - au bureau, file et détail côte à côte, le premier dépôt montré d'office ;
    - à 834 et 390 px, ouvrir un dépôt cache la file, montre « Retour à la file » et y pose le focus ;
    - le retour rend la file, avec le focus sur la ligne quittée, et le précédent du navigateur fonctionne ;
    - l'avis n'est sous aucun `<details>`.
  - Bloc d'avis : la base de test n'a pas de programme visé, et le bloc ne s'affiche que sur un dépôt rattaché. La validation a donc été injectée dans la réponse de la route, côté navigateur seulement. Le bandeau et le filet ont été vus à 1 440 et 390 px, sans débordement.
  - Échecs provoqués (requêtes interrompues) :
    - Patients : le message existant et « Réessayer » ;
    - Agenda : « La liste des rendez-vous est momentanément indisponible. » et « Réessayer » ;
    - Fil : T-18 sur chaque carte, et le panneau Météo qui dit son propre échec.
- **Relecture `ui-ux-pro-max`** (`ux-guidelines.csv`) :
  - « Deep Linking » : conforme, avec `?depot=` ;
  - « Back Button » : conforme, l'historique est poussé et le précédent du navigateur revient au détail puis à la file ;
  - « Error Recovery » et « Error Messages » : conformes, avec T-17 et `role="alert"` ;
  - « Target Size » : conforme, à 44 px ou plus ;
  - **constat corrigé** : après « Réessayer », le focus retombait sur la page. Il passe désormais au titre de la zone.

## Problèmes ouverts

- **Confiance & droits au téléphone** : la zone « Conditions d'utilisation » reste sous le détail quand un dépôt est ouvert. Le prototype ne montrait que le détail. Le h1 et l'introduction restent aussi, pour garder un `h1` par page.
- **Badge T-18** : il apparaît sur toutes les cartes à la fois quand la Météo échoue. C'est la conséquence d'une lecture globale de la Météo, comme décrit plus haut.
- **Restes du plan** : le spec `mode-consultation-sans-chiffre`, qui clique avant l'hydratation, et la vérification d'ensemble restent à PRA-6. Le décor `login-calm` attend COM-1 (Q8 a).

## Prochaine action exacte

1. Ouvrir la PR avec `--body-file`. Lancer `node scripts/wn-attendre-ci.mjs <N>` en fond et vérifier `head=`.
2. Lancer `node scripts/wn-revue-pr-agent.mjs <N>`, qui doit rendre 0, sinon `wn-reviewer`. Donner un verdict à chaque commentaire : synthèse, corps et commentaires en ligne.
3. Si `visual.spec.ts` rougit (cartes du Fil, rail), lancer le workflow `visual-baselines` puis relire chaque image.
4. Poster « prête @<sha> », puis passer PRA-2 à `prete` (pr, sha) sur la page de suivi praticien, avec une entrée de journal.

## Interdits encore actifs

- Les fichiers COM-0 sont gelés. Tout besoin commun passe par un `COM-n`.
- Aucun texte hors de [[D-488]]. Les libellés de l'avis, des statuts de dépôt, du consentement et des droits restent ceux du code.
- Aucun drapeau, aucune modification clinique, de route, de garde ou de schéma, aucune migration.
- Aucun fichier patient (`components/patient/**`, `app/portail/**`, `lib/portail/**`).
- La session ne merge pas : l'intégrateur merge.
