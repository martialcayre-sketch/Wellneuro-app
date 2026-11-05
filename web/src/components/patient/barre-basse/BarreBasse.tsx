'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { entreesServies, hrefEntree, type CleEntree } from '@/components/patient/autres-espaces/entreesAutresEspaces';
import { elementActif } from '@/components/patient/menu/activationMenu';
import { useEtatMenuPortail } from '@/components/patient/menu/MenuMonEspace';
import {
  LIBELLE_ACCUEIL,
  LIBELLE_BIBLIOTHEQUE,
  LIBELLE_CARNET,
  LIBELLE_FICHES,
  LIBELLE_SUIVI,
  NOM_BARRE_BASSE,
} from './textesBarreBasse';

/*
 * BARRE BASSE DU PORTAIL ([[D-444]], lot L4 de l'audit « rails et menus »).
 *
 * Montée par `portail/layout.tsx` sous `WN_PORTAIL_BARRE_BASSE` ET
 * `WN_PORTAIL_MENU` seulement, dans le fournisseur du menu.
 *
 * OÙ (§1). Sous 768 px (`md:hidden`), sur les pages où paraît le bouton
 * « Menu » — la même garde : page de session, murs franchis, dossier majeur —,
 * sauf le questionnaire en cours (`/questionnaires/<id>`), lu sur le chemin.
 *
 * QUOI (§2). Accueil, Carnet, Suivi, inconditionnels comme au hub ; puis
 * l'entrée servie de « Ce que j’ai reçu », bibliothèque ou fiches, jamais les
 * deux : sa sonde est celle du menu, fermée tant qu'elle n'a pas répondu
 * « ouvert », et la case est alors absente. Pas de case « Menu » (Q48).
 *
 * PIED D'URGENCE (§4). La barre pose, dans le flux du conteneur, après le pied,
 * une réserve de sa hauteur ; le conteneur porte la zone sûre basse, barre ou
 * non (`portail/layout.tsx`). En fin de défilement, le pied s'affiche en entier
 * au-dessus d'elle. Le `main` n'en porte aucune.
 */

type CleCase = 'parcours' | 'carnet' | 'suivi' | 'bibliotheque' | 'fiches';

type CaseBarre = { cle: CleCase; libelle: string; href: string };

/** Le questionnaire en cours n'a pas de barre (§1, Q51) : `/questionnaires/<id>`. */
export function barreSurLeChemin(pathname: string, token: string): boolean {
  return !pathname.startsWith(`/portail/${token}/questionnaires/`);
}

export function casesServies(token: string, servies: ReturnType<typeof entreesServies>): CaseBarre[] {
  const cases: CaseBarre[] = [
    { cle: 'parcours', libelle: LIBELLE_ACCUEIL, href: `/portail/${token}/questionnaires` },
    { cle: 'carnet', libelle: LIBELLE_CARNET, href: `/portail/${token}/alimentation` },
    { cle: 'suivi', libelle: LIBELLE_SUIVI, href: `/portail/${token}/suivi` },
  ];
  // Servie, la bibliothèque remplace les fiches : les routes ferment alors la
  // sonde des fiches ([[D-360]] §2). Le `find` garde quand même l'une ou l'autre.
  const recue = servies.find(entree => entree.cle === 'bibliotheque') ?? servies.find(entree => entree.cle === 'fiches');
  if (recue) {
    cases.push({
      cle: recue.cle as 'bibliotheque' | 'fiches',
      libelle: recue.cle === 'bibliotheque' ? LIBELLE_BIBLIOTHEQUE : LIBELLE_FICHES,
      href: hrefEntree(token, recue),
    });
  }
  return cases;
}

const CLASSE_CASE =
  'flex h-full min-h-11 flex-col items-center justify-center px-1 text-center text-xs font-medium text-muted-foreground';
const CLASSE_CASE_ACTIVE =
  'flex h-full min-h-11 flex-col items-center justify-center border-t-2 border-primary px-1 text-center text-xs font-semibold text-primary';

export function BarreBasse() {
  const etat = useEtatMenuPortail();
  const pathname = usePathname() ?? '';
  if (!etat?.actif || !etat.token || !barreSurLeChemin(pathname, etat.token)) return null;

  const servies = entreesServies(etat.etats, { bilanConsultable: etat.bilanConsultable });
  const cases = casesServies(etat.token, servies);
  // [[D-423]] §4, comme le menu : la barre n'allume que ses propres cases.
  const actif: CleEntree | 'parcours' | null = elementActif(etat.segment, servies);

  return (
    <>
      {/* Réserve de bas (§4) : hauteur de la barre, bordure comprise ; la zone
          sûre est rendue par le conteneur. */}
      <div aria-hidden="true" className="h-[calc(4rem+1px)] shrink-0 md:hidden print:hidden" />
      <nav
        aria-label={NOM_BARRE_BASSE}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden print:hidden"
      >
        <ul className="mx-auto flex h-16 max-w-md items-stretch">
          {cases.map(une => (
            <li key={une.cle} className="min-w-0 flex-1">
              <Link
                href={une.href}
                aria-current={actif === une.cle ? 'page' : undefined}
                className={actif === une.cle ? CLASSE_CASE_ACTIVE : CLASSE_CASE}
              >
                <span>{une.libelle}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
