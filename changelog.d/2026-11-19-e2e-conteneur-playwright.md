### CI : l'E2E tourne dans le conteneur officiel de Playwright, sans apt (2026-11-19)

- Le job `e2e` de `ci.yml` et `visual-baselines.yml` tournent dans `mcr.microsoft.com/playwright:v1.63.0-noble`.
  Navigateurs et bibliothèques système y sont déjà : le CI n'appelle plus apt et ne télécharge plus de navigateur.
- Trois pannes du même mois ne touchent plus l'E2E : le miroir Azure muet (2026-11-11), le miroir EC2 trop lent
  (2026-11-19, installation expirée à 10 min, trois tentatives sur #2254) et le passage d'`ubuntu-latest` à 26.04
  (WebKit sans libicu74, 175 tests rouges). L'épinglage sur `ubuntu-24.04` de #2261 est levé : l'OS des navigateurs
  est celui de l'image.
- Un relais TCP garde `DATABASE_URL` sur `localhost` dans le conteneur : le service y répond à l'hôte `postgres`, et
  `supabasePoolSsl` forcerait TLS vers un hôte non local. Le code applicatif ne change pas.
- `scripts/wn-playwright-apt.mjs` est retiré, avec son exception de périmètre. `scripts/ci-invariants.test.mjs`
  exige désormais le tag du conteneur égal à la version de `@playwright/test` du lock : une montée de Playwright
  sans le conteneur rougit `controles`.
