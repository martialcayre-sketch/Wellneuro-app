# Handoff — 2026-11-18 — dossier du besoin 3, étape 2 : lecture du corpus (D-312, H15), lot de la file B

## Branche et état Git

- Branche `docs/besoin3-lecture-corpus`, créée sur `origin/main` da125214e (#2245 mergée). Worktree `.claude/worktrees/agent-a81c34a8d1130b0ce`.
- Session concurrente (file B), mission « 12 besoins, séquentiel » du 2026-11-18. `git` et `gh` en direct.

## Objectif

Étape 2 du dossier du besoin 3 au gabarit des besoins 1, 4, 5 et 9 : lecture du corpus par conteneur, en lecture seule, au périmètre élargi tranché par le responsable (T3 = C), inventaire au dossier privé, manques posés en questions avec avis de Codex à l'aveugle. Documentation seule.

## Décisions prises

- Réponses du responsable aux trois premières questions : support et structure A (gabarit commun) ; sources à réunir A (tout ce que le guide et le score nomment, mécanismes compris, chaque objet sourcé ou « non évalué ») ; périmètre C (variables du guide, quatre items du score, lecture « discordance » et ses trois seuils, rattachement à l'orientation et à la priorité), contre la recommandation de la session et l'avis de Codex. Exécuté sans re-question.
- Constats : quatre claims seulement au besoin 3 (barème des quatre items) ; corpus du rythme alimentaire interne presque en totalité ; aucune source externe du registre sur le rythme alimentaire ; durée de jeûne sous plusieurs formes internes sans publication ; aucun claim sur les deux seuils d'arbitrage ; les six claims de la règle de priorité ne nomment pas le rythme alimentaire.
- Cinq manques posés au registre (`20261118-2330-b` à `2334-b`), avis de Codex joint : A, A, A, C, B, confiance forte. Il diffère de la recommandation de la session sur deux questions.
- Rang du journal H15 : `04` (`01` à `03` pris sur `origin/main`).

## Fichiers modifiés

- `docs/claude/plan-journal/H15/2026-11-18-04-dossier-besoin-3-lecture-corpus.md` (nouveau).
- `changelog.d/2026-11-18-dossier-besoin-3-lecture-corpus.md` ; ce handoff.
- Hors dépôt : dossier privé du besoin 3 (section « Étape 2 »), questions et lot du registre, bloc-notes de la session (`b3/`).

## Validations exécutées

- Lecture de production seule, par `scalingo run -d`, transactions en lecture seule annulées ; comptes issus de motifs de texte, donc des ordres de grandeur.
- Avis de Codex : cinq appels à l'aveugle, état conforme.
- T1 partiel : type-check, lint, scoring, plan-journal, decisions, campaign-audit, ancres, anti-secrets (indexé) verts ; suites vitest non jouées, ni en local (worktree sans `npm ci`) ni par le CI (diff de documentation seule, type-check, Vitest, build et E2E sautés). Pas de T2 : documentation seule.

## Problèmes ouverts

- Réponses du responsable à M1 à M5.
- Étape 3 (réunir ce que les réponses décident) : chaque envoi sur accord du responsable.
- Besoin 9 : signature case par case des positions v0.2 ; la session n'y touche pas.
- Le lot `besoin3-dossier-ouvert` reste `pris` ; décision D-xxx sur les parts des strates à rédiger avec J3-12f.

## Prochaine action exacte

1. CI de la tête (`wn-attendre-ci.mjs`, seul `0` vaut). Revue PR-Agent prouvée, sinon `wn-reviewer` sur le sha de tête ; un verdict par remarque. Relire la boîte B, puis « prête @<sha> ».
2. Au merge, lot `besoin3-lecture-corpus` à `fait` ; s'arrêter aux réponses M1 à M5.

## Interdits encore actifs

- Aucun texte de claim, aucune valeur, aucun seuil, aucun nom de rubrique au dépôt, ni dans les tests, ni dans les messages de commit (`D-251` §4, `D-325` §5).
- Aucune règle, aucun seuil, aucune dose ni aucun poids inventés. Aucun code clinique avant signature et décision ; J3-12f applique.
- Aucune ingestion sans accord pour chaque envoi. Étiquetage délégué sur les claims `VALIDE` seulement ; la signature ne se délègue pas.
- Aucune migration ; pas de `prisma format`. Production lue seulement par `scalingo run -d`. L'URL des dossiers privés reste hors dépôt.
