# Handoff — 2026-09-25 — D-248 lot 3 : la bascule vers GitHub Actions

## 1. Branche et état Git

`wn-deploiement-lot3-bascule`, worktree `.claude/worktrees/deploy-anti-recul-lot1`,
partie de `origin/main` à `eb660e3f` (prérequis `release-db` en service).

## 2. Objectif

Couper l'auto-déploiement Scalingo et faire de GitHub Actions le seul déployeur
du code, sans changer le régime code/schéma de D-087.

## 3. Décisions prises

- Déclencheur : fin VERTE du CI d'un push sur `main` de ce dépôt
  (`workflow_run`), et dispatch ; jamais `push` (avant le CI).
- Commit porteur d'un run `release-db` non conclu au vert : retenu, vert, sans
  écriture — `release-db` le déploie à l'approbation.
- `AUTO_DEPLOIEMENT_ACTIF=false` avec le déclencheur (invariant).

## 4. Fichiers modifiés

`.github/workflows/deploiement-production.yml` (déclencheur `workflow_run`,
`if:` filtré, `permissions: actions: read`, `WN_SHA`, `GH_TOKEN`) ·
`scripts/wn-deploiement-deployer.mjs` (drapeau, retenue release-db, `WN_SHA`) ·
`scripts/wn-deploiement-deployer.test.mjs` · `docs/DECISIONS.md` (D-248) ·
`changelog.d/2026-09-25-deploiement-bascule-lot3.md` · `docs/claude/SESSION_LOG.md` ·
ce handoff.

## 5. Validations exécutées

- Bancs déployeur + observation : 70/70. Mutations : 10 (déclencheur, filtres,
  drapeau, retenue, permissions) + 11 (correctifs de revue) + suite du lot 2 —
  aucune survivante.
- Revue adverse multi-agents (15 agents) : 7 constats confirmés, 4 réfutés ;
  tous corrigés, dont « un run dépassé juge la tête » (la concurrence GitHub
  évince un run en attente) et la vérification d'un commit plus neuf livré par
  la branche.
- Non constaté : la bascule réelle (premier déploiement par `workflow_run`,
  `manual-deploy` avec l'auto-déploiement coupé) — après merge.

## 6. Problèmes ouverts

- Un commit sans migration mergé après un commit de migration en attente
  d'approbation part au déploiement avec son code (inchangé ; question D-087).
- `.claude/rules/pr-revue-et-release-db.md` §3-4 et §5.6 décrivent encore le
  régime d'auto-déploiement : à réécrire au lot 4.
- Lot 4 : garde anti-recul de `release-db` et lecture de la « première ligne ».

## 7. Prochaine action exacte

1. Le responsable : `scalingo --region osc-fr1 --app wellneuro integration-link-update --no-auto-deploy`.
2. Merger la PR ; le CI de `main` déclenche le déployeur ; constater la tête en
   service (`node scripts/wn-deploiement-observation.mjs`).
3. Rejouer volontairement l'incident 2 (deux PR mergées à deux minutes), puis
   cinq déploiements verts dont une migration, avant le lot 4.

## 8. Interdits encore actifs

- La discipline « un merge à la fois » reste jusqu'au lot 4.
- Retour arrière : `integration-link-update --auto-deploy` ET revert de la PR
  (drapeau et déclencheur ensemble).
