import nodemailer from 'nodemailer';

// Transport SMTP borné — à utiliser partout à la place de
// `nodemailer.createTransport(smtpUrl)` dans un chemin de requête.
//
// Sans timeout, un serveur SMTP qui pend bloquerait la requête indéfiniment sur
// un conteneur persistant (Scalingo n'a pas le `maxDuration` serverless de
// Vercel qui coupait sinon). On borne donc l'établissement de connexion, l'accueil
// SMTP et l'inactivité socket. nodemailer lit ces trois options depuis les query
// params de l'URL de connexion (vérifié sur la version installée) — on les
// APPEND à l'URL plutôt que de la reconstruire via `new URL`, ce qui
// ré-encoderait les identifiants (mot de passe SMTP à caractères spéciaux).
//
// Valeurs largement sous le seuil « premier octet » de 30 s du routeur, et
// généreuses pour un SMTP sain. **Sémantique inchangée** : un envoi qui pendait
// à l'infini échoue désormais après ~20 s comme n'importe quel échec SMTP, et la
// gestion d'erreur existante de chaque appelant s'applique telle quelle.
const CONNEXION_TIMEOUT_MS = 10_000;
const GREETING_TIMEOUT_MS = 10_000;
const SOCKET_TIMEOUT_MS = 20_000;

export function creerTransportSmtp(smtpUrl: string) {
  const separateur = smtpUrl.includes('?') ? '&' : '?';
  const timeouts = `connectionTimeout=${CONNEXION_TIMEOUT_MS}&greetingTimeout=${GREETING_TIMEOUT_MS}&socketTimeout=${SOCKET_TIMEOUT_MS}`;
  return nodemailer.createTransport(`${smtpUrl}${separateur}${timeouts}`);
}
