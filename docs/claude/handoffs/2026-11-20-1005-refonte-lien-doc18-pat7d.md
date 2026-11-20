# Handoff — 2026-11-20 — Refonte Lien / Empreinte, DOC-18 (cadrage de PAT-7d)

## Branche et état du dépôt

- Branche `claude/refonte-lien-doc18-pat7d`, créée depuis `origin/main` (`ecd94548`). Worktree `.claude/worktrees/pat4-questionnaires-agendas` (session PAT).
- Documentation seule : amendement DOC-18 de D-488, registre des textes, plan patient, fragment de changelog et ce handoff. Aucun code.
- PAT-7h (#2276) est prête @4c3ec104 et attend l'intégrateur.
- La session ne merge pas : c'est l'intégrateur qui merge, sur « prête @<sha> ».

## Objectif

Le responsable a ouvert PAT-7d le 2026-11-20 (« Ouvre PAT-7d »), après avoir répondu le 2026-11-19 « Les deux : hub et U24-U25 » à la question `20261117-1243-d`. L'option retenue prévoit d'abord un DOC-n, puis le lot en code seul. Cette PR porte le DOC-n.

## Décisions prises

- DOC-18 (numéro suivant DOC-17 ; aucun DOC-n ouvert dans les PR) :
  - §7 étendu au hub : plus de « Réessayer » sous le refus 404 « Suivi non reconnu. », avec la forme « constat » du point de suivi ;
  - « Réessayer » inscrit sur U24 et U25, après un échec de lecture (HTTP 500 ou coupure réseau).
- Pas de « Réessayer » sur un refus que réessayer ne lèvera pas :
  - 401 : U25 renvoie déjà à l'entrée ; U24 garde son message ;
  - 403 : compte refusé, comme sur Mon bilan ;
  - 503 : espace non ouvert.
- Choix de l'assistant, inscrit dans DOC-18 : U24 et U25 gardent leur forme (message en ligne), et seul le bouton s'ajoute dessous.
  - `PatientErrorState` aurait aussi ajouté son texte d'aide, un emplacement neuf que la question n'a pas porté.

## Fichiers modifiés

- `docs/decisions/D-488.md` : amendement DOC-18.
- `docs/claude/propositions/2026-11-11-refonte-lien-etape2/registre-textes.md` : §2.12 et récapitulatif.
- `docs/claude/propositions/2026-11-11-refonte-lien-etape2/plan-patient.md` : §3, PAT-7.
- `changelog.d/2026-11-20-refonte-lien-doc18-pat7d.md`.
- Ce handoff.

## Validations exécutées

- Chemins et lignes cités relus au commit `ecd94548` :
  - hub `PatientCompanionHome.tsx:168-176` ;
  - `ProtocolCheckinForm.tsx:139-140` ;
  - `ComprehensionView.tsx:128-135` et `DossierDeuxVoixView.tsx:336-343` ;
  - `MonBilan.tsx:94-101` ;
  - statut 404 de `api/portail/protocole/route.ts:186` ;
  - 503 de la surface fermée ; 401 et 403 de `portailAuth.ts`.
- `npm run check` (T1 complet) : vert. Pas de T2 : aucun code.

## Problèmes ouverts

- Le code de PAT-7d suit, dans une PR à part, après le merge de DOC-18 :
  - hub : forme « constat » sur un 404 ;
  - U24 et U25 : bouton « Réessayer » ;
  - tests, puis T2.
- Forme transverse : à décider en bloc (constat des prototypes §3.2).

## Prochaine action exacte

1. `npm run check`, commit, PR avec `--body-file`, CI (`wn-attendre-ci.mjs`, en tâche de fond), `wn-revue-pr-agent.mjs` → 0.
2. Déclarer « prête @<sha> », ligne `prete` au registre D-503, suivi patient à jour.
3. Après le merge : branche du code de PAT-7d depuis `origin/main`.

## Interdits encore actifs

- Aucun texte d'interface hors de D-488. Aucun décor avant COM-1. Fichiers COM-0 gelés.
- Rien de clinique. Aucun texte de consentement, de droits ni de sécurité modifié, pied d'urgence compris.
- Aucune migration, aucun drapeau. Production en lecture seule ; constat à l'écran en local seulement.
- Patients fictifs seulement : Sophie Nicola, Jennifer Martin, Michel Dogné.
- Jamais de merge par la session. Toute écriture ArtifactData épinglée par `if_version`.
- T2 avant tout commit UI ou API, jamais deux T2 en parallèle sur le Mac.
- Branche avancée par `git merge --ff-only origin/main` seulement (D-518).
