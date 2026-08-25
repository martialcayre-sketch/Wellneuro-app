import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Un seul rôle, et une seule route : rediriger les anciens liens
 * `/patient/[idAssignation]` vers l'entrée du portail **en jetant leur query
 * string**.
 *
 * Pourquoi un middleware plutôt que le `redirects()` de `next.config.mjs` — qui
 * existe déjà et reste en place. Next **recopie la query string d'origine dans
 * la destination** d'un `redirects()`, et il n'y a aucun moyen déclaratif de
 * l'en empêcher : une query portée par la destination est *fusionnée* avec
 * celle de la requête, pas substituée (mesuré le 2026-08-08 —
 * `/patient/ASS_x?email=…` rendait
 * `/portail/connexion?email=…&depuis=lien-ancien`).
 *
 * Or `next.config.mjs` affirme depuis le 2026-08-05 qu'« aucun email n'est
 * transmis en query string vers `/portail/connexion` », parce que l'adresse
 * d'un patient est une donnée de santé indirecte et qu'une redirection la
 * déposerait dans les journaux serveur, l'historique du navigateur et les
 * barres d'URL partagées. L'affirmation était juste sur l'intention et fausse
 * sur le fait. Ce fichier la rend vraie ; `e2e/parcours-legacy-redirection.spec.ts`
 * la tient.
 *
 * `redirects()` est CONSERVÉ comme filet : si ce middleware disparaît ou que
 * son `matcher` dérive, un ancien lien continue d'atterrir sur le portail
 * plutôt qu'en 404 — avec sa query, ce qui est le défaut mineur, pas le grave.
 */
export function middleware(request: NextRequest) {
  // Derrière le routeur Scalingo, `request.url` porte l'hôte interne du
  // conteneur ; en middleware, Next émet néanmoins une Location relative
  // (constaté en production le 2026-08-25 — sain). Si cette redirection migre
  // un jour vers un Route Handler, passer par `lib/portail/urlPublique.ts`,
  // jamais par une URL absolue bâtie sur `req.url`.
  const cible = new URL('/portail/connexion', request.url);
  // Aucun paramètre repris de `request.nextUrl.searchParams` : c'est le geste
  // entier de ce fichier.
  return NextResponse.redirect(cible, 307);
}

export const config = {
  matcher: '/patient/:path*',
};
