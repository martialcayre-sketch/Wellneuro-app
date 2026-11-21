# Handoff — 2026-11-18 — dossier du besoin 3 ouvert ; besoin 9 : étiquetage constaté, contre-revue traitée, positions v0.2 (D-312, H15), lot de la file B

## Branche et état Git

- Branche `docs/besoin3-dossier-ouvert`, créée sur `origin/main` ff6aa26e (#2244). Worktree `.claude/worktrees/agent-a81c34a8d1130b0ce`.
- Session concurrente (file B), mission « 12 besoins, séquentiel » du 2026-11-18 : le besoin 3 s'ouvre en entorse assumée, avec l'accord explicite du responsable, pendant que le besoin 9 attend ses signatures. `git` et `gh` en direct.

## Objectif

Étape 1 du dossier du besoin 3 au gabarit des besoins 1, 4, 5 et 9 (état initial lu dans le code, dossier privé, questions T1 à T3) ; consigner dans le même lot de doc ce qui restait du besoin 9 (confirmation d'auteur, étiquetage constaté, contre-revue traitée, positions v0.2) et la réponse sur les parts des strates. Documentation seule.

## Décisions prises

- Besoin 9 : le responsable confirme être l'auteur de la validation en série des 107 claims (2026-11-16, 23 h 35 à 23 h 40 UTC). Étiquetage appliqué sur sa session et constaté (`one-off-5980`, 179 sur 179). Deux claims du cours déjà au besoin 2 gardent leur rubrique et portent les besoins 2 et 9 : l'atelier remplace les clés, la liste préparée les aurait écrasés.
- Correction de `2026-11-18-01` : le conteneur qui a lu les statuts des 14 claims ajoutés (notices 0601 et 0622) n'a pas été conservé ; l'écart 93/107 est expliqué et clos. Les deux P2 de `wn-reviewer` sur #2243 sont repris ici.
- Contre-revue de Codex du besoin 9 : GO avec corrections, huit constats dont trois P1. Verdict par constat au dossier privé ; positions v0.2 (P1 à P35) dans un nouvel onglet ; `verdicts-v01.txt` et `positions-v02.txt` au dépôt privé des revues. Deux constats routés à J3-12f (message au registre).
- Parts des strates (`20261118-2132-b`, tranchée par le responsable, contre l'avis de Codex) : égalité par besoin, convention de modèle, appliquée par J3-12f ; plafond de `D-106` = question séparée, plus tard. Rapport de recherche déposé au dépôt privé des revues (`ponderation-strates/`). La décision D-xxx se rédige avec J3-12f.
- Besoin 3 : lot `besoin3-dossier-ouvert` (file B, ordre 96) ; questions `20261118-2220-b` à `2222-b` avec avis de Codex à l'aveugle (A, A, B, confiance forte), ouvertes.
- Rangs du journal H15 : `02` (besoin 3) et `03` (besoin 9), `01` étant déjà pris sur `origin/main`.

## Fichiers modifiés

- `docs/claude/plan-journal/H15/2026-11-18-02-dossier-besoin-3-ouvert.md` et `2026-11-18-03-dossier-besoin-9-contre-revue-positions-v02.md` (nouveaux).
- `docs/claude/PLAN_WELLNEURO.md` : ligne « dossiers des autres besoins », dernière colonne.
- `changelog.d/2026-11-18-dossier-besoin-3-ouvert-et-besoin-9-v02.md` ; ce handoff.
- Hors dépôt : dossiers privés des besoins 3 et 9, dépôt privé des revues, carnet, questions et messages du registre, bloc-notes de la session (`b3/`, `b9/`).

## Validations exécutées

- Besoin 3 : lecture du code seulement, aucune lecture de production. Avis de Codex : trois appels, état conforme.
- Besoin 9 : constat d'étiquetage en lecture seule, transaction annulée (`one-off-5980`). Contre-revue : chaque constat recoupé avec le texte des claims (C1 à C7 exacts ; C8 est une réserve de procédure).
- Anti-secrets et T1 complet : résultats donnés dans la PR. Pas de T2 : documentation seule.

## Problèmes ouverts

- Besoin 9 : signature case par case des positions v0.2 par le responsable ; éventuellement une seconde relecture de Codex de la v0.2 ; la règle du guide (P26) reste non signable en l'état.
- Besoin 3 : réponses du responsable à T1, T2 et T3. Le corpus n'est pas encore lu pour ce besoin.
- Parts des strates : décision D-xxx à rédiger avec J3-12f (numéro réservé à la rédaction).
- Le lot `besoin9-dossier-etape4` reste `pris` tant que les signatures manquent.

## Prochaine action exacte

1. CI de la tête (`wn-attendre-ci.mjs`, seul `0` vaut). Revue PR-Agent prouvée, sinon `wn-reviewer` sur le sha de tête (`D-448`) ; un verdict par remarque. Relire la boîte B, puis « prête @<sha> ».
2. Au merge : le lot `besoin3-dossier-ouvert` passe à `fait` si T1 à T3 sont répondues, sinon reste `pris`.
3. Ensuite : étape 2 du besoin 3 (lecture du corpus par conteneur), après les réponses T1 à T3.

## Interdits encore actifs

- Aucun texte de claim, aucune valeur, aucune borne, aucun seuil, aucun nom de rubrique au dépôt, ni dans les tests, ni dans les messages de commit (`D-251` §4, `D-325` §5).
- Aucune règle, aucun seuil, aucune dose ni aucun poids inventés. Aucun code clinique : `BESOIN_SOURCES`, convergence, parts des strates relèvent de décisions appliquées par J3-12f.
- Aucune ingestion sans accord pour chaque envoi. Étiquetage délégué sur les claims `VALIDE` seulement ; la signature ne se délègue pas (`DC-16`).
- Aucune migration ; pas de `prisma format`. Production lue seulement par `scalingo run -d`. L'URL des dossiers privés et du dépôt des revues reste hors dépôt.
