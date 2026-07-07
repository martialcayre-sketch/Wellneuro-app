import { AuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

// Domaines Google Workspace autorisés (praticiens Wellneuro uniquement)
const ALLOWED_DOMAINS = ['wellneuro.fr'];

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
    async signIn({ account, profile }) {
      // Restreindre l'accès aux domaines autorisés
      const email = profile?.email ?? '';
      const domain = email.split('@')[1] ?? '';
      if (!ALLOWED_DOMAINS.includes(domain)) {
        return false; // Connexion refusée
      }
      return true;
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
