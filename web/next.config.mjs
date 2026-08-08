/** @type {import('next').NextConfig} */

// En-têtes appliqués à toutes les réponses. `Referrer-Policy: no-referrer` est
// le plus structurant des six : le lien portail porte le jeton d'accès dans son
// chemin (`/portail/<jeton>`), et sans cet en-tête ce jeton part dans le
// `Referer` de la moindre ressource externe chargée par la page.
const enTetesSecurite = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  // Doublon volontaire : `frame-ancestors` fait autorité sur les navigateurs
  // récents, `X-Frame-Options` couvre les plus anciens. Sans eux, le dashboard
  // praticien est encadrable en iframe (clickjacking sur les actions fermes).
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

// Le portail patient et le parcours legacy s'ouvrent sur un lien à jeton : si un
// tel lien fuite vers un crawler, la page ne doit pas finir indexée. Ni l'un ni
// l'autre n'a vocation à être trouvé par un moteur.
const enTetesSansIndexation = [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }];

const nextConfig = {
  reactStrictMode: true,
  // Parcours patient unique : toute navigation vers l'ancienne URL
  // `/patient/[idAssignation]` est renvoyée sur l'entrée du portail.
  //
  // **Le répertoire `src/app/patient/` a été SUPPRIMÉ le 2026-08-08** (dette 5,
  // LOT-01). Cette redirection n'est donc plus une convergence entre deux
  // parcours vivants : elle est le seul reste du parcours legacy, et elle
  // existe pour les liens e-mail déjà partis chez des patients. La retirer
  // ferait tomber ces liens en 404 au lieu de les ramener au portail.
  //
  // 307 (`permanent: false`) et pas 308 : un 308 est mis en cache durablement
  // par les navigateurs et les intermédiaires, et resterait actif sur les
  // postes patients sans aucun moyen de le rappeler. Le coût d'un 307 est un
  // aller-retour de plus ; celui d'un 308 mal placé est irrattrapable.
  //
  // Aucun email n'est transmis en query string vers `/portail/connexion` :
  // l'adresse du patient est une donnée de santé indirecte, et une redirection
  // la déposerait dans les journaux serveur, l'historique du navigateur et les
  // barres d'URL partagées. `/portail/connexion` redemande l'adresse — c'est le
  // coût assumé d'une reprise sans fuite.
  async redirects() {
    return [
      {
        source: '/patient/:idAssignation*',
        destination: '/portail/connexion',
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      { source: '/:path*', headers: enTetesSecurite },
      { source: '/portail/:path*', headers: enTetesSansIndexation },
      // Conservé après la suppression du répertoire : l'en-tête part avec la
      // réponse 307 elle-même, et c'est elle qu'un crawler rencontrerait en
      // suivant un ancien lien e-mail.
      { source: '/patient/:path*', headers: enTetesSansIndexation },
    ];
  },
};

export default nextConfig;
