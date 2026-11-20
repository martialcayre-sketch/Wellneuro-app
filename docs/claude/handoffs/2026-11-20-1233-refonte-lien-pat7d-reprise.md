# Handoff — 2026-11-20 — Refonte Lien / Empreinte, PAT-7d : reprise sur erreur de lecture

## Branche et état du dépôt

- Branche `claude/refonte-lien-pat7d-reprise`, créée depuis `origin/main` (`ecd94548`). Worktree `.claude/worktrees/pat4-questionnaires-agendas` (session PAT).
- Trois composants, trois fichiers de test, un fragment de changelog et ce handoff. Aucune migration, aucun drapeau, aucun texte neuf.
- Le cadrage est DOC-18 (#2280, documentation seule, mergée en `0713afa8`).
- La session ne merge pas : c'est l'intégrateur qui merge, sur « prête @<sha> ».

## Objectif

Le responsable a ouvert PAT-7d le 2026-11-20 (« Ouvre PAT-7d »). Le lot applique l'amendement DOC-18 de D-488, qui inscrit sa réponse du 2026-11-19 à `20261117-1243-d` (« Les deux : hub et U24-U25 »).

## Décisions prises

- Pas de décision neuve : application de DOC-18.
- **Hub** (`PatientCompanionHome.tsx`) :
  - `lireProtocole` marque un refus 404 (`nonReconnu`) ;
  - le volet rend alors la forme « constat » de `PatientErrorState`, sans `onReessayer`, comme `ProtocolCheckinForm` ;
  - les autres erreurs gardent la forme « erreur » et « Réessayer ».
- **U24** (`ComprehensionView.tsx`) et **U25** (`DossierDeuxVoixView.tsx`) :
  - l'état `erreur` porte `reessayable`, vrai sur une coupure réseau et sur une réponse 5xx autre que 503 ;
  - le bouton `PatientButton` `ghost` « Réessayer » s'ajoute sous le message en ligne inchangé ;
  - au clic, l'état repasse par « chargement », puis la page est relue ;
  - 401, 403 et 503 gardent le message seul.
- Le texte d'aide de `PatientErrorState` n'est pas ajouté à U24 et U25 (DOC-18).

## Fichiers modifiés

- `web/src/components/patient-companion/PatientCompanionHome.tsx` et `.test.tsx` :
  - 404 sans « Réessayer » ;
  - 500 avec « Réessayer ».
- `web/src/components/patient-companion/ComprehensionView.tsx` et `.test.tsx` :
  - 500 relu par « Réessayer » ;
  - coupure réseau ;
  - 401, 403 et 503 sans bouton.
- `web/src/components/patient-companion/DossierDeuxVoixView.tsx` et `.test.tsx` : de même, sans 401, que la page renvoie déjà à l'entrée.
- `changelog.d/2026-11-20-refonte-lien-pat7d-reprise.md`.
- Ce handoff.

## Validations exécutées

- Vitest ciblé : trois fichiers, 170 tests verts.
- `npm run check:rapide` : vert.
- T2 (`npm run test:worktree -- --fast`) : vert en 10 min 35 s, sur la base `ecd94548`. La branche a ensuite avancé par `--ff-only` jusqu'à `0713afa8` (#2279, corpus ; #2280, DOC-18), sans aucun fichier commun avec le lot.
- Aucun E2E ne cite ces chemins.
- Le rendu n'a pas été regardé à l'écran. La preuve est dans les tests de composant.
- Les fixtures ne portent pas d'échec de lecture de U24 ni de U25.

## Problèmes ouverts

- Forme transverse : à décider en bloc (constat des prototypes §3.2).
- Reste à PAT-7 :
  - lecteur d'écran réel, téléphone réel ;
  - U29 (fixture à construire) ;
  - anneau des champs de date de U40 ;
  - marge intérieure des cartes (`p-8`) à 195 px ;
  - en-tête de U10 après PAT-3b.

## Prochaine action exacte

1. `npm run check`, commit, PR avec `--body-file`, CI en tâche de fond, `wn-revue-pr-agent.mjs` → 0.
2. Déclarer « prête @<sha> », ligne `prete` au registre D-503, suivi patient à jour.

## Interdits encore actifs

- Aucun texte d'interface hors de D-488. Aucun décor avant COM-1. Fichiers COM-0 gelés.
- Rien de clinique. Aucun texte de consentement, de droits ni de sécurité modifié, pied d'urgence compris.
- Aucune migration, aucun drapeau. Production en lecture seule ; constat à l'écran en local seulement.
- Patients fictifs seulement : Sophie Nicola, Jennifer Martin, Michel Dogné.
- Jamais de merge par la session. Toute écriture ArtifactData épinglée par `if_version`.
- T2 avant tout commit UI ou API, jamais deux T2 en parallèle sur le Mac.
- Branche avancée par `git merge --ff-only origin/main` seulement (D-518).
