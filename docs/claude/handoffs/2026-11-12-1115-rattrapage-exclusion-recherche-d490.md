# Handoff — 2026-11-12 — Corpus : rattrapage de l'exclusion de la recherche (D-490, PR 3 sur 3)

## Branche et état Git

- Branche `b-exclusion-recherche-rattrapage`, dans le worktree
  `.claude/worktrees/b-bp17-cadre`. Avancée par `--ff-only` sur
  `origin/main` c8b6214.
- PR 3 sur 3 de D-490 : **documentation seule**, sans code ni migration. Elle
  est déclarée « prête @<sha> », et l'intégrateur la merge (D-373, D-454).
- Les PR 1 (#1992, migration appliquée) et 2 (#2002, atelier) sont mergées.

## Objectif

Consigner en forme opaque (D-251 §4) le rattrapage fait en production le
2026-11-12, et le mesurer. Le geste lui-même n'appartient pas à cette PR : il a
eu lieu à l'atelier, par délégation.

## Décisions prises

- **D-490** n'est pas modifiée. Les trois réponses du responsable du
  2026-11-11 ne sont pas reposées.
- **Liste proposée à 483 claims** : 481 hors parcours, sans usage explicite,
  plus deux exceptions nominatives. Codex a rendu GO. `0292-003`, rejeté, n'y
  figure pas.
- **Retrait de `0167-023` par le responsable** : le code le cite (indications
  de biologie) et le tient pour épinglé. Le responsable a validé la liste à
  **482 claims, avec délégation**.
- **Geste exécuté par l'assistant** dans Chrome, depuis la session du
  responsable, le 2026-11-12 à 09:30 UTC (10 h 30 à Paris).

## Fichiers modifiés

- `changelog.d/2026-11-12-d490-rattrapage.md` ;
- `docs/claude/plan-journal/F05/2026-11-12-01-rattrapage-exclusion-recherche-d490.md` ;
- `docs/claude/plan-journal/H15/2026-11-12-02-rattrapage-exclusion-recherche-d490.md` ;
- ce handoff.

Au dépôt privé des revues, dans `rattrapage-d490/` :
- `liste-proposee-483.txt`, `liste-validee-482.txt`, `delegation.md` et
  `constat.md`, déposés par la session précédente ;
- `mesure.md`, déposé par cette session.

## Validations exécutées

- **Constat par conteneur** (one-off-8923, session précédente), vert :
  - 482 claims exclus, aucun hors de la liste ;
  - 482 actes « exclure » ;
  - motifs conformes (empreinte md5) ;
  - aucune incohérence entre la colonne et le journal ;
  - témoins `0167-023`, `0245-006`, `0333-043` et `0292-003` non exclus ;
  - prédicat présent dans la fonction.
- **Mesure des résultats rendus** (one-off-6572, lecture seule, `match_count`
  8, seuil 0,55) :
  - les cinq graines de p3m1 (2026-11-11) rendent toujours 8 résultats.
    Avant, 1 à 7 d'entre eux venaient de la liste ; il n'y en a plus aucun, et
    aucune graine ne se rend elle-même ;
  - avec pour graines les 482 claims exclus, aucun claim exclu n'est rendu.
    425 graines rendent 8 résultats ; 57 en rendent moins, dont 11 aucun ;
    moyenne 7,43.
- **Cause des 57 graines sous 8** (one-off-5752, lecture seule) : l'index HNSW
  et le parcours exact forcé (`enable_indexscan` et `enable_bitmapscan` à off)
  rendent les mêmes 57 couples. Le manque vient donc du seuil, et non du filtre
  appliqué après l'index. Réserve : le plan n'a pas été relu par `EXPLAIN`.
- **T1 complet** et `check_no_secrets.sh` : voir la PR.

## Problèmes ouverts

- **Q1 et Q2** (handoff du 2026-11-11), toujours ouvertes pour le responsable,
  sans arbitrage :
  - **Q1** : un claim exclu, remis en attente puis revalidé, revient exclu,
    sans acte nouveau ;
  - **Q2** : le filtre « exclus seulement » n'existe que dans l'onglet
    Validés.
- **Coordination avec la file C (LOT-17, PR 4)** : la marque est désormais
  posée sur 482 claims en production. Refuser une option BP-17 qui cite un
  claim exclu reste leur contrôle. La marque ne fait pas ce refus, parce que
  `claimsValidesAuCorpus` tient ces claims pour valides (D-490 §2).
- Le remontage du panneau après un geste en lot reste routé au §8 du plan
  (handoff du 2026-11-11).

## Prochaine action exacte

1. CI de la tête, puis lecture de la revue (CodeRabbit, sinon Copilot, sinon
   PR-Agent), avec un verdict pour chaque remarque.
2. Déclarer la PR « prête @<sha> » ; l'intégrateur merge.
3. Après le merge :
   - passer la question `20261104-2225-b` à `close` dans la liste commune,
     avec le numéro de la PR ;
   - mettre la mémoire à jour.

## Interdits encore actifs

- Production en lecture seule, par conteneur.
- Ni nouveau marquage, ni rétablissement.
- Aucun texte clinique au dépôt (D-251 §4) : les listes restent au dépôt
  privé.
- Ni signature ni arbitrage par l'assistant ; Q1 et Q2 restent au
  responsable.
- Pas de `prisma format` ; `schema.prisma` inchangé.
- Session concurrente : `git`/`gh` en direct, sans `/wn-*`.
