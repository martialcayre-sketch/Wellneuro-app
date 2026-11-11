import Link from 'next/link';
import type { AnchorHTMLAttributes } from 'react';

/*
 * UN LIEN DU HUB, et la façon dont il charge sa cible.
 *
 * Vers une autre page du portail, `Link` : la navigation reste dans le même
 * document, et l'état du rail (réduit, escamoté) la suit ([[D-482]] §1). Un
 * `<a href>` rechargeait le document, et le rail revenait déplié (M1 de la
 * revue de PAT-1).
 *
 * Deux cibles restent des `<a>` simples :
 * - une page de questionnaire (`/portail/<jeton>/questionnaires/<id>`) : sa
 *   politique de caméra et son `script-src` sont figés AU CHARGEMENT du
 *   document (`next.config.mjs`, [[D-437]]). Un `Link` y amènerait le patient
 *   avec les en-têtes du hub : sans caméra pour la photo du repas, et sans la
 *   garde qui refuse un script d'une autre origine ;
 * - une ancre du hub (`#…`), qui ne quitte pas la page.
 */

const PAGE_QUESTIONNAIRE = /^\/portail\/[^/]+\/questionnaires\/[^/?#]+/;

export function chargeUnDocumentNeuf(href: string): boolean {
  return href.startsWith('#') || PAGE_QUESTIONNAIRE.test(href);
}

export function LienDuHub({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  if (chargeUnDocumentNeuf(href)) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} {...props}>
      {children}
    </Link>
  );
}
