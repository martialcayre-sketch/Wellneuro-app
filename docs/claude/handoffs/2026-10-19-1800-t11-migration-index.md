# Handoff — t11, PR 1 sur 2 : migration de l'index de révision

## Branche et état du dépôt

- Branche `t11-migration`, partie de `origin/main` 6d56ea8c. Worktree
  `d281-lot3-portail`. PR de migration SEULE (`pr-revue-et-release-db.md` §3) ;
  le code consommateur reste sur `t11-verrou-objectif` (PR 2).

## Objectif

Dette t11 : fermer en base la course entre deux révisions concurrentes d'une
même version d'objectif. Arbitrage du responsable (2026-10-19) : migration
accordée, merge et release-db sans redemander.

## Décisions prises

- Index unique TOTAL sur `supersedes_objectif_id` ; NULL multiples (racines)
  admis. `@@unique` au schéma, map explicite : parité schéma ↔ migrations.
- Constat préalable en production (conteneur `one-off-5565`, lecture seule,
  2026-10-19 14:05) : 10 objectifs, 0 version révisée deux fois. **À refaire
  juste avant l'approbation de release-db** (revue `wn-reviewer`, P2 4).
- Le code en service est compatible avant comme après l'index. Le code
  consommateur (PR 2), lui, ne se merge qu'après l'application de l'index
  CONSTATÉE par conteneur (`D-087`).

## Fichiers modifiés

- `web/prisma/migrations/20261019150000_alli_objectif_supersedes_unique_v1/migration.sql`.
- `web/prisma/schema.prisma` (une ligne `@@unique` + commentaire).
- `web/prisma/checks/alli_objectif_supersedes_unique_v1_negatif.sql` (nouveau),
  `.github/workflows/ci.yml` (une étape).
- Changelog, SESSION_LOG.

## Validations exécutées

- T3 complet vert sur la branche d'ensemble (code + migration) : migration
  appliquée, « No difference detected », contrat neuf joué, 282 E2E.
- Revue `wn-reviewer` : go, aucun P0/P1.
- T1 complet et T3 sur cette branche : voir la PR.

## Problèmes ouverts

- Aucun pour la migration.

## Prochaine action exacte

PR, CI, CodeRabbit sur la tête, merge (un à la fois), recompter les doublons
par conteneur, approuver `release-db`, sentinelle liée au run, constat
`migrate status` par conteneur ; puis PR 2 (code).

## Interdits encore actifs

- Pas de `prisma format` ; jamais de merge pendant qu'un release-db attend.
