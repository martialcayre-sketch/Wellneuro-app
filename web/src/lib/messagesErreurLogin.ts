/**
 * Messages affichés sur `/login` quand NextAuth y renvoie avec `?error=`.
 *
 * `authOptions.pages.error` route TOUTES les erreurs d'authentification vers
 * `/login`. Sans traduction, l'échec est muet : le praticien revient sur un
 * écran identique à celui qu'il vient de quitter, sans savoir s'il a été
 * refusé, si Google n'a pas répondu, ou s'il a simplement fermé la fenêtre.
 * C'est le constat de la revue adversariale du 2026-09-01 — et son coût a
 * monté depuis que les endpoints Google sont épinglés (`web/src/lib/auth.ts`) :
 * une évolution côté Google se manifesterait ici, par un échec répété.
 *
 * Deux registres, délibérément distincts :
 *
 * - **refus** — la décision est prise et elle est définitive pour ce compte
 *   (mauvais domaine, adresse non vérifiée). Réessayer n'y changera rien ; le
 *   message dit ce qui est attendu à la place.
 * - **panne** — l'échange avec Google n'a pas abouti. Réessayer a du sens,
 *   c'est ce que le message propose.
 *
 * Le code technique n'est jamais montré seul : il accompagne le message en
 * petit, pour qu'un appel au support parte d'un fait plutôt que d'une
 * impression.
 */
export type RegistreErreurConnexion = 'refus' | 'panne';

export type ErreurConnexion = {
  registre: RegistreErreurConnexion;
  titre: string;
  detail: string;
};

/** Codes émis par NextAuth v4 sur la page d'erreur (`pages.error`). */
const MESSAGES: Record<string, ErreurConnexion> = {
  AccessDenied: {
    registre: 'refus',
    titre: 'Ce compte Google n’a pas accès à l’espace praticien.',
    detail:
      'L’accès est réservé aux adresses wellneuro.fr dont l’adresse est vérifiée par Google. Reconnectez-vous en choisissant votre compte professionnel.',
  },
  Configuration: {
    registre: 'panne',
    titre: 'La connexion est mal configurée côté serveur.',
    detail:
      'Ce n’est pas votre compte qui est en cause : réessayer ne suffira pas. Signalez-le au support.',
  },
  Verification: {
    registre: 'panne',
    titre: 'Ce lien de connexion n’est plus valable.',
    detail: 'Relancez une connexion depuis cette page.',
  },
  OAuthSignin: {
    registre: 'panne',
    titre: 'La connexion à Google n’a pas pu démarrer.',
    detail: 'Réessayez dans un instant. Si l’échec se répète, signalez-le au support.',
  },
  OAuthCallback: {
    registre: 'panne',
    titre: 'Google n’a pas répondu à temps.',
    detail: 'Réessayez dans un instant. Si l’échec se répète, signalez-le au support.',
  },
  Callback: {
    registre: 'panne',
    titre: 'La connexion n’a pas abouti.',
    detail: 'Réessayez dans un instant. Si l’échec se répète, signalez-le au support.',
  },
  OAuthAccountNotLinked: {
    registre: 'refus',
    titre: 'Ce compte est déjà associé à une autre méthode de connexion.',
    detail: 'Utilisez le compte Google Workspace avec lequel l’accès a été ouvert.',
  },
  SessionRequired: {
    registre: 'panne',
    titre: 'Votre session a expiré.',
    detail: 'Reconnectez-vous pour reprendre votre travail.',
  },
};

const DEFAUT: ErreurConnexion = {
  registre: 'panne',
  titre: 'La connexion n’a pas abouti.',
  detail: 'Réessayez dans un instant. Si l’échec se répète, signalez-le au support.',
};

/**
 * Traduit un `?error=` en message affichable. Un code inconnu — NextAuth peut
 * en ajouter, et une version future en renommer — ne doit jamais faire
 * disparaître le bandeau : c'est précisément le silence qu'on corrige. Il
 * retombe donc sur le message générique, qui reste vrai pour tout échec.
 */
export function messageErreurConnexion(code: string | null | undefined): ErreurConnexion | null {
  if (!code) return null;
  return MESSAGES[code] ?? DEFAUT;
}
