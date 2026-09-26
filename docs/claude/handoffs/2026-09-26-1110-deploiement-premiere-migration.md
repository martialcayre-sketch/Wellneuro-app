# Handoff — 2026-09-26 — D-248 : première migration sous le déployeur, observation remplie

## 1. Branche et état Git

`docs/d248-premiere-migration`, worktree `.claude/worktrees/deploy-anti-recul-lot1`,
partie de `origin/main` à `5d0344b8` (#1226, en service, migration appliquée).

## 2. Objectif

Consigner dans D-248 la première migration livrée sous le déployeur GitHub
Actions et le décompte de l'arbitrage n° 3, désormais rempli.

## 3. Décisions prises

- Le décompte compte `5d0344b8` comme le déploiement avec migration : livré
  par `release-db` à l'approbation, migration constatée par conteneur.
- La retenue n'ayant pas été exercée en production (approbation avant la fin
  du CI de `main`), elle est notée « non exercée », pas rejouée : les bancs la
  tiennent, et l'écart « `release-db` ne lit pas le CI » est déjà routé au
  lot 4.

## 4. Fichiers modifiés

`docs/DECISIONS.md` (D-248 : statut, « Première migration sous le
déployeur ») · `changelog.d/2026-09-26-deploiement-premiere-migration.md` ·
`docs/claude/SESSION_LOG.md` · ce handoff.

## 5. Validations exécutées

- Run `release-db` 36230679362 vert : déploiement `e2d1dd47`, garde « dernier
  déployé », `WN_RELEASE_DB_OK`, « Schéma à jour, constaté depuis la base ».
- Run du déployeur 36231385539 vert : « Abstention — déjà en service ».
- Conteneur, lecture seule : `questionnaire_reponses_id_assignation_idx`
  présent (btree), migration appliquée en une tentative, aucune en échec.
- Arbres de `5d0344b8` et de la tête de PR `0fc95765` identiques (`28c97a18`).
- `npm run check` (T1) vert.

## 6. Problèmes ouverts

- Lot 4 de D-248 (sur validation du responsable) : garde anti-recul de
  `release-db` et lecture de la « première ligne » ; `release-db` et le
  dispatch `action=deployer` qui ne lisent pas le CI de la tête ;
  `.claude/rules/pr-revue-et-release-db.md` §3-4 et §5.6, et
  `.claude/rules/db-prisma.md` (« l'auto-deploy Scalingo déploie ») ; écart
  C1 avant de lever « un merge à la fois ».
- `docs/claude/campagnes/FILE_ATTENTE.md` porte une dette « milestone sans
  CHECK » périmée (livrée par D-114 le 2026-08-28).

## 7. Prochaine action exacte

1. Merger cette PR seule ; constater la tête en service.
2. Soumettre le lot 4 au responsable.

## 8. Interdits encore actifs

- « Un merge à la fois » jusqu'au lot 4, et rien derrière une migration avant
  que `release-db` ait conclu au vert.
- Constater le CI de `main` vert sur la tête avant une approbation
  `release-db` ou un dispatch `action=deployer`.
- Retour arrière de la bascule : revert du code de #1222 d'abord,
  `--auto-deploy` ensuite, puis `action=deployer`.
