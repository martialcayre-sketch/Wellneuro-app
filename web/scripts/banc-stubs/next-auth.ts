// SUBSTITUT DE BANC — jamais importé par l'application. Remplace `next-auth`
// pour les bancs qui jouent une VRAIE route praticien contre PostgreSQL
// (`banc-envoi-cabinet-deux-sessions.test.ts`) : la session est celle du
// praticien de fixture que le banc annonce dans `WN_BANC_PRATICIEN_EMAIL`.
// Rien d'autre de `next-auth` n'est servi : un import inattendu échoue.

export type AuthOptions = Record<string, unknown>;

export async function getServerSession(): Promise<{ user: { email: string } } | null> {
  const email = process.env.WN_BANC_PRATICIEN_EMAIL;
  return email ? { user: { email } } : null;
}
