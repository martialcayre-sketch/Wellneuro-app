# Handoff — 2026-11-21 — Refonte Lien / Empreinte, PAT-7i : boutons et rayons (forme transverse)

## Branche et état du dépôt

- Branche `claude/refonte-lien-pat7i-boutons-rayons`, dans le worktree
  `.claude/worktrees/refonte-lien-pat7-forme-transverse-a1671e`.
- Partie de `origin/main` `288e1b24`, avancée par `--ff-only` jusqu'à `d1238af4` (#2299). Aucun
  commit propre avant celui du lot.
- Un commit, une PR. La session ne merge pas : « prête @<sha> » à l'intégrateur.

## Objectif

Premier lot de code de la forme transverse du portail patient. La comparaison aux prototypes
(#2249, §3.2) l'avait laissée à décider en bloc. La session a préparé la décision :

- inventaire, sept familles F1 à F7, une question groupée `20261121-1633-d` dans la liste commune ;
- avis de Codex à l'aveugle, qui retient a partout ;
- planche de décision, artefact privé `7G7gXEt9SbMrTcr7KNxef1`.

Le responsable a répondu en session le 2026-11-21 : « F1a à F7a ». PAT-7i applique F1 (boutons)
et F2 (rayons).

## Décisions prises

- **F1 a — boutons** (`PatientButton.tsx`) :
  - `ghost` prend la forme secondaire : `bg-surface`, `border-control-border`, survol inchangé ;
  - nouvelle variante `link` (fantôme, souligné), posée seulement aux emplacements montrés par les
    planches : les trois « Annuler » de U40 (`SignalerProbleme.tsx`) et « Sauvegarder le brouillon »
    de U11 et U12 (`GenericQuestionnaire.tsx`, `PlaintesForm.tsx`) ;
  - `neutral` passe en `control-border`, `font-medium`, rayon 8 px. 8 px n'est pas un jeton : il
    s'écrit `rounded-[0.5rem]`, que la garde du design system n'interdit pas ;
  - les deux boutons écrits à la main de Mon équilibre (`MonEquilibreAccueil.tsx:176, :183`)
    suivent la même forme.
- **F2 a — rayons** :
  - primaire et secondaire passent de 12 à 18 px (`rounded-lg`) ;
  - tous les `rounded-xl` (12 px) du portail patient passent à `rounded` (14 px), dans 15 fichiers.
  - Deux exceptions restent à 12 px :
    - `CaptureRepas.tsx` : média photo et vidéo, hors de l'échelle ;
    - `ValidationJaHarness.tsx` : harnais de développement, non servi.
- **Rayons à 18 px encore à faire, avec leurs familles** :
  - champs et messages : PAT-7j ;
  - accordéons et tuiles de U07 : PAT-7k.
- **Document versé** : `docs/claude/propositions/2026-11-11-refonte-lien-etape2/pat7-forme-transverse.md`,
  qui porte la décision et l'inventaire complet avec fichier:ligne.
- Aucune décision `D-xxx` et aucun DOC-n : aucun texte ne change, et aucune décision existante n'est
  amendée. La ligne `20261121-1633-d` est `repondue` ; elle passera à `close` au merge du dernier lot
  (PAT-7m).

## Fichiers modifiés

- `web/src/components/patient/ui/PatientButton.tsx` ;
- les emplacements fantôme : `trust/SignalerProbleme.tsx`, `GenericQuestionnaire.tsx`,
  `PlaintesForm.tsx` ;
- les rayons :
  - `app/portail/[token]/page.tsx`, `questionnaires/[idAssignation]/page.tsx` ;
  - `patient-companion/` : `DetailDuProtocole`, `DossierDeuxVoixView`, `ProtocolCheckinTrend` ;
  - `patient-food-observation/FoodObservationJourney.tsx` ;
  - `patient/` : `AvisLectureDatee`, `MonEquilibreAccueil`, `ReadingComfortControl` ;
  - `agenda-alimentaire/` : `AgendaAlimentaireJournal`, `LigneDePrises`, `SaisieJourneeForm` ;
  - `agenda-sommeil/` : `AgendaSommeilJournal`, `SaisieNuitForm`, `SelecteurHeure` ;
- `changelog.d/2026-11-21-refonte-lien-pat7i-boutons-rayons.md`, le document versé, ce handoff.

Aucun fichier de COM-0, aucun composant praticien, rien dans `components/ui/`.

## Validations exécutées

- **T1** :
  - `check:rapide` : 0 ;
  - `npm run check` : 0, avant l'avance sur #2299 ;
  - rejeu sur la tête avancée : voir la PR.
- **T2** `npm run test:worktree -- --fast` : 0, dans un environnement propre (Vitest 1 074 fichiers,
  18 424 tests ; E2E 439 verts, Chromium et WebKit).
  - Un premier T2 avait rougi : 6 fichiers de routes API, sans rapport avec le lot.
  - Le script de constat avait laissé exportés les drapeaux `WN_*` et le `DATABASE_URL` de la base
    locale. Le rejeu propre est vert.
- **Constat à l'écran, en local** : build de production, base du worktree avec seed (fixtures
  seules), specs `pat7-proto-a` et `pat7-proto-b` du dossier partagé (copiés le temps de la passe,
  puis retirés), 24 tests verts. Écrans U10, U11, U12, U15, U16, U17, U21, U25, U27, U37 et U39, à
  1 280 px Chromium et à 390 px iPhone 13.
  - Vu sur U16 : primaire à 18 px, tuiles à 14 px, neutre bordé à 8 px.
  - U11 et U12 restent au portillon « Avant de commencer » : le fantôme y est vérifié par le code et
    les tests, pas à l'écran.
  - U15 : capture « échec » du spec (fixture), non exploitable.

