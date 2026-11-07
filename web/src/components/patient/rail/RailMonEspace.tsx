'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { ListeMonEspace, useEtatMenuPortail, type FormeListe } from '@/components/patient/menu/MenuMonEspace';
import { railSurLeChemin } from './cheminRail';

/*
 * RAIL LATÉRAL « MON ESPACE » ([[D-447]], lot L5 de l'audit « rails et menus »).
 *
 * Monté par `portail/layout.tsx` sous `WN_PORTAIL_RAIL_LATERAL` ET
 * `WN_PORTAIL_MENU` seulement, dans le fournisseur du menu, autour du `main`.
 *
 * OÙ (§1). À partir de 1 024 px (`lg`), sur les pages où paraît le bouton
 * « Menu » — la même garde : page de session, murs franchis, dossier majeur —,
 * sauf le questionnaire en cours (`/questionnaires/<id>`), lu sur le chemin.
 * Là, il remplace le bouton, qui s'efface à la même largeur.
 *
 * QUOI (§2, §3). La liste du menu, déclarée une fois (`ListeMonEspace`), mêmes
 * sondes, même activation ; « Autres espaces » reste sur le hub.
 *
 * FORME (§4 à §6). Toujours déplié, sans bascule ni état mémorisé ; collé en
 * haut de sa colonne au défilement, jamais fixé, donc jamais sur le pied ; deux
 * jetons patient, `nav-rail` et `nav-active`. Mise en page du shell praticien :
 * `gap-6`, `px-6` de chaque côté, le `main` gardant son `px-4`. Hors des pages
 * du rail, ou sans la garde, le cadre ne fait qu’étirer le `main` : rien ne change.
 */

const FORME_RAIL: FormeListe = {
  classe:
    'hidden w-nav-rail shrink-0 self-start space-y-4 rounded-lg border border-border bg-surface px-3 py-4 lg:sticky lg:top-4 lg:my-8 lg:block lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto print:hidden',
  prefixeId: 'rail-mon-espace',
  classeLien: 'flex min-h-11 items-center px-3 text-primary underline-offset-4 hover:underline',
  classeLienActif: 'flex min-h-11 items-center px-3 font-semibold text-foreground shadow-nav-active',
  classeIntertitre: 'px-3 text-sm font-semibold text-muted-foreground',
};

export function CadreRailMonEspace({ children }: { children: ReactNode }) {
  const etat = useEtatMenuPortail();
  const pathname = usePathname() ?? '';
  const surLeChemin = !!etat?.token && railSurLeChemin(pathname, etat.token);
  const servi = !!etat?.actif && surLeChemin;
  // Tant que la garde n'a pas répondu, la place du rail est réservée, vide : le
  // contenu d'un dossier majeur ne saute plus à son arrivée ([[D-447]] §6,
  // amendement du 2026-11-07). Aucune entrée n'est rendue, fail-closed intact.
  const reserve = !servi && !!etat?.gardeEnLecture && surLeChemin;

  // LE CADRE EST TOUJOURS RENDU, et le `main` y garde sa place : la garde se lit
  // après le premier rendu, et un cadre posé à ce moment-là remonterait la page
  // entière (formulaires, lectures). Sans rail, il ne fait qu'étirer le `main`,
  // comme avant.
  return (
    <div className={`flex flex-1 flex-col${servi || reserve ? ' lg:flex-row lg:gap-6 lg:px-6' : ''}`}>
      {reserve ? <div data-testid="reserve-rail" aria-hidden="true" className="hidden w-nav-rail shrink-0 lg:block print:hidden" /> : null}
      {servi && etat?.token ? <ListeMonEspace etat={{ ...etat, token: etat.token }} forme={FORME_RAIL} /> : null}
      {children}
    </div>
  );
}
