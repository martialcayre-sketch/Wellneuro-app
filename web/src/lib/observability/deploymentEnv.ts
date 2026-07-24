import type { AppEnvironment } from './types';

// Environnement de déploiement et release, INDÉPENDANTS de la plateforme.
//
// Historiquement le code lisait directement `VERCEL_ENV` / `VERCEL_GIT_COMMIT_SHA`
// / l'en-tête `x-vercel-id`, injectés par Vercel. Sur Scalingo ces variables
// n'existent pas → Sentry taguerait tout en `development`/`release=local` et le
// journal d'accès HDS perdrait la version. Ces helpers ajoutent des variables
// neutres (`WN_DEPLOY_ENV`, `WN_RELEASE_SHA`) EN TÊTE, sans retirer le repli
// Vercel : tant que `WN_*` ne sont pas posées, le comportement est identique à
// aujourd'hui. Module volontairement sans dépendance lourde (pas d'import
// Prisma) : il est chargé très tôt (`instrumentation.ts`) et en edge runtime
// (`sentry.edge.config.ts`).

/**
 * Environnement typé (`AppEnvironment`). Ordre : `WN_DEPLOY_ENV` (Scalingo) →
 * `VERCEL_ENV` → inférence `NODE_ENV`. La valeur Scalingo `staging` est mappée
 * sur `preview` pour rester dans l'union existante sans propager un nouveau
 * variant partout.
 */
export function deploymentEnv(): AppEnvironment {
  const raw = process.env.WN_DEPLOY_ENV ?? process.env.VERCEL_ENV;
  if (raw === 'production' || raw === 'preview' || raw === 'development') return raw;
  if (raw === 'staging') return 'preview';
  if (process.env.NODE_ENV === 'production') return 'production';
  return 'development';
}

/**
 * Étiquette d'environnement BRUTE pour Sentry (`environment:` accepte une chaîne
 * libre) : préserve `staging` tel quel plutôt que de l'aplatir en `preview`.
 * Sans `WN_DEPLOY_ENV`, retombe sur `VERCEL_ENV ?? NODE_ENV` — identique à avant.
 */
export function deploymentEnvLabel(): string {
  return (
    process.env.WN_DEPLOY_ENV ??
    process.env.VERCEL_ENV ??
    process.env.NODE_ENV ??
    'development'
  );
}

/**
 * SHA/version de la release. Scalingo n'injecte pas de SHA de commit fiable au
 * runtime → poser `WN_RELEASE_SHA` au déploiement. Repli inchangé ensuite.
 */
export function releaseSha(): string {
  return (
    process.env.WN_RELEASE_SHA ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.NEXT_PUBLIC_APP_VERSION ??
    'local'
  );
}

/**
 * Identifiant de requête depuis les en-têtes de corrélation de la plateforme.
 * Scalingo pose `X-Request-Id` ; Vercel `x-vercel-id` ; passerelles AWS
 * `x-amzn-trace-id`. Même ordre qu'avant, `x-request-id` couvrant Scalingo.
 */
export function deploymentRequestId(headers: Headers): string | null {
  return (
    headers.get('x-vercel-id') ??
    headers.get('x-request-id') ??
    headers.get('x-amzn-trace-id') ??
    null
  );
}
