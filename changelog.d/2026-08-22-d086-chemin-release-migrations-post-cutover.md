### D-086 — le chemin de release des migrations après le cutover : le gate humain est le merge

- Constat d'ouverture du LOT-01 Alliance (cadrage `wn-reviewer`, preuves
  citées) : l'app de production `wellneuro` **auto-déploie `main`** et son
  `postdeploy` applique les migrations **au merge**, avant toute approbation
  `release-db` ; le secret `MIGRATE_DATABASE_URL`, inchangé depuis le
  2026-08-05, pointait la base Supabase **gelée** — un run aurait rendu vert
  sur une base condamnée au 2026-09-01, et la vérification MCP, qui lit la
  même base, aurait confirmé ce faux vert.
- Arbitrage du responsable (`D-086`) : le gate humain d'une migration est la
  **revue + le go explicite avant merge** ; le responsable repointe le secret
  vers Scalingo (geste hors dépôt) et `release-db` devient une seconde
  application idempotente avec préflights ; la vérification post-release se
  fait depuis un **conteneur one-off Scalingo** (`scalingo run -d`), plus
  jamais par le MCP.
- Alignés dans la même PR : la règle non négociable de `CLAUDE.md`,
  `.claude/rules/db-prisma.md` (lecture production + chemin d'écriture) et
  `docs/DEPLOIEMENT_RELEASE_DB.md` (encart de régime post-cutover). Signalé
  sans être tranché ici : les deux runs `release-db` en attente du
  2026-08-22 visent la base gelée — geste du responsable.
