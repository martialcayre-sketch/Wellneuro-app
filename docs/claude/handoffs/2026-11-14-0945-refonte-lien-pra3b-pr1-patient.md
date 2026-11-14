# Handoff — 2026-11-14 — Refonte Lien PRA-3b, PR 1 : phase Patient (P05 à P07, P31)

## Branche et état du dépôt

- Branche `worktree-refonte-lien-pra3b-pr1-patient`, créée depuis `origin/main@481c2450` (PR 4 #2087 mergée).
- Worktree `.claude/worktrees/refonte-lien-pra3b-pr1-patient`. La session ne merge pas : l'intégrateur merge sur « prête @<sha> ».

## Objectif

PR 1 de PRA-3b (matrice des huit PR, groupe Patient : P05 à P07, P31), selon les réponses « a » du responsable (« Toutes en a », 2026-11-13) à Q2, Q3, Q8 et Q17, lancée par « PR 1 » le 2026-11-14.

## Décisions prises

- Q8 a : `ui/Button` et `ui/Input` à `min-h-11` avec anneau `focus-visible` ; 33 importeurs, tous praticien (aucun sous le portail, vérifié par recherche d'import). `FormulaireTraitement` et `ChampDatePeriode` (COM-0) intouchés.
- Q2 a : fiche administrative en h4 dans le cockpit par une prop `niveauTitre` (le rayon Patients garde h3) ; documents remis et déposés en h4 sous la phase ; sections du tiroir « Renseignements du patient » en h3 sous le titre h2 du tiroir. `PhysioTraitementsPanel` (tiroir) avait déjà ses h3.
- Q3 a : « Débloquer » des demandes de correction passe de plein (`bg-status-warning text-white`) à bordé, comme celui des échus ; une seule action pleine par zone dans P07 (« Enregistrer » d'un formulaire), inchangée.
- Q17 a : T-17 « Réessayer » sous l'échec de P06, aux deux rendus de la même lecture (ligne d'état de la phase, tiroir) ; relit la seule lecture, focus rendu au contenu relu (même schéma que la PR 2).
- P07 et P31 : gestes, champs, sélecteur et motifs à 44 px, anneaux de focus ; « Réessayer » de P07 (texte existant) devient un vrai bouton bordé au lieu d'un lien souligné.

## Fichiers modifiés

- `web/src/components/ui/Button.tsx`, `web/src/components/ui/Input.tsx`.
- `web/src/components/FichePatientPanel.tsx` (ligne P06 et T-17, « Débloquer », `niveauTitre="h4"`).
- `web/src/components/dossier/FicheAdministrativePanel.tsx` (`niveauTitre`).
- `web/src/components/patient-cockpit/RenseignementsPatientPanel.tsx` (T-17, focus, h3).
- `web/src/components/physio-traitements/PhysioTraitementsPanel.tsx`.
- `web/src/components/patient-cockpit/DocumentsRemisPanel.tsx`, `DocumentsDeposesPanel.tsx`.
- Tests : `RenseignementsPatientPanel.test.tsx` (Réessayer et focus, h3), `FichePatientPanel.test.tsx` (P06 Réessayer sans autre relecture, P05 h4 et 44 px, « Débloquer » bordé).
- `changelog.d/2026-11-14-refonte-lien-pra3b-pr1-patient.md`, ce handoff.

## Validations exécutées

- `tsc --noEmit` vert ; Vitest ciblé (22 fichiers, 424 bancs : fiche, dossier, ui, physio, documents, renseignements) vert, puis les cinq bancs neufs verts.
- T1, T2, CI, références visuelles, revues : voir la PR.

## Problèmes ouverts

- Les références visuelles (`visual.spec.ts`) des écrans qui portent `Button`/`Input` peuvent rougir : régénération par le workflow `visual-baselines`, seules les bases refusées committées.
- Q2 a, « un paragraphe-intitulé devient titre » : « Consultation du … » du tiroir des renseignements reste un paragraphe (non relevé par la planche de P06).
- Hérités : « Activer la décision JA » sous T-63 (PR 5) ; titre des portes biologiques (PR 6b) ; fenêtre sans verrou de Q18 ; `ProtocolMiniBuilder.test.tsx` sans `cleanup` global.

## Prochaine action exacte

Revue (PR-Agent) puis fusion par l'intégrateur ; ensuite la PR suivante que désigne le responsable (PR 3, 7 ou 8), depuis un worktree neuf sur `origin/main`.

## Interdits encore actifs

- Rien de clinique ; aucun texte hors de D-488 ; aucune migration, aucun drapeau ; COM-0 (formulaire de traitement) intouché.
- Identités fictives seulement ; production en lecture seule ; crochet de fraîcheur jamais contourné.
