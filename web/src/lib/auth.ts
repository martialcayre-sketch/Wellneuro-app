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
      authorization: {
        params: {
          // Forcer le choix du compte à chaque connexion
          prompt: 'select_account',
          // Profil Google uniquement (plus de dépendance runtime à Google Sheets)
          scope: 'openid email profile',
        },
      },
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
