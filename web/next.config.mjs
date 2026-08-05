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
  // Parcours patient unique : toute navigation vers le parcours legacy
  // `/patient/[idAssignation]` est renvoyée sur l'entrée du portail.
  //
  // 307 (`permanent: false`) et pas 308 : la redirection est une mesure de
  // convergence, pas une réécriture d'URL définitive. Un 308 est mis en cache
  // durablement par les navigateurs et les intermédiaires — si le retrait du
  // legacy devait être reporté ou partiellement défait, un 301/308 déjà en
  // cache resterait actif sur les postes patients sans aucun moyen de le
  // rappeler. Le retrait définitif du répertoire est prévu après une nouvelle
  // mesure d'usage (voir `src/app/patient/[idAssignation]/page.tsx`).
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
      { source: '/patient/:path*', headers: enTetesSansIndexation },
    ];
  },
};

export default nextConfig;
