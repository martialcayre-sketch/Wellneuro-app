### Outillage : cache de compilation Next dans le job `e2e` du CI (H91, temps 2) (2026-11-06)

- Le job `e2e` restaure et sauvegarde `web/.next/cache` avant son build. La
  clé porte le lock, la configuration Next et les sources. La restauration
  partielle (même lock, même configuration) est admise. Le cache saute sur une
  PR documentaire, comme le cache Playwright.
- `web/scripts/build.sh` garde le cache webpack quand
  `WN_GARDER_CACHE_WEBPACK=1`, posée par la seule étape Build d'`e2e`. Sans
  cette variable, il l'efface comme avant : l'image Scalingo reste sous
  2048 Mo (#1001). Arbitrage du responsable du 2026-11-06.
- Banc de parité : dans un job autre que `controles`, une étape `run:` avant
  `setup-node` est refusée, le périmètre excepté. Un `node` ou un `bash` est
  aussi refusé dans un job sans `setup-node`.
- `ci-invariants` garde l'ordre cache → build, le saut en documentaire, la
  clé et la variable, posée seulement par le build d'`e2e`.
- Mesures : fiche H91, fragment du 2026-11-06.
