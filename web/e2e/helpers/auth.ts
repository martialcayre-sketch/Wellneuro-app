// Fabrique un cookie de session NextAuth (JWT) valide sans automatiser la
// mini-app OAuth Google — pattern standard pour tester une app NextAuth avec
// Playwright. Nécessite NEXTAUTH_SECRET (même valeur que le serveur testé).
import { encode } from 'next-auth/jwt';

const PRATICIEN_EMAIL = 'martialcayre@wellneuro.fr';

export async function praticienSessionCookie(email = PRATICIEN_EMAIL) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error(
      "NEXTAUTH_SECRET est requis pour fabriquer un cookie de session praticien dans les tests Playwright (voir web/e2e/README.md)."
    );
  }
  const maxAge = 8 * 60 * 60;
  const value = await encode({
    token: { email, name: email, sub: email },
    secret,
    maxAge,
  });

  return {
    name: 'next-auth.session-token',
    value,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    sameSite: 'Lax' as const,
    expires: Math.floor(Date.now() / 1000) + maxAge,
  };
}
