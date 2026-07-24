/**
 * URL de connexion PostgreSQL, résolue dans l'ordre :
 *   DATABASE_URL            — dev, CI, Vercel (définie explicitement) ;
 *   SCALINGO_POSTGRESQL_URL — injectée par l'add-on PostgreSQL Scalingo.
 * Permet de tourner sur Scalingo sans aliaser la variable côté plateforme.
 * `undefined` si aucune n'est définie (l'appelant décide de l'erreur).
 */
export function resolveDatabaseUrl(): string | undefined {
  // `??` ne bascule que sur null/undefined : un DATABASE_URL posé mais VIDE
  // (déclaré sans valeur côté Scalingo) masquerait SCALINGO_POSTGRESQL_URL. On
  // teste donc le non-blanc avant de retomber sur l'URL de l'add-on Scalingo.
  const direct = process.env.DATABASE_URL;
  if (direct && direct.trim()) return direct;
  return process.env.SCALINGO_POSTGRESQL_URL;
}

/**
 * Taille du pool `pg`, lue depuis `DB_POOL_MAX`. Défaut et plancher **1** :
 * toute valeur absente, vide, non numérique ou < 1 retombe à 1 (une valeur
 * négative passée à `pg` serait invalide). À relever (5–10) sur Scalingo.
 */
export function resolvePoolMax(): number {
  const n = Number.parseInt(process.env.DB_POOL_MAX ?? '', 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

/**
 * Un hôte Supabase (instance directe `db.<ref>.supabase.co` ou pooler
 * `<region>.pooler.supabase.com`) présente un certificat auto-signé dans sa
 * chaîne TLS. On doit donc chiffrer la connexion sans vérifier la chaîne.
 */
function isSupabaseHost(host: string): boolean {
  const h = host.toLowerCase();
  return h.endsWith('.supabase.com') || h.endsWith('.supabase.co');
}

/**
 * Une connexion locale de développement (localhost / 127.0.0.1 / socket Unix
 * via `?host=`) ne doit PAS se voir imposer de TLS.
 */
function isLocalConnection(connectionString: string): boolean {
  try {
    const url = new URL(connectionString);
    const host = url.hostname.toLowerCase();
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host === '' ||
      url.searchParams.has('host') // socket Unix (ex: ?host=/home/node/pgdata)
    );
  } catch {
    // URL non parseable : on ne peut pas conclure « local » → on suppose distant.
    return false;
  }
}

export function withSupabaseSslMode(connectionString: string): string {
  try {
    const url = new URL(connectionString);

    if (isSupabaseHost(url.hostname)) {
      if (!url.searchParams.has('sslmode')) {
        url.searchParams.set('sslmode', 'require');
      }
      if (!url.searchParams.has('uselibpqcompat')) {
        url.searchParams.set('uselibpqcompat', 'true');
      }
      return url.toString();
    }
  } catch {
    // Laisser node-postgres/Prisma remonter l'erreur de connexion originale.
  }

  return connectionString;
}

export type PoolSslConfig =
  | { rejectUnauthorized: false }
  | { ca: string; rejectUnauthorized: true }
  | undefined;

/**
 * Option `ssl` à passer au `Pool` node-postgres. Le nom reste historique
 * (`supabase*`) mais la fonction couvre **tout hôte distant**, Scalingo compris.
 *
 * - **Local** → `undefined` (pas de TLS forcé).
 * - **Distant avec `DB_SSL_CA`** (durcissement HDS opt-in : le certificat racine
 *   PEM de l'hébergeur) → `{ ca, rejectUnauthorized: true }` : la chaîne est
 *   vérifiée. C'est la posture visée sur Scalingo ; l'absence de vérification
 *   serait un point relevé en pentest (exigence 7 de G-TRUST-04).
 * - **Distant sans `DB_SSL_CA`** → `{ rejectUnauthorized: false }` : chiffré mais
 *   sans vérifier la chaîne (Supabase présente un certificat auto-signé). C'est
 *   le **défaut historique, inchangé** hors `DB_SSL_CA`.
 *
 * On ne se fie PAS à un match d'hôte `.supabase.*` : en prod, l'URL peut prendre
 * une forme inattendue (ou faire échouer `new URL()`), ce qui laissait `pg`
 * vérifier la chaîne et cassait toutes les requêtes. On renvoie donc une option
 * pour tout ce qui n'est pas explicitement local.
 */
export function supabasePoolSsl(connectionString: string): PoolSslConfig {
  if (isLocalConnection(connectionString)) {
    return undefined;
  }
  const ca = process.env.DB_SSL_CA?.trim();
  if (ca) {
    return { ca, rejectUnauthorized: true };
  }
  return { rejectUnauthorized: false };
}

/**
 * Retire les paramètres SSL de la chaîne de connexion (`sslmode`,
 * `uselibpqcompat`, `ssl`).
 *
 * En runtime (Node 24 sur Vercel), l'adaptateur `@prisma/adapter-pg` en mode
 * libpq-compat dérive la config SSL depuis la chaîne et **écrase l'option `ssl`
 * du Pool** — ce qui réintroduit la vérification de la chaîne auto-signée
 * Supabase et casse toutes les requêtes. En nettoyant ces paramètres, on force
 * `pg` à n'utiliser que l'option `ssl: { rejectUnauthorized: false }` passée au
 * Pool (le serveur exige TLS, donc l'option suffit à l'activer sans vérifier).
 */
export function stripSslParams(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    for (const p of ['sslmode', 'uselibpqcompat', 'ssl']) {
      url.searchParams.delete(p);
    }
    return url.toString();
  } catch {
    return connectionString;
  }
}
