import { AuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

// Domaines Google Workspace autorisés (praticiens Wellneuro uniquement)
const ALLOWED_DOMAINS = ['wellneuro.fr'];

/*
 * Le profil Google porte deux champs que le type `Profile` de NextAuth ne
 * déclare pas : `email_verified` (l'adresse a-t-elle été vérifiée par Google)
 * et `hd` (le domaine Workspace hébergeant le compte).
 */
type ProfilGoogle = {
  email?: string | null;
  email_verified?: boolean;
  hd?: string;
};

/**
 * Décide si un profil Google donne accès à l'espace praticien.
 *
 * Trois contrôles, du plus fort au plus faible (R7 de l'audit 5.0 — le
 * contrôle historique ne regardait que le **texte** de l'adresse) :
 *
 * 1. le domaine de l'adresse est autorisé ;
 * 2. l'adresse est **vérifiée** — c'est ce contrôle qui porte le vrai gain,
 *    une adresse non vérifiée n'engage Google à rien ;
 * 3. si le profil expose `hd`, il doit désigner un domaine autorisé.
 *
 * `hd` n'est **pas exigé quand il est absent** : le scope `openid email
 * profile` ne garantit pas sa présence, et l'exiger fermerait l'accès à la
 * production au seul compte praticien si Google cessait de le renvoyer. Son
 * absence laisse donc la décision aux contrôles 1 et 2.
 */
export function profilPraticienAutorise(profil: ProfilGoogle | null | undefined): boolean {
  const email = profil?.email ?? '';
  const domaine = email.split('@')[1] ?? '';
  if (!ALLOWED_DOMAINS.includes(domaine)) {
    return false;
  }

  if (profil?.email_verified !== true) {
    return false;
  }

  if (typeof profil?.hd === 'string' && !ALLOWED_DOMAINS.includes(profil.hd)) {
    return false;
  }

  return true;
}

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // 8 s au lieu du défaut openid-client (3 500 ms), qui transformait tout
      // ralentissement en échec sec du login (incident du 2026-08-31,
      // SIGNIN_OAUTH_ERROR ×3). C'est un budget d'inactivité socket PAR APPEL,
      // pas une échéance totale, et next-auth le pose en défaut GLOBAL du
      // process (custom.setHttpOptionsDefaults) au premier login. Avec les
      // endpoints épinglés ci-dessous, le callback enchaîne au pire deux
      // appels (jeton, JWKS) : ~16 s — délibérément sous la fenêtre de 30 s
      // du routeur Scalingo, au-delà de laquelle le 504 remplacerait la
      // redirection /login?error.
      httpOptions: { timeout: 8_000 },
      // Découverte OIDC désactivée : `wellKnown: undefined` écrase le défaut
      // du factory (la fusion next-auth copie aussi les clés `undefined` —
      // utils/merge), et openidClient construit alors l'Issuer localement à
      // partir des valeurs ci-dessous (core/lib/oauth/client.js). Ce sont les
      // endpoints publiés par le document well-known de Google, stables et
      // documentés ; si Google les faisait évoluer, restaurer la découverte
      // se ferait en retirant ce bloc. Gain : l'appel de découverte disparaît
      // des deux jambes du flux (construction de l'URL d'autorisation, puis
      // callback) — un appel réseau et un point de panne de moins sur
      // chacune. Valeurs relevées sur le document well-known en direct le
      // 2026-09-01 (15:53 UTC). Sans rapport avec ce bloc : PKCE
      // est déjà actif, `checks: ["pkce", "state"]` est le défaut du factory
      // GoogleProvider (next-auth 4.24.14).
      wellKnown: undefined,
      issuer: 'https://accounts.google.com',
      authorization: {
        url: 'https://accounts.google.com/o/oauth2/v2/auth',
        params: {
          // Forcer le choix du compte à chaque connexion
          prompt: 'select_account',
          // Profil Google uniquement (plus de dépendance runtime à Google Sheets)
          scope: 'openid email profile',
          // Préfiltre l'écran Google de choix de compte sur le domaine
          // Workspace autorisé. Indication d'interface, jamais un contrôle :
          // la décision d'accès reste entière dans profilPraticienAutorise
          // (domaine, adresse vérifiée, cohérence `hd`).
          hd: ALLOWED_DOMAINS[0],
        },
      },
      token: 'https://oauth2.googleapis.com/token',
      userinfo: 'https://openidconnect.googleapis.com/v1/userinfo',
      jwks_endpoint: 'https://www.googleapis.com/oauth2/v3/certs',
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      // Domaine autorisé, adresse vérifiée, et `hd` cohérent s'il est fourni.
      return profilPraticienAutorise(profile as ProfilGoogle | null | undefined);
    },
    async session({ session, token }) {
      // Exposer l'email dans la session
      if (session.user && token.email) {
        session.user.email = token.email;
      }
      return session;
    },
    async jwt({ token, profile }) {
      if (profile?.email) {
        token.email = profile.email;
      }
      return token;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 heures — durée journée de travail
  },
};
