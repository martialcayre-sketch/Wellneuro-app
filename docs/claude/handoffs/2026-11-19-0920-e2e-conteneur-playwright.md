# Handoff — 2026-11-19 — CI : E2E dans le conteneur officiel de Playwright, sans apt (intégrateur)

## Branche et état Git

- Branche `fix/e2e-conteneur-playwright`, créée sur `origin/main` c60501a2 (#2254 mergée). Worktree `../wt-e2e-conteneur`, ouvert par la session intégratrice sur l'ordre du responsable (« trouve une correction efficace et definitive »).

## Objectif

Rendre l'installation des navigateurs de l'E2E insensible aux miroirs Ubuntu et à l'image du runner. Ce mois-ci, trois pannes : le miroir Azure muet le 2026-11-11, le miroir EC2 trop lent le 2026-11-19 (10 min expirées, trois tentatives sur #2254), et `ubuntu-latest` passé à 26.04 (WebKit sans libicu74, `main` rouge, corrigé à titre provisoire par #2261).

## Décisions prises

- Le job `e2e` et `visual-baselines.yml` tournent dans `mcr.microsoft.com/playwright:v1.63.0-noble` (image qui contient git, les navigateurs à la version du lock et leurs dépendances). Plus aucun apt, aucun téléchargement de navigateur. `runs-on` revient à `ubuntu-latest`.
- Base : dans un conteneur, le service répond à l'hôte `postgres`. Or `supabasePoolSsl` force TLS vers tout hôte non local. Un relais TCP en Node garde `localhost:5432` ; `DATABASE_URL` reste la même chaîne. Écartés : `?host=postgres` (repose sur l'analyse de l'URL par pg et par Prisma) et toucher `postgres.ts` (code applicatif, sécurité).
- Écarté : un cache des paquets `.deb` (réseau à chaque clé manquée, OS du runner toujours en jeu).
- Garde : `ci-invariants.test.mjs` exige le tag égal à `@playwright/test` du lock, `--ipc=host`, le relais avant les migrations, et aucune installation réintroduite.

## Fichiers modifiés

- `.github/workflows/ci.yml` (job `e2e`, exception de périmètre retirée), `.github/workflows/visual-baselines.yml`.
- `scripts/ci-invariants.test.mjs` ; `scripts/wn-playwright-apt.mjs` supprimé.
- `changelog.d/2026-11-19-e2e-conteneur-playwright.md` ; ce handoff.

## Validations exécutées

- `node --test scripts/*.test.mjs` : 883/883. Les deux workflows se lisent en YAML ; ordre des étapes vérifié.
- La preuve qui compte est l'E2E de la PR dans le conteneur et `visual-baselines` lancé sur la branche : voir la PR.

## Problèmes ouverts

- Les polices de l'image peuvent décaler les 8 baselines visuelles. Si l'E2E les rougit, les régénérer par `visual-baselines` sur la branche, les relire, les committer.
- Une montée de Playwright devra changer le tag dans les deux workflows (la garde le rappelle).

## Prochaine action exacte

1. CI vert sur la tête, PR-Agent → `0`, merge, puis vert de `main` constaté.

## Interdits encore actifs

- Aucun changement de `pr_agent.yml`, de `.coderabbit.yaml` ni du code applicatif. Pas de migration.
