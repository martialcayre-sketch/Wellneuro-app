# Handoff — 2026-10-29 — D/51 : `questionnaires.actif` rattrape le catalogue de code (D-395)

## Branche et état du dépôt

- Branche `lot/file-d-d51-actif-questionnaires`, partie de `origin/main`
  14142760 (contient #1783 et #1782) ; worktree `file-d1-suite`, session
  concurrente, cycle en `git`/`gh` direct.
- **Migration de données** : la session suit la PR jusqu'au constat par
  conteneur (exception migration de D-373). Aucun changement de
  `schema.prisma`. Aucun fichier sous `web/src/lib/clinical/`, ni
  `indicationsBiologieV1.ts`.

## Objectif

File D, ligne sans rang D/51 : `questionnaires.actif` périmé en production.
Faire trancher l'écriture ou l'écart, puis livrer.

## Décisions prises

**D-395** (réservée par `wn-reserver-decision.mjs`), arbitrage du
responsable du 2026-10-29 sur la question `20261029-2319-d` de la liste
commune (nature migration) :
- **Écrire**, et inclure `Q_ALI_09`. Ont été écartés « consigner l'écart »
  (proposé en recommandation, puisque le service n'en dépend pas) et
  « corriger les cinq seuls ».
- Faits lus en production le 2026-10-29 (conteneur `one-off-3782`, lecture
  seule, en agrégats) :
  - 67 définitions, toutes `updated_at` 2026-08-06 14:59 ;
  - 10 suspendues : les six visées, plus `Q_FIB_03`, `Q_PED_02`, `Q_PED_03`
    et `Q_URO_02` ;
  - 1 pack actif et 7 inactifs, dont aucun ne porte les cinq de D-066 ;
  - `WN_AGENDA_ALI=true` en production.
- Borne nommée (§2) : `Q_ALI_09` suit le drapeau tel qu'il est à la date de
  la migration. S'il s'éteint, il faudra une nouvelle décision.

## Fichiers modifiés

- Nouveaux :
  - `web/prisma/migrations/20261029230000_questionnaires_actif_reactives/migration.sql`,
    un seul UPDATE filtré sur les six ids et `NOT "actif"` ;
  - `web/src/lib/questionnaires-actif-rattrapage.migration.test.ts`, qui lit
    le SQL livré (4 cas).
- Clôture :
  - `docs/DECISIONS.md` (D-395) ;
  - `changelog.d/2026-10-29-d51-questionnaires-actif.md` ;
  - `docs/claude/PLAN_WELLNEURO.md`, deux lignes D/51 (table de la file D et
    §8) ;
  - ce handoff.
- Hors dépôt, sur la page « Suivi de la file D » :
  - question `20261029-2319-d` passée en `repondue` (D-395) ;
  - ligne d51 passée en `en_cours`.

## Validations exécutées

- Banc neuf vert. Une mutation (GRANT ajouté à la migration) le fait rougir,
  puis le fichier a été restauré.
- T1 (`check:rapide`) vert.
- T3 (`npm run test:worktree`, sortie redirigée) vert en 7 min 35 s :
  - Vitest 15 435 passés ;
  - « Dérive schéma ↔ migrations » : *No difference detected* ;
  - contrats SQL verts ;
  - E2E 303 passés.

  Il a été joué avant les deux retouches de revue, qui ne touchent que le
  banc et deux textes ; le banc a été rejoué après elles.
- Revue `wn-reviewer` (diff indexé, sans checkout) : **GO**, aucun
  constat bloquant.
  - Corrigés :
    - textes qui surestimaient le banc → le banc exige désormais une seule
      instruction hors commentaires ;
    - fragment de handoff absent → ce fichier.
  - Écartés, avec motif :
    - test 3 redondant avec le test 1 : il est conservé, parce qu'il nomme
      l'interdit ;
    - `CURRENT_TIMESTAMP` sans fuseau : aucun lecteur de `updated_at`, et
      les précédents font de même ;
    - contrat SQL de CI avec fixture : facultatif vu le risque, la preuve
      d'effet est le constat par conteneur ;
    - en-tête de `packs_instruments_suspendus_v1.sql` devenu historique :
      changement minimal, et le point est tranché par D-395 §2.
  - Assumé en commentaire : le test 2 lie la migration au catalogue courant.
- Passe Codex : la migration est P0 (`POLITIQUE_REVUE.md`). Cette passe est
  un geste manuel du responsable, à consigner sur la PR.

## Problèmes ouverts

- Release-db non jouée : la migration n'est pas appliquée tant que le
  constat ne l'a pas montré.
- Après le constat, il faudra une petite PR de doc : ligne D/51 du plan
  close, ligne sortie du §8, d51 passée à `fait`, question `close`.

## Prochaine action exacte

1. PR (`--body-file`), puis CI par `wn-attendre-ci.mjs <N>` en fond, et
   revue CodeRabbit (ou PR-Agent prouvée, D-393). Chaque commentaire reçoit
   son verdict.
2. Avant le merge : passe Codex, sonde `wn-sonde-release-db.mjs <N>` à `0`,
   puis `gh pr merge --squash --match-head-commit`.
3. Approbation release-db par le responsable, puis sentinelle
   `WN_RELEASE_DB_OK id=<run>`.
4. Constat par conteneur :
   - `migrate status` *up to date* ;
   - `SELECT questionnaire_id FROM questionnaires WHERE NOT actif` doit
     rendre exactement `Q_FIB_03`, `Q_PED_02`, `Q_PED_03`, `Q_URO_02` ;
   - aucun pack actif ne porte `Q_ALI_09` (question de la revue).
5. Première ligne de `scalingo deployments` = tête de `main`.

## Interdits encore actifs

- Production : lecture par conteneur seulement, écriture par release-db
  seulement.
- Jamais `prisma format`, et pas de `prisma generate` en concurrence.
- Aucun identifiant ni nom de dossier dans le dépôt.
- Rien sous `web/src/lib/clinical/`.
- Pas de code consommateur avant le constat. Ici, il n'y en a pas.
