/**
 * Un hôte Supabase (instance directe `db.<ref>.supabase.co` ou pooler
 * `<region>.pooler.supabase.com`) présente un certificat auto-signé dans sa
 * chaîne TLS. On doit donc chiffrer la connexion sans vérifier la chaîne.
 */
function isSupabaseHost(host: string): boolean {
  const h = host.toLowerCase();
  return h.endsWith('.supabase.com') || h.endsWith('.supabase.co');
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
 * Option `ssl` à passer au `Pool` node-postgres pour un hôte Supabase.
 * La connexion reste chiffrée (TLS) mais on ne vérifie pas la chaîne de
 * certificats auto-signée — sinon `pg` échoue avec
 * « Error opening a TLS connection: self-signed certificate in certificate chain ».
 * Renvoie `undefined` hors Supabase : comportement par défaut inchangé.
 */
export function supabasePoolSsl(
  connectionString: string,
): { rejectUnauthorized: false } | undefined {
  try {
    const url = new URL(connectionString);
    if (isSupabaseHost(url.hostname)) {
      return { rejectUnauthorized: false };
    }
  } catch {
    // Hôte non parseable : pas d'option SSL forcée.
  }

  return undefined;
}
