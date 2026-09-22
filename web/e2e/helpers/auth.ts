// Fabrique un cookie de session NextAuth (JWT) valide sans automatiser la
// mini-app OAuth Google — pattern standard pour tester une app NextAuth avec
// Playwright. Nécessite NEXTAUTH_SECRET (même valeur que le serveur testé).
import { encode } from 'next-auth/jwt';
import { PORTAIL_COOKIE_NAME, PORTAIL_COOKIE_OPTIONS, SESSION_TTL_SECONDS, signPatientSession } from '../../src/lib/patient-session';

// Exporté depuis le 2026-08-21 : les fixtures qui écrivent en base (une
// consultation porte `praticienEmail`) doivent poser LE MÊME praticien que la
// session du banc — deux littéraux divergents feraient échouer la garde
// d'appartenance sur un dossier pourtant provisionné.
export const PRATICIEN_EMAIL = 'martialcayre@wellneuro.fr';

// Pose la session PORTAIL PATIENT (cookie `wn_portail`) exactement comme le fait
// l'atterrissage magic-link/Google. Depuis le LOT-04, ce cookie signé est
// l'unique credential du portail : plus de jeton d'URL ni de gate e-mail à
// simuler. Le vrai parcours magic-link reste couvert par `portail-lien-magique`.
export function patientPortailSessionCookie(idPatient: string, email: string) {
  const value = signPatientSession({ idPatient, email });
  // LES ATTRIBUTS VIENNENT DE LA SOURCE, ILS NE SE RECOPIENT PAS. Trois valeurs
  // étaient écrites ici à la main : le jour où les options de production
  // changent, ce cookie de banc cesse en silence de ressembler au vrai, et les
  // E2E valident un parcours qui n'existe pas. Même raison qu'à l'effacement
  // (`api/portail/deconnexion`) — relevé par la revue du delta de la PR #1211.
  //
  // `domain` et `expires` restent propres au banc : Playwright les exige sous
  // cette forme, et `localhost` est l'hôte des E2E.
  const { httpOnly, path, sameSite } = PORTAIL_COOKIE_OPTIONS;
  return {
    name: PORTAIL_COOKIE_NAME,
    value,
    domain: 'localhost',
    path,
    httpOnly,
    // Playwright veut « Lax », les options portent « lax ».
    sameSite: (sameSite.charAt(0).toUpperCase() + sameSite.slice(1)) as 'Lax',
    // Alignée sur la fenêtre réelle : la charge signée par `signPatientSession`
    // porte déjà `exp = iat + SESSION_TTL_SECONDS`. Une valeur écrite en dur ici
    // faisait expirer le cookie CÔTÉ NAVIGATEUR avant la session qu'il porte.
    expires: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
}

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
