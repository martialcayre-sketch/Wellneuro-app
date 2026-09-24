# Handoff — 2026-09-24 — D-248 lot 1 : la production observée, un recul se voit

## 1. Branche et état Git

`worktree-deploy-anti-recul-lot1`, worktree
`.claude/worktrees/deploy-anti-recul-lot1`, partie de `origin/main` à
`60e82971` (tête en production, constaté).

## 2. Objectif

Premier des quatre lots de `D-248` : détecter mécaniquement un recul de
production (code en service ancêtre strict d'un commit déjà mis en service),
sans rien déployer.

## 3. Décisions prises

- `D-248` : (a) déploiement par GitHub Actions, auto-déploiement coupé + (d)
  observation planifiée. Écartés : check « obsolète » (interblocage D-102
  recréé), merge queue / `strict` (ne sérialise pas les fins de build).
- Arbitrages du responsable : jeton actuel du compte dans `deploy-production`
  sans reviewers ; ordre code/schéma hors périmètre (D-087 inchangé) ; lot 4
  après l'incident 2 rejoué + 5 déploiements verts dont un avec migration ;
  lots validés un par un.
- La version en service = le déploiement qui FINIT en dernier (DATE +
  DURATION), pas la première ligne de `scalingo deployments`.
- Une tête pas encore déployée n'est jamais rouge (run planifié attaché au
  commit de tête, que Scalingo attend probablement).

## 4. Fichiers modifiés

Créés : `.github/workflows/deploiement-production.yml` ·
`scripts/wn-deploiement-observation.mjs` (+ `.test.mjs`) ·
`changelog.d/2026-09-24-deploiement-observation-recul.md`. Modifiés :
`docs/DECISIONS.md` (D-248) · `web/package.json` (banc dans
`bancs-outillage-check`).

## 5. Validations exécutées

- Banc : 17/17 ; mutation « tri par début » attrapée (2 rouges), restaurée.
- Script joué sur la vraie production (lecture seule) : conforme, `60e82971`
  en service.
- T1 (`npm run check`) vert : 430 tests, anti-secrets OK.
- Non exécuté : le workflow lui-même (il n'existe sur GitHub qu'une fois mergé
  — un `schedule` ne tourne que sur la branche par défaut).

## 6. Problèmes ouverts

- **L'environnement `deploy-production` doit exister AVANT le merge**, avec la
  restriction à `main` et le secret : un workflow qui cite un environnement
  absent le fait créer par GitHub, SANS restriction de branche.
- Non vérifié : Scalingo attend-il le check du run planifié ? À observer au
  premier merge qui croise un run.
- Défaut latent : la garde de `release-db` lit la première ligne de
  `deployments` (ordre de début). Sans objet après le lot 4, non corrigé.

## 7. Prochaine action exacte

Le responsable crée l'environnement et son secret, puis la PR est mergée ;
premier run lancé par `gh workflow run deploiement-production.yml --ref main`,
verdict constaté. Ensuite, lot 2 : job de déploiement en `workflow_dispatch`,
répétition à vide sur une tête déjà déployée.

## 8. Interdits encore actifs

- Aucune commande d'écriture Scalingo dans `deploiement-production.yml` avant
  le lot 2 (invariant du banc).
- `--no-auto-deploy` est un geste du responsable, au lot 3 seulement.
- La discipline « un merge à la fois, constater le déploiement » reste en
  vigueur jusqu'au lot 4.
