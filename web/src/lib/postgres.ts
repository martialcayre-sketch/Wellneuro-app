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

/**
 * Option `ssl` à passer au `Pool` node-postgres.
 *
 * Toute base distante (Supabase et, par défaut, tout ce qui n'est pas une
 * connexion locale) reçoit `{ rejectUnauthorized: false }` : la connexion reste
 * chiffrée (TLS) mais on ne vérifie pas la chaîne de certificats auto-signée
 * de Supabase — sinon `pg` échoue avec
 * « Error opening a TLS connection: self-signed certificate in certificate chain ».
 *
 * On ne se fie PAS à un match d'hôte `.supabase.*` : en prod, `DATABASE_URL`
 * peut prendre une forme inattendue (ou contenir des caractères qui font échouer
 * `new URL()`), ce qui laissait `pg` vérifier la chaîne et cassait toutes les
 * requêtes. On renvoie donc l'option pour tout ce qui n'est pas explicitement
 * local ; `undefined` en local (pas de TLS forcé).
 */
export function supabasePoolSsl(
  connectionString: string,
): { rejectUnauthorized: false } | undefined {
  if (isLocalConnection(connectionString)) {
    return undefined;
  }
  return { rejectUnauthorized: false };
}
