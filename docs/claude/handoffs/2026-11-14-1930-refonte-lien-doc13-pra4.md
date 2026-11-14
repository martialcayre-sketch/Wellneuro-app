# Handoff — 2026-11-14 — Refonte Lien / Empreinte, DOC-13 : prototype PRA-4 validé, textes T-67 à T-73 inscrits (D-481, D-488)

## Branche et état du dépôt

- Branche `claude/refonte-lien-doc13-pra4`, créée depuis `origin/main@ba7f3632`, avancée par `--ff-only` à `eb454046`, dans le worktree `.claude/worktrees/refonte-lien-doc13-pra4`. Le prototype a été préparé sans commit dans `.claude/worktrees/refonte-lien-pra4-prototype` (branche `worktree-refonte-lien-pra4-prototype`, vide, à supprimer).
- Documentation seule : aucun fichier sous `web/`. La session ne merge pas : l'intégrateur merge sur « prête @<sha> ».

## Objectif

Inscrire, avant tout code de PRA-4 (Bibliothèque et ateliers, P37 à P50), la validation du prototype (D-481 §4) et ses sept textes neufs acceptés mot pour mot.

## Décisions prises

- Prototype PRA-4 : https://claude.ai/artifact/P5okmw3f4JnBNrWGy7qcj5 (Design System, itération 2, version 4 ; partagé par lien). Validé par écrit le 2026-11-14 : « Oui, tout accepté ».
- Q1 à Q13 en (a), lignes `20261114-1840-d` à `20261114-1852-d` passées à « répondue ». Q7 clinique, répondue par le responsable. Avis de Codex à l'aveugle joint (douze sur treize ; Q4 en b, faute de connaître la réactivation : aucune n'existe à l'écran). Deux contre-lectures externes jointes.
- T-67 à T-73 acceptés mot pour mot, variantes comprises ; apostrophes droites, comme le texte accepté (règle de T-18).
- Q3 : confirmation de l'envoi aussi dans `FileEnvoiAside.tsx` (Fil du jour) ; D-030 inchangée.
- Q7 : la confirmation dit que la soumission n'est pas atomique ; route, garde, signature claim par claim, résumé du résultat et reprise inchangés.
- T-71 : variante ajoutée sur constat de PR-Agent (#2131), un terme égal à 1 s'écrit au singulier (« 1 validation », « 1 rejet ») ; acceptée par écrit le 2026-11-14 (« Oui, variante (a) »), ligne `20261114-2118-d`.
- P42 : D-326 §2 strict, habillage seul.

## Fichiers modifiés

- `docs/decisions/D-481.md` (complément DOC-13), `docs/decisions/D-488.md` (titre, amendement DOC-13).
- `docs/claude/propositions/2026-11-11-refonte-lien-etape2/registre-textes.md` (numérotation, §1.6, récapitulatif), `plan-praticien.md` (PRA-4).
- `changelog.d/2026-11-14-refonte-lien-doc13-pra4.md`, ce handoff.

## Validations exécutées

- Relevé de P37 à P50 sur `main@af70261c`, chemins relus à `eb454046` après #2130, numéros recalés : file d'envoi (`BibliothequePanel.tsx:96-104`, `:750`), envoi (`:804`, `FileEnvoiAside.tsx:148`), désactivation (`:357`, `:612`), revue en lot (`AtelierCorpusPanel.tsx:438-508`, `:1089`), surtitre (`connaissances/page.tsx:19`).
- Contenu publié de la version 4 du prototype comparé aux sources : 14 fichiers identiques ; aucun commentaire.
- T1 et anti-secrets : voir la PR.

## Problèmes ouverts

- Hors PRA-4 : `chargerBibliotheque` avale l'échec (entrées serveur gardées) ; `bibliotheque/options` sans entrée ; décor après COM-1.
- La PR 1 touche `FileEnvoiAside.tsx` (Fil du jour, écran de PRA-2) pour la seule confirmation de Q3.

## Prochaine action exacte

1. CI à 0 (`node scripts/wn-attendre-ci.mjs <N>` en tâche de fond), PR-Agent prouvé sur la tête, un verdict par remarque, « prête @<sha> » au registre.
2. Après le merge : PRA-4 PR 1 (questionnaires et envoi, P37-P39), worktree neuf sur `origin/main` ; puis PR 2, 3, 4, chacune reçue séparément.

## Interdits encore actifs

- Aucun texte d'interface hors de D-488 ; aucun décor avant COM-1.
- Signature NABM en lot : D-326 §2 mot pour mot, aucun « tout valider ».
- Ni entrée de menu pour Règles et Positions d'expert, ni drapeau, ni route, ni garde serveur modifiés ; rien de clinique.
- Aucune migration, aucun schéma ; production en lecture seule.
- Jamais de merge par la session ; toute écriture ArtifactData épinglée par `if_version`.
