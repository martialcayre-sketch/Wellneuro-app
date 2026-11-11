'use client';

import type { ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { usePathname } from 'next/navigation';
import { EyeOff, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { ListeMonEspace, useEtatMenuPortail, type FormeListe } from '@/components/patient/menu/MenuMonEspace';
import { TRAIT_ICONE } from '@/components/ui/icone';
import { railSurLeChemin } from './cheminRail';
import { ID_BOUTON_ROUVRIR_RAIL, useEtatRail, type EtatRail } from './etatRail';
import { AGRANDIR_LE_MENU, MASQUER_LE_MENU, REDUIRE_LE_MENU } from './textesRail';

/*
 * RAIL LATÉRAL « MON ESPACE » ([[D-447]], lot L5 de l'audit « rails et menus » ;
 * refonte Lien, lot PAT-1 : [[D-482]], [[D-483]]).
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
 * sondes, même activation. Sur le hub, « Autres espaces » n'est pas rendu dès
 * 1 024 px quand le rail est servi ([[D-483]] §2).
 *
 * ÉTATS ([[D-482]]). Déplié (`nav-rail`), réduit (`rail-patient-compact`,
 * libellés gardés, passés à la ligne, jamais un rail d'icônes) ou escamoté :
 * le rail n'est plus rendu, la colonne de contenu récupère sa place et le
 * bouton « Menu » de l'en-tête le rouvre déplié. L'état vit dans la mémoire du
 * layout, rien n'est écrit sur l'appareil ; au chargement, déplié. Deux
 * commandes en pied de rail (T-21 à T-23).
 *
 * FORME. Collé en haut de sa colonne au défilement, jamais fixé, donc jamais
 * sur le pied. Fond sauge du thème patient (`bg-rail`, A5-R3), toujours clair ;
 * entrée active sur `rail-surface` avec son filet `nav-active`. Mise en page
 * du shell praticien : `gap-6`, `px-6` de chaque côté, le `main` gardant son
 * `px-4`. Hors des pages du rail, ou sans la garde, le cadre ne fait
 * qu’étirer le `main` : rien ne change.
 */

const CLASSE_LIEN = 'flex min-h-11 items-center rounded-md px-3 text-rail-foreground hover:bg-rail-surface';

function formeRail(etat: Exclude<EtatRail, 'escamote'>): FormeListe {
  return {
    classe: `hidden ${etat === 'reduit' ? 'w-nav-rail-compact px-2' : 'w-nav-rail px-3'} shrink-0 self-start space-y-4 rounded-lg border border-rail-border bg-rail py-4 text-rail-foreground lg:sticky lg:top-4 lg:my-8 lg:block lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto print:hidden`,
    prefixeId: 'rail-mon-espace',
    classeLien: CLASSE_LIEN,
    classeLienActif: 'flex min-h-11 items-center rounded-md bg-rail-surface px-3 font-semibold text-rail-foreground shadow-nav-active',
    classeIntertitre: 'px-3 text-sm font-semibold text-rail-muted-foreground',
    classeActifIcones: '',
  };
}

const CLASSE_COMMANDE =
  'flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-1 text-left text-sm font-medium text-rail-muted-foreground hover:bg-rail-surface hover:text-rail-foreground';

function CommandesRail({ icones }: { icones: boolean }) {
  const { etat, changer } = useEtatRail();
  const reduit = etat === 'reduit';
  const IconeTaille = reduit ? PanelLeftOpen : PanelLeftClose;

  // Escamoté, le rail sort de la page : le focus, qui était sur cette
  // commande, passe au bouton « Menu » qui le rouvre ([[D-482]] §2).
  const masquer = () => {
    flushSync(() => changer('escamote'));
    document.getElementById(ID_BOUTON_ROUVRIR_RAIL)?.focus();
  };

  return (
    <div className="space-y-1 border-t border-rail-border pt-3">
      <button type="button" onClick={() => changer(reduit ? 'deplie' : 'reduit')} className={CLASSE_COMMANDE}>
        {icones && <IconeTaille aria-hidden="true" strokeWidth={TRAIT_ICONE} className="h-[1.1875rem] w-[1.1875rem] shrink-0" />}
        <span className="min-w-0 break-words">{reduit ? AGRANDIR_LE_MENU : REDUIRE_LE_MENU}</span>
      </button>
      <button type="button" onClick={masquer} className={CLASSE_COMMANDE}>
        {icones && <EyeOff aria-hidden="true" strokeWidth={TRAIT_ICONE} className="h-[1.1875rem] w-[1.1875rem] shrink-0" />}
        <span className="min-w-0 break-words">{MASQUER_LE_MENU}</span>
      </button>
    </div>
  );
}

export function CadreRailMonEspace({ children }: { children: ReactNode }) {
  const etat = useEtatMenuPortail();
  const { etat: etatRail } = useEtatRail();
  const pathname = usePathname() ?? '';
  const surLeChemin = !!etat?.token && railSurLeChemin(pathname, etat.token);
  const escamote = etatRail === 'escamote';
  const servi = !!etat?.actif && surLeChemin && !escamote;
  // Tant que la garde n'a pas répondu, la place du rail est réservée, vide : le
  // contenu d'un dossier majeur ne saute plus à son arrivée ([[D-447]] §6,
  // amendement du 2026-11-07). Aucune entrée n'est rendue, fail-closed intact.
  const reserve = !servi && !escamote && !!etat?.gardeEnLecture && surLeChemin;

  // LE CADRE EST TOUJOURS RENDU, et le `main` y garde sa place : la garde se lit
  // après le premier rendu, et un cadre posé à ce moment-là remonterait la page
  // entière (formulaires, lectures). Sans rail, il ne fait qu'étirer le `main`,
  // comme avant.
  return (
    <div className={`flex flex-1 flex-col${servi || reserve ? ' lg:flex-row lg:gap-6 lg:px-6' : ''}`}>
      {reserve ? <div data-testid="reserve-rail" aria-hidden="true" className="hidden w-nav-rail shrink-0 lg:block print:hidden" /> : null}
      {servi && etat?.token ? (
        <ListeMonEspace
          etat={{ ...etat, token: etat.token }}
          forme={formeRail(etatRail === 'reduit' ? 'reduit' : 'deplie')}
          pied={<CommandesRail icones={etat.icones} />}
        />
      ) : null}
      {children}
    </div>
  );
}
