# Handoff — 2026-11-19 — dossier du besoin 10, étape 2 : lecture du corpus ; réponses du besoin 8 (D-312, H15), lot de la file B

## Branche et état Git

- Branche `docs/besoin10-etape2-lecture-corpus`, créée sur `origin/main` 39274b8d (#2261 mergée). Worktree `.claude/worktrees/agent-a81c34a8d1130b0ce`.
- La PR de l'étape 1 du besoin 10 (#2262, rang de journal `05`) reste ouverte : le fragment `06` la suppose mergée d'abord. Aucun fichier commun.
- Session concurrente (file B), mission « 12 besoins, séquentiel ». `git` et `gh` en direct.

## Objectif

Étape 2 du dossier du besoin 10 après les réponses T1 à T3 (A, A, C) : lecture du corpus par conteneur, en lecture seule, au périmètre élargi ; inventaire au dossier privé ; manques en questions M avec avis de Codex à l'aveugle. Y joindre, dans le journal H15, la trace des réponses M1 à M4 du besoin 8 et de l'étape 3 qui les suit (une seule finalité : consigner dans le dépôt ce que les dossiers 8 et 10 ont reçu). Documentation seule.

## Décisions prises

- Lecture au périmètre T3 : C (questionnaire du cabinet, bornes, interventions, biomarqueurs, mesures de pensées, monoamines, axe mélatonine, lecture des mêmes sous-scores par règles et assiettes).
- Rangs du journal H15 : `06` et `07` (`04` pris par le fragment du besoin 5 renommé par #2261, `05` par #2262), relevés sur `origin/main` ET dans les PR ouvertes avant d'écrire (leçon du doublon `02`).
- Quatre manques posés : `20261119-0133-b` à `0136-b`. Avis de Codex à l'aveugle : A, C, A, A ; recommandations de la session : A, B, A, A (diffère sur `0134-b` : la recherche, sécurité d'abord, précède le retrait, comme pour le besoin 8). La sixième cible de `0135-b` (origine, validité et bornes du questionnaire du cabinet) vient d'une réserve de Codex, adoptée.
- Besoin 8 : réponses M1 à M4 (A contre l'avis de Codex, B, A, B) et étape 3 (familles posées, aucune référence choisie) tracées dans le fragment `07`.
- Lot `besoin10-etape2-lecture-corpus` (file B, ordre 104, après `besoin10-dossier-ouvert`).

## Fichiers modifiés

- `docs/claude/plan-journal/H15/2026-11-19-06-dossier-besoin-10-lecture-corpus.md` et `2026-11-19-07-dossier-besoin-8-reponses-et-etape-3.md` (nouveaux) ; `changelog.d/2026-11-19-dossier-besoin-10-lecture-corpus.md` ; ce handoff.
- Hors dépôt : dossier privé du besoin 10 (section « Étape 2 : lecture du corpus » et tableau M1 à M4), lots et questions du registre, bloc-notes de la session (`b10/`).

## Validations exécutées

- Lecture de production : trois conteneurs `scalingo run -d`, transactions en lecture seule annulées, aucune écriture. Les comptes sont des ordres de grandeur issus de motifs, pas un inventaire certifié ; des passages externes ramenés par des motifs larges (notices, fiches de minéraux) ont été écartés à la lecture.
- Avis de Codex : quatre appels (paquets sans option recommandée, sans pièce privée ni donnée patient).
- Contrôles du dépôt de la PR (plan-journal, anti-secrets) : résultats donnés dans la PR. Vitest non joué (worktree sans `npm ci`, diff de documentation seule). Pas de T2.

## Problèmes ouverts

- Réponses du responsable à M1 à M4 du besoin 10. Le lot reste `pris` jusqu'à elles.
- Besoins 3 et 8 : en attente de la recherche externe du responsable ; besoin 9 : suspension des quatre lignes à la file A.
- #2262 (étape 1 du besoin 10) à merger avant celle-ci ; droits d'usage des sources du registre à vérifier pour la plupart (constat des dossiers privés).

## Prochaine action exacte

1. CI de la tête (`wn-attendre-ci.mjs`, seul `0` vaut), revue sur le sha de tête, boîte B relue, « prête @<sha> ».
2. S'arrêter aux réponses M1 à M4 ; puis étape 3 du besoin 10 : liste des cibles de recherche, sans référence choisie de mémoire.

## Interdits encore actifs

- Aucun texte de claim, aucune valeur, aucune borne, aucun seuil, aucun nom de rubrique au dépôt (`D-251` §4, `D-325` §5).
- Aucune règle, aucun seuil, aucune dose ni aucun poids inventés. Aucun code clinique avant signature et décision.
- Aucune ingestion sans accord pour chaque envoi ; la signature ne se délègue pas.
- Aucune migration ; pas de `prisma format`. Production lue seulement par `scalingo run -d`. L'URL des dossiers privés reste hors dépôt.
