# Handoff — 2026-09-25 — D-248 : la bascule du lot 3 est constatée, l'incident 2 est rejoué

## 1. Branche et état Git

`docs/d248-bascule-constatee` (PR #1223), worktree
`.claude/worktrees/deploy-anti-recul-lot1`, partie de `origin/main` à
`e43a40b0` (lot 3 en service). Jumelle : `docs/runbook-deploiement-actions`
(PR #1224), partie du même commit, fichiers disjoints.

## 2. Objectif

Consigner le premier déploiement par GitHub Actions, auto-déploiement coupé,
et rejouer volontairement l'incident 2 (arbitrage n° 3 de D-248) : les PR
#1223 et #1224 sont mergées à environ deux minutes d'intervalle.

## 3. Décisions prises

- La répétition se fait sur deux PR de documentation réelles, utiles et sans
  code : le CI de `main` les juge, le déployeur les livre comme tout merge.
- Une seule entrée SESSION_LOG, dans #1223 : deux ajouts en fin de fichier
  dans deux PR mergées à deux minutes se heurteraient.
- Le résultat de la répétition se consigne dans une PR suivante — il n'existe
  qu'après les deux merges.

## 4. Fichiers modifiés

`docs/DECISIONS.md` (D-248 : statut, « Bascule constatée ») ·
`docs/claude/SESSION_LOG.md` · ce handoff. Dans #1224 : `docs/RUNBOOK.md`
(Déploiement, Contrôle post-déploiement, Rollback).

## 5. Validations exécutées

- Constat de production : run 36182085373 vert (« Tête de `main` déployée »),
  déploiement `5e19edc5` `success`, utilisateur `wellneuro` ; aucune ligne
  `scalingo-platform-scm` pour `e43a40b0` ; observation locale « en service ».
- `npm run check` (T1) vert sur les deux branches.
- Affirmations des deux PR confrontées au code par une vérification
  contradictoire (3 angles, un sceptique par constat, 27 agents) : #1223
  intacte ; six défauts réels dans #1224, tous corrigés avant merge — dont
  l'ordre du retour arrière de la bascule, qui était l'ordre dangereux.

## 6. Problèmes ouverts

- `.claude/rules/pr-revue-et-release-db.md` §3-4 et §5.6 décrivent encore le
  régime d'auto-déploiement : lot 4.
- Garde anti-recul de `release-db` et lecture de la « première ligne » : lot 4.
- Écart C1 (un commit vert dépassé par une tête rouge attend la prochaine tête
  verte) : le lot 4 doit en tenir compte avant de lever « un merge à la fois ».
- Le dispatch `action=deployer` ne lit pas le CI de la tête (il ne le lit que
  s'il est dépassé) : documenté au RUNBOOK ; le faire lire au lot 4 est une
  option, pas une décision.

## 7. Prochaine action exacte

1. Merger #1223, attendre deux minutes, merger #1224.
2. Suivre les deux runs du déployeur ; constater qu'aucun recul n'a lieu
   (`node scripts/wn-deploiement-observation.mjs`, colonne USER, ordre de fin
   des builds) et que la tête finale `main` est en service.
3. Consigner le résultat dans D-248 ; puis cinq déploiements verts dont au
   moins un avec migration avant le lot 4.

## 8. Interdits encore actifs

- Hors cette répétition volontaire, la discipline « un merge à la fois » reste
  jusqu'au lot 4.
- Retour arrière de la bascule (décision du responsable) : revert du CODE de
  #1222 d'abord, auto-déploiement encore coupé ; `--auto-deploy` ensuite ;
  puis `action=deployer`. L'ordre inverse fait tourner l'auto-déploiement à
  côté d'un déployeur sans garde finale (incident 1). Détail : RUNBOOK,
  Rollback (#1224).
- Un dispatch `action=deployer` et l'approbation d'un `release-db` livrent la
  tête sans lire son CI : le constater vert avant.
