# Handoff — 2026-11-19 — dossier du besoin 8 ouvert, étape 1 (D-312, H15), lot de la file B

## Branche et état Git

- Branche `docs/besoin8-dossier-ouvert`, créée sur `origin/main` e5d03ac5 (#2250 mergée), avancée en `--ff-only` sur 359a4740. Worktree `.claude/worktrees/agent-a81c34a8d1130b0ce`.
- Session concurrente (file B), mission « 12 besoins, séquentiel ». `git` et `gh` en direct.

## Objectif

Étape 1 du dossier du besoin 8 au gabarit des besoins 1, 3, 4, 5 et 9 : état initial lu dans le code, dossier privé, questions T1 à T3 avec l'avis de Codex à l'aveugle. Documentation seule.

## Décisions prises

- Ouverture sur l'ordre du responsable du 2026-11-19 (« ouvre besoin 8 »), le besoin 3 restant en attente de sa recherche externe (non touché).
- Constat clé : le code lit déjà la cible signée du 2026-10-18 (la HAD-D seule) ; le renommage « contexte dépressif » reste à appliquer par J3-12f. Écart de provenance du champ « traduction validée » du registre d'instruments à lever (consigné au dossier).
- Lot `besoin8-dossier-ouvert` (file B, ordre 101) ; questions `20261119-0100-b` à `0102-b`, avis de Codex à l'aveugle A, A, C (confiance forte), identique à la recommandation de la session.
- Rang du journal H15 : `2026-11-19-02` (`01` pris sur `origin/main` par le besoin 3).

## Fichiers modifiés

- `docs/claude/plan-journal/H15/2026-11-19-02-dossier-besoin-8-ouvert.md` (nouveau) ; `changelog.d/2026-11-19-dossier-besoin-8-ouvert.md` ; ce handoff.
- Hors dépôt : dossier privé du besoin 8, lot et questions du registre, bloc-notes de la session (`b3/`).

## Validations exécutées

- Lecture du code seulement ; aucune lecture de production. Avis de Codex : trois appels, état conforme.
- Contrôles du dépôt de la PR (plan-journal, décisions, anti-secrets) : résultats donnés dans la PR. Vitest non joué (worktree sans `npm ci`, diff de documentation seule). Pas de T2.

## Problèmes ouverts

- Réponses du responsable à T1, T2 et T3. Le corpus n'est pas encore lu pour ce besoin.
- Besoin 3 : en attente de la recherche externe du responsable ; besoin 9 : suspension des quatre lignes à la file A.
- Le lot `besoin8-dossier-ouvert` reste `pris` tant que T1 à T3 ne sont pas répondues.

## Prochaine action exacte

1. CI de la tête (`wn-attendre-ci.mjs`, seul `0` vaut), revue sur le sha de tête, boîte B relue, « prête @<sha> ».
2. S'arrêter aux réponses T1 à T3 ; puis étape 2 (lecture du corpus par conteneur).

## Interdits encore actifs

- Aucun texte de claim, aucune valeur, aucune borne, aucun seuil, aucun nom de rubrique au dépôt (`D-251` §4, `D-325` §5).
- Aucune règle, aucun seuil, aucune dose ni aucun poids inventés. Aucun code clinique avant signature et décision.
- Aucune ingestion sans accord pour chaque envoi ; la signature ne se délègue pas.
- Aucune migration ; pas de `prisma format`. Production lue seulement par `scalingo run -d`. L'URL des dossiers privés reste hors dépôt.
