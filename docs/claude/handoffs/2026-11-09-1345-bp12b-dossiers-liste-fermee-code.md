# Handoff — 2026-11-09 — BP-12b (F09), PR 7 : iode et sélénium, polyphénols et antioxydants proposés à l'atelier — code consommateur

## Branche et état du dépôt

- Branche `b-bp12b-dossiers-code`, créée depuis `origin/main` à `664bc25d` (merge de #1942), avancée en `--ff-only` sur `12ae6df4`, dans le worktree `.claude/worktrees/b-bp12b-dossiers-liste-fermee` (session concurrente, cycle en `git`/`gh` direct ; après le merge de #1942, le worktree avait été détaché de `main` pour la libérer).
- **PR ordinaire** : déclarée « prête @sha » en commentaire de PR pour l'intégrateur (`D-373`, `D-454`). La session ne la merge pas.
- Aucune migration, rien sous `web/src/lib/clinical/`, aucun chemin gelé : pas de release-db.

## Objectif

PR 7 de LOT-28 (D-464 §3, point 2) : après l'application constatée de la migration de la PR 6, faire proposer et accepter par le code les deux dossiers entrés dans la liste fermée.

## Décisions prises

- **PR 6 (#1942) mergée le 2026-11-09 à 12:09 UTC** (squash `664bc25d`), au créneau donné par le responsable (« maintenant »). Avant le merge, l'étape 7 bis de `wn-merge` a été jouée :
  - sonde du déploiement : code 0 ;
  - aucune migration hors service ;
  - contrôle sur l'arbre fusionné : code 0 (165 gardes) ;
  - aucun chevauchement.
- Toujours avant le merge, D-467 et D-468, entrées dans `main` le matin même, modifiaient le régime du merge. Le responsable a confirmé le merge après exposé de leur effet, nul pour cette PR : CodeRabbit avait revu la tête, et le run release-db conclut désormais au vert.
- La sonde release-db a rendu 0 juste avant le merge.
- **Release-db 42614609065** : approuvée par le responsable. Run vert (D-467), sentinelle `WN_RELEASE_DB_OK id=42614609065-1`, et le one-off de la release a appliqué `20261108230000_positions_expert_dossiers_v2`.
- **Constat par conteneur** (lecture seule) :
  - one-off-4081 : conteneur sur `664bc25d` ; 140 migrations appliquées, aucune inachevée ; contrainte `positions_expert_versions_dossier_ferme` = liste à sept ; aucune version de position ;
  - one-off-3571 : `prisma migrate status` → « Database schema is up to date! » ;
  - première ligne de `scalingo deployments` : `664bc25d` = tête de `main`.
- La garde de parité est volontairement **un préfixe**, pas une égalité : entre la migration d'un futur dossier et son code, la base en accepte un de plus que la route (D-464 §5). Une égalité stricte aurait fait rougir la future PR de migration.

## Fichiers modifiés

- `web/src/lib/positions-expert/vocabulaire.ts` : `DOSSIERS_POSITION` (sept valeurs, ordre du CHECK) et `LIBELLES_DOSSIERS` (« Iode et sélénium », « Polyphénols et antioxydants ») ; commentaire de la liste mis à jour.
- `web/src/lib/positions-expert/dossiersListeFermee.guard.test.ts` (neuf) : garde de parité avec la dernière migration qui pose la contrainte, et libellés. C'est un fichier `guard` parce qu'il balaie `prisma/migrations` : le contrôle sur l'arbre fusionné l'exige (`wn-controle-fusion`, BANCS_BALAYAGE).
- `web/src/app/api/praticien/positions-expert/routes.test.ts` : l'exemple hors liste devient `omega_3`, plus un quasi-homonyme et une casse ; les deux dossiers entrants sont admis (200) et transmis tels quels au module.
- `web/src/lib/positions-expert/positionsExpert.pg.test.ts`, cas 10 :
  - versement réel dans les deux dossiers ;
  - `omega_3` refusé par la base (23514, nom de la contrainte) ;
  - liste du code lue contre `pg_get_constraintdef`.
- `changelog.d/2026-11-09-positions-expert-dossiers-code.md` ; `docs/claude/plan-journal/F09/2026-11-09-01-dossiers-liste-fermee-code.md` (rang relu sur `origin/main` : aucun fragment F09 ce jour-là).
- Ce handoff. Hors dépôt : ligne p27 de la page BioFlow.

## Validations exécutées

- Bancs `positions-expert` (lib et routes) : 122 tests verts, plus le banc sur base réelle, sauté sans sa base.
- Banc sur base réelle (`positionsExpert.pg.test.ts`, base locale du worktree, `DB_POOL_MAX=4`) : 10 tests sur 10, dont le cas 10.
- Mutation : l'ordre d'iode et de polyphénols inversé dans `DOSSIERS_POSITION` fait rougir la garde de parité ; fichier restauré.
- Atelier à l'écran, en local : `next dev`, drapeau `WN_POSITIONS_EXPERT` allumé, session praticien fabriquée comme dans les E2E. La page rend 200, et la liste « Dossier de preuve » propose `fer`, `vitamine_d`, `zinc`, `magnesium`, `b9_b12`, `iode_selenium` et `polyphenols_antioxydants`, avec leurs libellés. Aucun versement n'a été fait.
- T1 `check:rapide` vert (16 étapes, 3 sautées).
- T3 `npm run test:worktree`, en deux passes :
  - première passe rouge sur un seul test, sans rapport avec la PR : un dépassement de 5 s dans `ProtocolMiniBuilder.test.tsx` (cockpit) sous la charge de la suite complète. Joué seul, le fichier est vert (94 tests sur 94, 4,8 s) ;
  - seconde passe verte en 10 min 33 s : Vitest (16 569 tests), « No difference detected », contrats SQL, bancs à deux sessions, build, E2E (357).
  Le déplacement de la garde vers un fichier `guard` est postérieur à T3 ; T1 complet l'a rejoué.
- T1 complet (`npm run check`) : son banc de parité de `wn-controle-fusion` a imposé le fichier `guard` ; vert après le déplacement.
- La branche a été avancée en `--ff-only` sur `12ae6df4` (#1951, objectif, sans chevauchement) avant le commit.

## Problèmes ouverts

- Aucun pour le code. Les seize positions des deux dossiers et les arbitrages des couples cités en D-464 §1 attendent les gestes du responsable à l'atelier.

## Prochaine action exacte

1. CI (`wn-attendre-ci`), puis revue sur la tête : CodeRabbit, sinon Copilot si son quota est présumé (D-468), sinon PR-Agent prouvé. Chaque remarque reçoit son verdict.
2. Commentaire « prête @<sha> » sur la PR, avec le chemin de ce handoff. L'intégrateur merge.
3. Côté responsable : verser et signer les positions des deux dossiers à l'atelier.

## Interdits encore actifs

- Production en lecture seule.
- Aucun texte de position ni de claim au dépôt (D-251 §4).
- Aucun versement, aucune signature, aucun arbitrage par l'assistant.
- Pas de `prisma format`.
- Pas de merge de cette PR par la session (intégrateur).
