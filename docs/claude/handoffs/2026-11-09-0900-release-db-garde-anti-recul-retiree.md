# Handoff — 2026-11-09 — D-467 : retrait de la garde anti-recul de release-db

## Branche et état du dépôt

- Branche `worktree-agent-ae1e95751bcf18c67`, créée depuis `origin/main` à `f7745b0c0` (#1943). Worktree d'agent isolé : cycle en `git`/`gh` direct.
- Lot d'infrastructure CI : un workflow, trois bancs, quatre documents, une décision, un fragment `changelog.d/` et ce handoff. Ni migration ni `schema.prisma` ; rien sous `web/src/lib/clinical/`.
- **Touche `.github/workflows/release-db.yml`** : relève du gel par phases de D-374 (`node scripts/wn-sonde-release-db.mjs <N>`, `0` seul autorise le merge). PR non mergée par cette session.

## Objectif

Appliquer l'arbitrage du responsable du 2026-11-09, option C1 (« C1 : la retirer ») : supprimer l'étape « Garde anti-recul » de `release-db.yml`, qui rendait rouge une release appliquée (run 42528009082, release-db de #1930).

## Décisions prises

- D-467 (numéro réservé par `wn-reserver-decision`) : retrait de la garde ; motif = auto-déploiement coupé depuis le 2026-09-25 (D-248) et workflow qui ne déploie que la tête.
- Préalable vérifié avant édition : dans `release-db.yml`, le seul déploiement est `integration-link-manual-deploy main` (branche, jamais un SHA) ; `scalingo run --detached` (scripts `release-db-scalingo.sh` et `release-db-statut.sh`) ne déploie rien ; aucune autre commande de déploiement, rollback ou redémarrage. Un banc d'invariant le verrouille désormais.
- Le déployeur (`wn-deploiement-deployer.mjs`) garde `classerRunReleaseDb` inchangé : la lecture « rouge après application » reste utile pour les runs antérieurs. Seuls un commentaire et un test de parité changent.
- Le RUNBOOK (retour à l'auto-déploiement) exige de rétablir la garde dans le même revert.
- Historique (fragments, handoffs, journaux, `SESSION_LOG`, `PLAN_WELLNEURO.md`) non réécrit.

## Fichiers modifiés

- `.github/workflows/release-db.yml` (étape supprimée, remplacée par un commentaire de cinq lignes).
- `scripts/release-db-comportement.test.mjs` (quatre bancs de la garde retirés), `scripts/release-db-invariants.test.mjs` (invariant D-467), `scripts/wn-deploiement-deployer.test.mjs` (parité, sans la garde), `scripts/wn-deploiement-deployer.mjs` et `scripts/wn-sonde-release-db.mjs` (commentaire et message).
- `docs/DEPLOIEMENT_RELEASE_DB.md`, `docs/RUNBOOK.md`, `.claude/rules/pr-revue-et-release-db.md` (pièges 2 et 6).
- `docs/decisions/D-467.md`, `changelog.d/2026-11-09-release-db-garde-anti-recul-retiree.md`, ce handoff.

## Validations exécutées

- `node --test scripts/release-db-*.test.mjs scripts/wn-deploiement-deployer.test.mjs scripts/wn-sonde-release-db.test.mjs` : voir la PR (158 sur 158 avant les documents).
- T1 complet (`cd web && npm run check`), `bash scripts/check_no_secrets.sh` : voir la PR.

## Problèmes ouverts

- Le premier run `release-db` après ce merge est la preuve en conditions réelles : un run dépassé par la tête doit finir vert. À constater à la prochaine release.
- La garde finale du déployeur reste en place, éteinte par `AUTO_DEPLOIEMENT_ACTIF = false` : hors périmètre.

## Prochaine action exacte

1. `node scripts/wn-attendre-ci.mjs <N>` (seul le code 0 compte), revue sur la tête, un verdict par remarque.
2. Avant tout merge : `node scripts/wn-sonde-release-db.mjs <N>` (workflow gelé en phase 1 tant qu'un run attend l'approbation).

## Interdits encore actifs

- Ne pas rétablir l'auto-déploiement Scalingo sans rétablir la garde dans le même revert (D-467 §6).
- Ne pas réécrire l'historique qui décrit la garde.
- Rien sous `web/src/lib/clinical/` ; ni migration ni `schema.prisma`.
