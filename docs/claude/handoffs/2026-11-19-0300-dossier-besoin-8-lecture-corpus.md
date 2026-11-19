# Handoff — 2026-11-19 — dossier du besoin 8, étape 2 : lecture du corpus (D-312, H15), lot de la file B

## Branche et état Git

- Branche `docs/besoin8-etape2-lecture-corpus`, créée sur `origin/main` 97306b74. Worktree `.claude/worktrees/agent-a81c34a8d1130b0ce`.
- La PR de l'étape 1 (#2256) était encore ouverte à la création : cette branche ne touche aucun de ses fichiers (rang de journal `2026-11-19-03`, handoff et changelog propres), aucun chevauchement.
- Session concurrente (file B), mission « 12 besoins, séquentiel ». `git` et `gh` en direct.

## Objectif

Étape 2 du dossier du besoin 8, après les réponses du responsable à T1 à T3 (A, A, C) : lecture du corpus par conteneur, en lecture seule, au périmètre élargi ; inventaire au dossier privé ; manques en questions M avec avis de Codex à l'aveugle. Documentation seule.

## Décisions prises

- Lecture au périmètre T3 : C (HAD-D, règle et intervention du guide, échelles de plaisir et d'anhédonie, mécanismes dopaminergiques et de récompense, sous-score dopamine rattaché en convergence, règles d'orientation qui proposent la HAD, bilan de l'humeur en constat).
- Écart « traduction validée » du registre d'instruments contre le niveau A du code : consigné au dossier comme constat, non tranché (consigne du responsable).
- Quatre manques posés : `20261119-0111-b` (intervention du guide), `0112-b` (seuil de la règle), `0113-b` (sources externes à chercher), `0114-b` (déclencheurs des cinq règles). Avis de Codex à l'aveugle : C, B, A, B ; recommandations de la session : A, B, A, B (diffère sur la première). Le paquet de la deuxième a été rejoué après correction d'un compte (le dossier privé donne le compte exact).
- Lot `besoin8-etape2-lecture-corpus` (file B, ordre 102, après `besoin8-dossier-ouvert`).

## Fichiers modifiés

- `docs/claude/plan-journal/H15/2026-11-19-03-dossier-besoin-8-lecture-corpus.md` (nouveau) ; `changelog.d/2026-11-19-dossier-besoin-8-lecture-corpus.md` ; ce handoff.
- Hors dépôt : dossier privé du besoin 8 (section « Étape 2 : lecture du corpus » et tableau M1 à M4), lot et questions du registre, bloc-notes de la session (`b8/`).

## Validations exécutées

- Lecture de production : quatre conteneurs `scalingo run -d`, transactions en lecture seule annulées, aucune écriture. Les comptes sont des ordres de grandeur issus de motifs, pas un inventaire certifié.
- Avis de Codex : cinq appels (quatre questions, plus le rejeu d'une), paquets sans option recommandée, sans pièce privée ni donnée patient.
- Contrôles du dépôt de la PR (plan-journal, décisions, anti-secrets) : résultats donnés dans la PR. Vitest non joué (worktree sans `npm ci`, diff de documentation seule). Pas de T2.

## Problèmes ouverts

- Réponses du responsable à M1 à M4. Le lot reste `pris` jusqu'à elles.
- Besoin 3 : en attente de la recherche externe du responsable ; besoin 9 : suspension des quatre lignes à la file A ; #2256 (étape 1) à merger par l'intégrateur.
- Droits d'usage des sources du registre : à vérifier pour la plupart (constat au dossier privé).

## Prochaine action exacte

1. CI de la tête (`wn-attendre-ci.mjs`, seul `0` vaut), revue sur le sha de tête, boîte B relue, « prête @<sha> ».
2. S'arrêter aux réponses M1 à M4 ; puis étape 3 (liste des cibles de recherche soumise au responsable, accord envoi par envoi).

## Interdits encore actifs

- Aucun texte de claim, aucune valeur, aucune borne, aucun seuil, aucun nom de rubrique au dépôt (`D-251` §4, `D-325` §5).
- Aucune règle, aucun seuil, aucune dose ni aucun poids inventés. Aucun code clinique avant signature et décision.
- Aucune ingestion sans accord pour chaque envoi ; la signature ne se délègue pas.
- Aucune migration ; pas de `prisma format`. Production lue seulement par `scalingo run -d`. L'URL des dossiers privés reste hors dépôt.
