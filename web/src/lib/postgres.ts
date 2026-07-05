export function withSupabaseSslMode(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    const host = url.hostname.toLowerCase();
    const isSupabaseHost = host.endsWith('.supabase.com');

    if (isSupabaseHost) {
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
