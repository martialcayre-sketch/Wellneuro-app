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
 * Étiquette d'environnement pour le bundle NAVIGATEUR (Sentry client). Le code
 * client ne voit que les variables `NEXT_PUBLIC_*`, inlinées au build :
 * `WN_DEPLOY_ENV` (serveur) n'y est pas visible, et `VERCEL_ENV` ne l'a jamais
 * été côté navigateur. Ordre : `NEXT_PUBLIC_WN_DEPLOY_ENV` (Scalingo, à poser au
 * build) → `VERCEL_ENV` (repli, absent en navigateur) → `NODE_ENV`. Sans la
 * variable Scalingo, comportement identique à avant.
 */
export function clientDeploymentEnvLabel(): string {
  return (
    process.env.NEXT_PUBLIC_WN_DEPLOY_ENV ??
    process.env.VERCEL_ENV ??
    process.env.NODE_ENV ??
    'development'
  );
}

/**
 * Release pour le bundle NAVIGATEUR. Même contrainte `NEXT_PUBLIC_*` que
 * `clientDeploymentEnvLabel`. Ordre : `NEXT_PUBLIC_WN_RELEASE_SHA` (Scalingo) →
 * `VERCEL_GIT_COMMIT_SHA` (repli, absent en navigateur) → `NEXT_PUBLIC_APP_VERSION`.
 * Retourne `undefined` si rien n'est posé — release non renseignée, STRICTEMENT
 * identique au comportement Vercel d'avant. Pas de repli « local » ici,
 * contrairement au `releaseSha` serveur : le navigateur n'a jamais accès au vrai
 * SHA, un « local » taguerait à tort toutes les erreurs de prod Vercel.
 */
export function clientReleaseSha(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_WN_RELEASE_SHA ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.NEXT_PUBLIC_APP_VERSION
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
