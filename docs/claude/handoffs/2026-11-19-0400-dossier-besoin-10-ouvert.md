# Handoff — 2026-11-19 — dossier du besoin 10 ouvert, étape 1 (D-312, H15), lot de la file B

## Branche et état Git

- Branche `docs/besoin10-dossier-ouvert`, créée sur `origin/main` 412cb689 (#2256 et #2260 mergées). Worktree `.claude/worktrees/agent-a81c34a8d1130b0ce`.
- Session concurrente (file B), mission « 12 besoins, séquentiel ». `git` et `gh` en direct.

## Objectif

Étape 1 du dossier du besoin 10 au gabarit des besoins 1, 3, 4, 5, 8 et 9 : état initial lu dans le code, dossier privé, questions T1 à T3 avec l'avis de Codex à l'aveugle. Documentation seule.

## Décisions prises

- Ouverture sur l'accord du responsable du 2026-11-19, les besoins 3 et 8 restant en attente de sa recherche externe (non touchés).
- Constat clé : aucune décision du 2026-10-18 ne cible le besoin 10 ; son état servi est porté par `D-402`, `D-424`, `D-329`, `D-443` et `D-453`, dont l'écart de convergence et le comptage de trois sources, assumés ou nommés sans être tranchés, sont consignés au dossier sans être rouverts.
- Lot `besoin10-dossier-ouvert` (file B, ordre 103) ; questions `20261119-0130-b` à `0132-b`, avis de Codex à l'aveugle A, A, C (confiance forte), identique à la recommandation de la session.
- Rang du journal H15 : `2026-11-19-04` (`02` pris par deux fragments, `03` par l'étape 2 du besoin 8).
- La trace des réponses M1 à M4 du besoin 8 part dans un lot de doc distinct (une seule finalité par PR).

## Fichiers modifiés

- `docs/claude/plan-journal/H15/2026-11-19-04-dossier-besoin-10-ouvert.md` (nouveau) ; `changelog.d/2026-11-19-dossier-besoin-10-ouvert.md` ; ce handoff.
- Hors dépôt : dossier privé du besoin 10, lot et questions du registre, bloc-notes de la session (`b10/`).

## Validations exécutées

- Lecture du code seulement ; aucune lecture de production. Avis de Codex : trois appels, paquets sans option recommandée ni pièce privée, état conforme.
- Contrôles du dépôt de la PR (plan-journal, décisions, anti-secrets) : résultats donnés dans la PR. Vitest non joué (worktree sans `npm ci`, diff de documentation seule). Pas de T2.

## Problèmes ouverts

- Réponses du responsable à T1, T2 et T3. Le corpus n'est pas encore lu pour ce besoin.
- Besoins 3 et 8 : en attente de la recherche externe du responsable ; besoin 9 : suspension des quatre lignes à la file A.
- Le lot `besoin10-dossier-ouvert` reste `pris` tant que T1 à T3 ne sont pas répondues.

## Prochaine action exacte

1. CI de la tête (`wn-attendre-ci.mjs`, seul `0` vaut), revue sur le sha de tête, boîte B relue, « prête @<sha> ».
2. S'arrêter aux réponses T1 à T3 ; puis étape 2 (lecture du corpus par conteneur).

## Interdits encore actifs

- Aucun texte de claim, aucune valeur, aucune borne, aucun seuil, aucun nom de rubrique au dépôt (`D-251` §4, `D-325` §5).
- Aucune règle, aucun seuil, aucune dose ni aucun poids inventés. Aucun code clinique avant signature et décision.
- Aucune ingestion sans accord pour chaque envoi ; la signature ne se délègue pas.
- Aucune migration ; pas de `prisma format`. Production lue seulement par `scalingo run -d`. L'URL des dossiers privés reste hors dépôt.
