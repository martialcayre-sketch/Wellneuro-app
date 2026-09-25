### GitHub Actions sait déployer la tête de `main`, et rien de plus ancien (D-248, lot 2) (2026-09-25)

- **Nouveau job `deploiement`** dans le workflow `Déploiement production`,
  lançable à la main seulement (`action=deployer`) : il attend qu'aucun build
  ne soit en vol, s'abstient si le run n'est plus la tête de `main` ou si la
  tête est déjà en service (sauf `forcer`), sinon lance
  `integration-link-manual-deploy main`, attend que tous les builds soient
  terminés, puis vérifie que la version en service contient le commit et
  qu'aucun recul n'en résulte.
- **Garde finale** tant que l'auto-déploiement Scalingo reste actif : un run
  dépassé ne conclut jamais au vert, pour ne pas réveiller l'auto-déploiement
  d'un vieux commit.
- Déploiements sérialisés, jamais annulés ; la concurrence passe au niveau
  des jobs. Session du CLI effacée en fin de job.
- Revue adverse avant PR : neuf constats confirmés, huit corrigés avec leur
  test (17 mutations attrapées), un routé au lot 3 (`release-db` doit
  attendre le calme avant de déclencher).
