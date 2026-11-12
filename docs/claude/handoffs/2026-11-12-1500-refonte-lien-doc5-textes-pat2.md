# Handoff — 2026-11-12 — Refonte Lien / Empreinte, DOC-5 : T-36 à T-39 inscrits dans D-488

## Branche et état du dépôt

- Branche `claude/refonte-lien-doc5-textes-pat2`, créée depuis `origin/main@b778aead`, après la fusion de DOC-4 (#2016). Documentation seule.
- Worktree `.claude/worktrees/refonte-doc5` du clone principal. La session ne merge pas.

## Objectif

Inscrire dans [[D-488]] les quatre textes de PAT-2 que le responsable a acceptés mot pour mot, et tenir à jour le registre, le plan patient, les arbitrages PAT-2 et le complément DOC-4 de [[D-481]].

## Décisions prises

- Acceptation écrite du responsable le 2026-11-12, « Oui, accepter T-36–T-39 ». Elle porte sur les libellés du registre §2.6, tels que sur `claude/refonte-lien-doc4-pat2@61b3b1da`.
- [[D-488]] : un amendement DOC-5 ajoute les quatre lignes au §4 et le titre cite T-36 à T-39. Portée : l'entrée seule (U07, U08) ; les questionnaires gardent « sur cet appareil ».
- T-35 « Revenir à la connexion » reste proposé, non accepté.
- Le correctif de comportement Q6b reste dans PAT-2.
- Base du lot : un correctif préparé hors dépôt et apporté par le responsable. Il a été relu par la session PAT, qui a demandé deux corrections ; les deux sont appliquées :
  - la section « Inscription de T-36 à T-39 » de `pat2-arbitrages.md` est retirée, car elle était inexacte sur l'auteur du report et contenait des phrases de conversation ;
  - la ligne du fragment de changelog sur le suivi est retirée.
- Les deux améliorations qu'elle proposait sont prises :
  - chemins lus au commit `b778aead` ;
  - `SaveStatusIndicator.tsx:19/27/36` cités dans la colonne « Existant », avec ses consommateurs.

## Fichiers modifiés

- `docs/decisions/D-488.md` : titre et amendement DOC-5.
- `docs/decisions/D-481.md` : complément DOC-4, textes indiqués comme acceptés et inscrits.
- Dossier de l'étape 2 :
  - `registre-textes.md` : §2.6 en « Accepté (D-488) » et récapitulatif ;
  - `pat2-arbitrages.md` ;
  - `plan-patient.md` : préalable et fiche PAT-2.
- `changelog.d/2026-11-12-refonte-lien-doc5-textes-pat2.md`, ce handoff.

## Validations exécutées

- Les libellés de T-36 à T-39 sont comparés à ceux du registre de DOC-4 (fusionné) : identiques, apostrophes typographiques comprises.
- Textes actuels relus dans `components/patient/SaveStatusIndicator.tsx` (lignes 19, 27, 36). Leurs consommateurs ont été vérifiés par `git grep` : l'entrée, `GenericQuestionnaire`, `PlaintesForm`.
- Anti-secrets, `wn-decisions` et collation du changelog : voir la PR.
- Aucun test de code : aucun code touché.

## Problèmes ouverts

- T-35 attend une décision du responsable.
- PAT-2 attend encore la validation de son prototype (itération 2) et COM-1 (`LienDecor`) pour le fond léger. Sans COM-1, il livre sans décor.

## Prochaine action exacte

Fusion de DOC-5 par l'intégrateur. Ensuite, sur la page de suivi patient : fiche PAT-2 (champ textes) et une entrée de journal.

## Interdits encore actifs

- Aucun texte d'interface hors de [[D-488]] ; aucun chiffre côté patient ([[D-333]]).
- Les textes par défaut de `SaveStatusIndicator` (questionnaires) ne changent pas.
- Aucun drapeau posé ou retiré sans demande explicite ; aucune modification clinique, de route, de garde, de stockage ni de schéma.
- Production en lecture seule, et seulement sur demande. Aucune identité ni aucun identifiant de dossier au dépôt.
