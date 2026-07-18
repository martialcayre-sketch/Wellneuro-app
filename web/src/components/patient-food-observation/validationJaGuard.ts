/**
 * Le harnais JA n'est jamais une route patient : il n'est disponible que
 * pendant un démarrage Next.js explicitement réalisé en développement local.
 */
export function isValidationJaHarnessAvailable(nodeEnv: string | undefined): boolean {
  return nodeEnv === 'development';
}

