### Ajouté

- **Environnement neutre côté Sentry *client*** (préparation migration HDS, suite
  de l'environnement neutre serveur/edge). La config `sentry.client.config.ts`
  lisait `VERCEL_ENV` / `VERCEL_GIT_COMMIT_SHA` — des variables Vercel qui
  n'atteignent pas le bundle navigateur : les erreurs client étaient taguées
  `environment=production`, `release` vide, sur Vercel comme sur Scalingo. Deux
  helpers `clientDeploymentEnvLabel` / `clientReleaseSha` lisent désormais
  `NEXT_PUBLIC_WN_DEPLOY_ENV` / `NEXT_PUBLIC_WN_RELEASE_SHA` (inlinées au build)
  en tête, repli Vercel conservé. Sans ces variables, comportement identique
  (**inerte sur Vercel**) ; posées au build Scalingo, elles étiquettent
  correctement les erreurs navigateur.
