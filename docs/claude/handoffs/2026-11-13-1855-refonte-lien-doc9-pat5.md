# Handoff — 2026-11-13 — Refonte Lien / Empreinte, DOC-9 : arbitrages du prototype PAT-5 et deux emplacements de textes inscrits

## Branche et état du dépôt

- Branche `claude/refonte-lien-doc9-pat5`, créée depuis `origin/main@24d8641d`. Documentation seule.
- Worktree `.claude/worktrees/pat4-questionnaires-agendas` (session PAT). La session ne merge pas : l'intégrateur merge sur « prête @<sha> ».
- Aucun autre DOC-n ouvert au départ : PR ouvertes relues (#2051, #2065 à #2068, sans rapport avec la refonte).
- PAT-4 clos : #2062 mergée en `e78c92a2` ; ligne `merge_fait` accusée dans la boîte PAT-4, fiche `lots/PAT-4` passée à `merge`.

## Objectif

Inscrire, avant le code de PAT-5, les réponses du responsable au prototype PAT-5 (itération 1) et les deux emplacements neufs de textes qu'il a acceptés mot pour mot.

## Décisions prises

- Prototype publié avant tout code (D-481 §4) : https://claude.ai/artifact/RAM7H81H6f5ikjUXqpxBUn. Il couvre les treize fiches, une planche des états et une planche d'impression, avec les textes du code mot pour mot.
- Réponses du responsable : « All recommended », soit Q1c — Q2a — Q3a — Q4a — Q5a — Q6a — Q7a — Q8a. Liste commune `20261113-1830-d` à `-1837-d`.
- Emplacements neufs acceptés : « Accept both ». Liste commune `20261113-1847-d`, `-1848-d`.
- Constat PR-Agent sur #2069 (d74e269d7648, perte du texte saisi sur U24 et U25) : routé en question `20261113-1856-d`, réponse a (« Yes, a: new tab ») : T-36 ouvre la connexion dans un nouvel onglet sur U24 et U25, même onglet sur U23. Intégré à DOC-9 avant « prête ».
- [[D-481]] : complément DOC-9, les huit choix.
- [[D-488]] : amendement DOC-9.
  - T-36 sous le 401 d'un envoi de U23, U24 et U25.
  - La phrase vide de U28 dans le rayon vide de U27.
  - Aucun texte neuf, aucun nouvel identifiant ; titre de D-488 inchangé.

## Fichiers modifiés

- `docs/decisions/D-481.md` : complément DOC-9.
- `docs/decisions/D-488.md` : amendement DOC-9.
- Dossier de l'étape 2 :
  - `registre-textes.md` : §2.8 neuf, récapitulatif ;
  - `plan-patient.md` : PAT-5, paragraphe des arbitrages.
- `changelog.d/2026-11-13-refonte-lien-doc9-pat5.md`, ce handoff.

## Validations exécutées

- Textes et chemins relus au commit `e78c92a2`, puis inchangés à `24d8641d` (`git diff --stat` vide sur `web/src/components/patient`, `patient-companion`, `ui/ScoreGauge.tsx`, `app/portail`). Fichiers relus : `FichesRemises.tsx:49`, `lib/trust/portailAuth.ts:20`, `DossierDeuxVoixView.tsx` (quatre envois POST `/api/portail/dossier`), `Bibliotheque.tsx` (rayon rendu `null` à vide), `ScoreGauge.tsx:19`.
- Prototype rendu localement, quatre cartes contrôlées à l'écran (U25, U15, états, impression).
- Anti-secrets, `check:rapide` et CI : voir la PR.
- Aucun test de code : aucun code touché.

## Problèmes ouverts

- Q1c : décision à part sur l'arc proportionnel de la jauge de « Mon équilibre » ([[D-333]] §1). Aucun lot n'est ouvert pour elle.
- Q2a, Q3a : le séparateur et les ornements des vides attendent COM-1, qui est reporté.
- Feu vert du code de PAT-5 : à demander au responsable après le merge de DOC-9.
- Restent hors de PAT-5 : 1050-d, 1302-d (mesure sur iPhone réel), le lot Q5b, la valeur 5 des plaintes, la ligne de prises au zoom 200 %.

## Prochaine action exacte

1. Fusion de DOC-9 par l'intégrateur.
2. Feu vert du responsable.
3. Code de PAT-5 sur une branche neuve depuis `origin/main`, dans ce worktree : habillage des treize fiches, T-33 sur U24, T-36 et la phrase vide aux emplacements de DOC-9, `print:hidden` de Q5a. Un E2E doit prouver qu'après une reconnexion dans le nouvel onglet, l'envoi depuis U24 ou U25 resté ouvert réussit.

## Interdits encore actifs

- Aucun texte d'interface hors de [[D-488]] ; un seul DOC-n ouvert à la fois.
- Aucune question, option, cotation, condition d'apparition ni règle d'enregistrement modifiée ; rien de clinique.
- Aucune migration, aucun drapeau ; fichiers COM-0 gelés.
- Aucun décor avant COM-1, et jamais hors des emplacements de D-481 §1 bis.
- Production en lecture seule ; constat à l'écran en local seulement.
- Jamais de merge par la session ; toute écriture ArtifactData épinglée par `if_version`.
