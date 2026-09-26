# Handoff — 2026-09-26 — Index sur questionnaire_reponses.id_assignation, première migration sous le déployeur Actions

## 1. Branche et état Git

`wn-index-reponses-assignation`, worktree `.claude/worktrees/deploy-anti-recul-lot1`,
partie de `origin/main` à `05f2ac41` (#1225, en service).

## 2. Objectif

Livrer le report nommé au LOT-07 de l'agenda alimentaire (index sur
`questionnaire_reponses.id_assignation`), demandé par le responsable le
2026-09-26 — et, par lui, le déploiement avec migration qui manque au décompte
de l'arbitrage n° 3 de D-248 avant le lot 4.

## 3. Décisions prises

- Choisie parmi trois candidates de la file (index des clés étrangères C5,
  resserrage des CHECK `btrim` de D-111) : index seul, aucune colonne, aucune
  décision clinique, aucun code.
- Nom explicite `questionnaire_reponses_id_assignation_idx`, identique au nom
  par défaut de Prisma ; `@@index` posé à la main (jamais `prisma format`).
- `id_questionnaire` et `supersedes_reponse_id` restent sans index propre :
  hors de ce report.

## 4. Fichiers modifiés

`web/prisma/migrations/20260926090000_questionnaire_reponses_index_assignation/migration.sql`
· `web/prisma/schema.prisma` (une ligne `@@index`) ·
`changelog.d/2026-09-26-index-reponses-assignation.md` ·
`docs/claude/SESSION_LOG.md` · ce handoff.

## 5. Validations exécutées

- Production lue deux fois par conteneur, transaction `READ ONLY` annulée :
  221 lignes, trois index sur la table, nom libre dans tout le schéma
  (`to_regclass` NULL), identifiants de 28 octets au plus, aucune migration en
  échec, dernière appliquée `20260924090000`.
- `npx prisma validate` ; T3 complet vert (`T3-EXIT=0`) : migration appliquée
  sur base éphémère, « No difference detected » à la dérive, contrats SQL,
  213 E2E.
- Revue adverse (trois relecteurs dont `wn-reviewer`) : GO sous réserve, aucun
  bloquant ; commentaires SQL et changelog corrigés avant le premier commit
  (une migration appliquée est figée par son empreinte).

## 6. Problèmes ouverts

- `release-db` déploie `main` sans lire le CI du commit approuvé (déjà au
  RUNBOOK) ; sa garde anti-recul est toujours active — routés au lot 4.
- Le commit de cette migration a été refusé à Claude par le classifieur de
  permissions (« Modify Shared Resources ») : commit par le responsable, ou
  autorisation explicite.

## 7. Prochaine action exacte

1. Merger seul ; AUCUN autre merge jusqu'à la fin de `release-db`.
2. Attendre le CI vert de ce commit sur `main`, puis constater que le run
   « Déploiement production » conclut « Retenu » sans écrire
   (`scalingo deployments` inchangé).
3. SEULEMENT ENSUITE : le responsable approuve `release-db`.
4. Constater par conteneur : `questionnaire_reponses_id_assignation_idx` dans
   `pg_indexes`, migration appliquée (agrégation par nom), déploiement de
   `release-db` en service ; consigner à D-248 (décompte 5/5, avec migration).

## 8. Interdits encore actifs

- « Un merge à la fois » jusqu'au lot 4, et rien derrière une migration avant
  que `release-db` ait conclu au vert.
- Constater le CI vert de la tête avant toute approbation `release-db`.
- Jamais `prisma format` ; jamais de modification de `migration.sql` après
  application.
