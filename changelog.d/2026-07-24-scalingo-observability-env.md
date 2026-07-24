### Ajouté

- **Environnement de déploiement neutre** (préparation migration HDS). Un module
  `observability/deploymentEnv.ts` (`deploymentEnv` / `deploymentEnvLabel` /
  `releaseSha` / `deploymentRequestId`) remplace les lectures directes de
  `VERCEL_ENV` / `VERCEL_GIT_COMMIT_SHA` / `x-vercel-id` dans le contexte de
  requête, l'instrumentation, le journal d'accès (G-TRUST-04 exig. 5) et les
  configs Sentry serveur/edge. Des variables neutres (`WN_DEPLOY_ENV`,
  `WN_RELEASE_SHA`) passent **en tête** avec repli Vercel conservé : sans elles,
  comportement identique. Sur Scalingo, elles évitent que Sentry et le journal
  taguent tout en `development`/`release=local`. (La config Sentry *client* —
  bundle navigateur, variables inlinées au build — reste à traiter séparément.)
