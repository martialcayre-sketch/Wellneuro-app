# Handoff — 2026-09-25 — D-248 lot 2 : GitHub Actions sait déployer la tête de main

## 1. Branche et état Git

`wn-deploiement-lot2`, worktree `.claude/worktrees/deploy-anti-recul-lot1`,
partie de `origin/main` à `fb72839b` (lot 1 mergé, #1219, en service depuis
11:30:18 UTC le 2026-09-25).

## 2. Objectif

Lot 2 de `D-248` : un job GitHub Actions qui déploie la tête de `main` via
`integration-link-manual-deploy main`, lançable à la main seulement,
auto-déploiement Scalingo encore actif ; puis la répétition à vide.

## 3. Décisions prises

- Calme avant l'écriture et avant la conclusion : aucun build en vol.
- Garde finale (échec volontaire d'un run dépassé) tant que
  `AUTO_DEPLOIEMENT_ACTIF` ; ce drapeau et l'absence de `push` basculent
  ensemble au lot 3 (invariant).
- Concurrence par job ; session CLI effacée en dernière étape.
- Invariants en liste blanche (mentions de `scalingo` dans le workflow,
  appels du binaire dans les scripts, expressions `${{ }}`, étapes qui citent
  le jeton).

## 4. Fichiers modifiés

Créés : `scripts/wn-deploiement-deployer.mjs` (+ `.test.mjs`) ·
`changelog.d/2026-09-25-deploiement-job-dispatch.md` · ce handoff. Modifiés :
`.github/workflows/deploiement-production.yml` (job `deploiement`, inputs,
concurrence par job, effacement de session) · `.github/workflows/ci.yml`
(étape du banc) · `web/package.json` (`bancs-outillage-check`) ·
`scripts/wn-deploiement-observation.mjs` (`analyserToutesLignes`) et son banc ·
`docs/DECISIONS.md` (D-248, lot 2).

## 5. Validations exécutées

- Revue adverse multi-agents avant PR : 9 constats confirmés, 3 réfutés ;
  8 corrigés, 1 routé (lot 3).
- Bancs : 53/53 (déployeur + observation). Mutations : 17/17 attrapées.
- Lot 1 constaté en production : run manuel « en cours » juste après le
  merge, run planifié vert, `fb72839b` en service.
- Observé : le build de `fb72839b` a démarré 2 s après la fin de sa CI ;
  aucun run d'observation n'était EN COURS à cet instant — la question
  « Scalingo attend-il un run planifié en cours ? » reste ouverte.

## 6. Problèmes ouverts

- **Prérequis du lot 3** : `release-db` doit attendre le calme avant de
  déclencher (sinon deux builds en parallèle — détecté, pas empêché).
- Lot 4 : la garde de `release-db` lit la première ligne de `deployments`.
- Le classifieur de permissions a refusé `gh workflow disable` : la
  répétition à vide (`gh workflow run … -f action=deployer`) pourrait l'être
  aussi — geste du responsable dans ce cas.

## 7. Prochaine action exacte

Après merge et déploiement du lot 2 : `gh workflow run
deploiement-production.yml --ref main -f action=deployer -f forcer=true`,
suivre le run, constater la nouvelle ligne `success` de la tête dans
`scalingo deployments` et le verdict « Tête de main déployée ».

## 8. Interdits encore actifs

- Pas de `push` sur le job de déploiement ni de `--no-auto-deploy` avant le
  lot 3 et son prérequis `release-db`.
- La discipline « un merge à la fois, constater le déploiement » reste en
  vigueur jusqu'au lot 4.
- La garde anti-recul de `release-db` reste en place jusqu'au lot 4.
