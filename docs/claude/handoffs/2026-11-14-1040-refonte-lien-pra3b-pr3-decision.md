# Handoff — 2026-11-14 — Refonte Lien PRA-3b, PR 3 : phase Décision (P12 à P14) et orientation

## Branche et état du dépôt

- Branche `worktree-refonte-lien-pra3b-pr3-decision`, créée depuis `origin/main@fd53c7b9`, puis avancée seule en `--ff-only` sur `origin/main@9bb7c5af` (PR 1 #2097 et PAT-5 #2095 mergées), sans commit propre (D-518) : le crochet de fraîcheur bloquait l'édition.
- Worktree `.claude/worktrees/refonte-lien-pra3b-pr3-decision`. La session ne merge pas : l'intégrateur merge sur « prête @<sha> ».

## Objectif

PR 3 de PRA-3b (matrice des huit PR, groupe Décision : P12 à P14), selon les réponses « a » du responsable à Q2, Q3 et Q11 (« Toutes en a », 2026-11-13), lancée par « PR 3 » le 2026-11-14. Invariants de la matrice : aucun `OrientationPanel` à sa place, boutons à 44 px avec focus, aucune navigation déplacée.

## Décisions prises

- Q2 a : panneaux de la phase en h4, sous-parties en h5 (`EpisodeConfirmationPanel`, plainte et constats de sécurité dans `ClinicalRuntimeSection`, `SignauxAdressesPanel`, `ConstatCriteresPanel`) ; « Lettre d'adressage au médecin » (`AdressagePanel`) passe d'un paragraphe à un h5, même texte ; « Priorité et limites » (`DecisionSummaryCard`, ses deux rendus) et « Priorité retenue » (`SelectionPrioritePanel`) deviennent des h4 lisibles (`font-display text-base`), d'après l'annotation de la planche ; les autres titres gardent leur style.
- Les panneaux touchés ne sont montés que dans `ClinicalRuntimeSection` (et `OrientationPanel` dans `TrajectoirePanel`) : aucun autre niveau de titre n'est affecté.
- Q3 a : une seule action pleine par panneau, déjà tenue ; rien n'est rendu bordé.
- Q11 a : `OrientationPanel` reste dans l'onglet Trajectoire (h3 de panneau d'onglet, inchangé) ; ses sept boutons passent à `min-h-11` avec anneau de focus, taille de texte inchangée.
- Les `ui/Button` de la phase (« Ouvrir un nouveau cycle », « Annuler l'ouverture ») sont à 44 px par la PR 1, désormais sur la branche.

## Fichiers modifiés

- `web/src/components/patient-cockpit/` : `EpisodeConfirmationPanel.tsx`, `ClinicalRuntimeSection.tsx`, `AdressagePanel.tsx`, `SignauxAdressesPanel.tsx`, `DecisionSummaryCard.tsx`, `SelectionPrioritePanel.tsx`, `ConstatCriteresPanel.tsx`, `OrientationPanel.tsx`.
- Tests (même dossier) : `ClinicalRuntimeSection.test.tsx` (épisode : h4, h5, focus), `AdressagePanel.test.tsx` (h5, deux rendus), `SelectionPrioritePanel.test.tsx` (h4 lisible, focus), `DecisionSummaryCard.test.tsx` (h4, avec et sans carte), `OrientationPanel.test.tsx` (chaque bouton à 44 px avec focus).
- `changelog.d/2026-11-14-refonte-lien-pra3b-pr3-decision.md`, ce handoff.

## Validations exécutées

- `tsc --noEmit` vert ; Vitest du cockpit et de la fiche (47 fichiers, 1 200 bancs) vert avant l'avance ; les cinq fichiers de bancs modifiés (185 bancs) verts.
- T1, T2, CI, revues : voir la PR.

## Problèmes ouverts

- Les résumés « Traçabilité » et « Provenance de la table » de l'orientation restent à leur taille : la planche et Q11 ne visent que les sept boutons.
- Hérités : « Consultation du … » du tiroir des renseignements reste un paragraphe (PR 1) ; « Activer la décision JA » sous T-63 (PR 5) ; titre des portes biologiques (PR 6b) ; fenêtre sans verrou de Q18 ; `ProtocolMiniBuilder.test.tsx` sans `cleanup` global.

## Prochaine action exacte

Revue (PR-Agent) puis fusion par l'intégrateur ; ensuite la PR suivante que désigne le responsable (PR 7 ou 8), depuis un worktree neuf sur `origin/main`.

## Interdits encore actifs

- Rien de clinique ; aucun texte hors de D-488 ; aucune migration, aucun drapeau ; aucune navigation déplacée (Q11 a).
- Identités fictives seulement ; production en lecture seule ; crochet de fraîcheur jamais contourné.
