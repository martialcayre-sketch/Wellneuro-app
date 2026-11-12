# Handoff — 2026-11-12 — Refonte Lien / Empreinte, DOC-6 : prototype PRA-2 arbitré, T-17 à T-19 inscrits dans D-488

## Branche et état du dépôt

- Branche `claude/refonte-lien-doc6-textes-pra2`, créée depuis `origin/main@9a680203`. Documentation seule.
- Worktree `.claude/worktrees/practical-lamarr-b045ee` du clone principal. La session ne merge pas : l'intégrateur merge sur « prête @<sha> ».
- Aucun autre DOC-n ouvert au départ (PR ouvertes relues).

## Objectif

Inscrire ce que le responsable a validé par écrit le 2026-11-12 pour le prototype PRA-2 (« Oui, tout validé »), avant que PRA-2a et PRA-2b ne posent ces textes.

## Décisions prises

- [[D-488]] : amendement DOC-6, trois lignes au §1 (famille praticien) avec Où, Sens, Existant, Lot :
  - T-17 « Réessayer » (PRA-2a, Patients et Agenda) ;
  - T-18 « Météo d'adhésion indisponible » (PRA-2b) ;
  - T-19 « Retour à la file » (PRA-2b).
- Titre de [[D-488]] réécrit par famille : praticien T-01 à T-19 ; patient T-21 à T-33, T-36 à T-39 ; T-34 refusé.
- T-18 garde l'apostrophe droite : celle du tableau « Textes proposés au registre » du prototype et du titre du panneau « Météo d'adhésion » (`MeteoAdhesionAside.tsx:35`). Les planches du prototype affichent une apostrophe typographique ; à trancher si le responsable y tient.
- [[D-481]] : complément DOC-6, Q1a, Q2a, Q3a, Q4b, Q5a, Q6a, Q7a, Q8a, Q9b, Q10b, Q11a, sur le modèle du complément DOC-3.
- Les messages d'échec cités par le prototype sont les phrases existantes (`messagesDossier.ts:34`, `AgendaPraticien.tsx:57, :82, :105`) : aucun texte neuf hors T-17 à T-19.

## Fichiers modifiés

- `docs/decisions/D-488.md` : titre et amendement DOC-6.
- `docs/decisions/D-481.md` : complément DOC-6.
- Dossier de l'étape 2 :
  - `registre-textes.md` : numérotation, §1.4 neuf, récapitulatif ;
  - `plan-praticien.md` : §3, ligne PRA-2 et fiche PRA-2 (2a puis 2b). Le §1 n'est pas modifié.
- `changelog.d/2026-11-12-refonte-lien-doc6-textes-pra2.md`, ce handoff.

## Validations exécutées

- Textes et réponses relus sur le prototype (README, planches Fil, États de lecture, Confiance & droits détail).
- Chemins cités relus au commit `9a680203` : `RayonPatientsPanel.tsx:491`, `AgendaPraticien.tsx`, `FilDuJour.tsx:245`, `MeteoAdhesionAside.tsx:35`, `app/dashboard/droits/page.tsx`, `TrustPanel.tsx`.
- Anti-secrets, `check:rapide` et CI : voir la PR.
- Aucun test de code : aucun code touché.

## Problèmes ouverts

- §1 de `plan-praticien.md` nomme encore « PRA-2 » dans ses préalables (T-16, décor, prototype). Laissé tel quel (consigne : §3 seul).
- La graphie de l'apostrophe de T-18 est à confirmer seulement si le responsable préfère celle des planches.

## Prochaine action exacte

Fusion de DOC-6 par l'intégrateur. Ensuite PRA-2a peut poser T-17 ; PRA-2b posera T-18 et T-19.

## Interdits encore actifs

- Aucun texte d'interface hors de [[D-488]] ; un seul DOC-n ouvert à la fois.
- Aucun code, route, garde, drapeau, schéma ni règle clinique dans un lot DOC-n.
- Aucun décor avant COM-1.
- Aucune identité ni identifiant de dossier au dépôt ; production en lecture seule, et seulement sur demande.