## Problèmes ouverts

- **Lots suivants, après le merge de celui-ci, depuis `origin/main`** :
  - PAT-7j : F3 (messages, échecs encadrés, succès vert, consigne de U17) et F4 (champs 48/16/14,
    `control-border`, sauf `FormulaireTraitement`) ;
  - PAT-7k : F5 (options en cartes, tuiles de U07, volets à chevron ; champ fichier natif gardé) ;
  - PAT-7l : F6 (entrée 560 px, fin 672 px, frise 3 × 2) ;
  - PAT-7m : F7 (écarts locaux ; « Réinitialiser » gardé en rouge).
- **Non vus à l'écran** : U40 (« Annuler » en fantôme, page Informations, très longue au
  téléphone), U11 et U12 derrière le portillon.
- **Toujours ouvert à PAT-7** : lecteur d'écran réel, téléphone réel, U29, marge `p-8` à 195 px,
  en-tête de U10 après PAT-3b.

## Prochaine action exacte

1. Commit, push, PR (`--body-file`) ; CI par `node scripts/wn-attendre-ci.mjs <N>` en tâche de fond.
2. `node scripts/wn-revue-pr-agent.mjs <N>` → 0, sinon `wn-reviewer` ; un verdict par commentaire
   en ligne.
3. « prête @<sha> » en commentaire, ligne `prete` au registre D-503 (boîte `integrateur`), suivi
   patient (`lots/PAT-7`, journal).
4. Après le merge : PAT-7j sur une branche neuve depuis `origin/main`.

## Interdits encore actifs

- Aucun texte d'interface hors de D-488 ; aucun décor avant COM-1 ; fichiers COM-0 gelés.
- Rien de clinique ; aucun texte de consentement, de droits ni de sécurité modifié.
- Aucune migration ni drapeau. Production en lecture seule ; constat à l'écran en local seulement,
  sur Sophie Nicola, Jennifer Martin et Michel Dogné.
- Aucun composant praticien : PRA-6m travaille en parallèle.
- Jamais de merge par la session ; écritures ArtifactData épinglées par `if_version`.
- T2 jamais en parallèle d'un autre sur le Mac, toujours dans un environnement sans drapeaux
  exportés. Branche avancée par `--ff-only` seulement (D-518).
