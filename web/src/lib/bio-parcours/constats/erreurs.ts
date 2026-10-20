// Les refus de la base, reconnus à leur CODE Postgres, jamais à leur message
// (il porterait des identifiants du dossier). Deux formes, mesurées le
// 2026-10-20 sur Prisma 7 et `@prisma/adapter-pg` :
//  - un refus de trigger pendant l'instruction : `PrismaClientKnownRequestError`
//    `P2039`, le code dans `meta.driverAdapterError.cause.code` ;
//  - un refus en fin de transaction (trigger de contrainte différé) :
//    `DriverAdapterError`, le code dans `cause.code`.

type Erreur = {
  code?: unknown;
  meta?: { driverAdapterError?: { cause?: { code?: unknown } } };
  cause?: { code?: unknown };
};

/** Le code Postgres d'une erreur de base, ou `null`. */
export function codePostgres(err: unknown): string | null {
  const e = err as Erreur | null | undefined;
  const code = e?.meta?.driverAdapterError?.cause?.code ?? e?.cause?.code;
  return typeof code === 'string' ? code : null;
}

/** Un trigger a refusé (`RAISE EXCEPTION`). */
export function estRefusDeLaBase(err: unknown): boolean {
  return codePostgres(err) === 'P0001';
}

/**
 * Une course perdue : échec de sérialisation, interblocage, ou l'échec de
 * transaction interactive de Prisma (`P2034`). Le geste se rejoue.
 */
export function estConflitConcurrent(err: unknown): boolean {
  const code = codePostgres(err);
  if (code === '40001' || code === '40P01') return true;
  return (err as { code?: unknown } | null | undefined)?.code === 'P2034';
}
