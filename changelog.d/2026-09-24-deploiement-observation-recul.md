### La production est observée : un recul se voit en un quart d'heure (D-248, lot 1) (2026-09-24)

- **Nouveau workflow `Déploiement production`** (planifié toutes les 15 min,
  lançable à la main) : il lit `scalingo deployments` et l'ascendance de
  `main`, et rougit si le code en service est un ancêtre strict d'un commit
  déjà mis en service — la forme des deux reculs du 2026-09-23. Lecture seule :
  il ne déploie rien.
- **La version en service est celle qui FINIT en dernier** : la liste Scalingo
  est triée par début de build, et deux builds peuvent se chevaucher.
- Une tête simplement pas encore déployée n'est jamais rouge (avertissement
  au-delà de 45 min).
- Premier des quatre lots de D-248 : GitHub Actions déploiera ensuite la tête
  de `main`, auto-déploiement Scalingo coupé.
