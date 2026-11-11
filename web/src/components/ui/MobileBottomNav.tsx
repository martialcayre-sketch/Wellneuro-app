'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { MoreHorizontal, X } from 'lucide-react';
import {
  DESTINATIONS_FEUILLE_PLUS,
  GROUPES_NAVIGATION,
  RACCOURCIS_TELEPHONE,
  destinationsDuGroupe,
  estActive,
} from '@/lib/navigation/destinationsPraticien';
import { TRAIT_ICONE } from '@/components/ui/icone';

// BARRE BASSE ET FEUILLE « PLUS » DU TÉLÉPHONE, DÉRIVÉES DE LA DÉCLARATION
// UNIQUE ([[D-485]] §1). La barre garde ses trois raccourcis ([[D-324]] §5,
// [[D-481]] §5) ; la feuille porte toutes les autres destinations du menu, dans
// son ordre, sous les intertitres des quatre groupes ([[D-487]]). L'audit du
// 2026-09-02 avait trouvé sept destinations sur quatorze sans AUCUN point
// d'entrée sous 768 px, et Q26 (2026-11-02) « Comptes du cabinet » oublié :
// plus aucune liste n'est recopiée à la main.
//
// Entrée active (refonte Lien) : fond `rail-surface` et filet `rail-accent`
// (champagne), comme au rail ; l'ancienne pastille pétrole sur `rail-surface`
// ne lisait qu'à 1,5:1 (revue de COM-0).

export function MobileBottomNav() {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  useEffect(() => {
    setIsMoreOpen(false);
  }, [pathname]);

  const isMoreActive = DESTINATIONS_FEUILLE_PLUS.some((destination) => estActive(destination, pathname));

  const classesCase = (active: boolean) =>
    `flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 transition duration-fast ease-lien focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rail-focus-ring ${
      active
        ? 'bg-rail-surface text-rail-foreground shadow-[inset_0_3px_0_var(--rail-accent)]'
        : 'text-rail-muted-foreground'
    }`;

  return (
    <>
      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-rail-border bg-rail md:hidden"
      >
        {RACCOURCIS_TELEPHONE.map((raccourci) => {
          const active = estActive(raccourci, pathname);
          const Icone = raccourci.icone;

          return (
            <Link
              key={raccourci.href}
              href={raccourci.href}
              aria-current={active ? 'page' : undefined}
              className={classesCase(active)}
            >
              <Icone aria-hidden="true" size={20} strokeWidth={TRAIT_ICONE} />
              <span className={`text-13 ${active ? 'font-semibold' : 'font-medium'}`}>{raccourci.libelle}</span>
            </Link>
          );
        })}

        <Dialog.Root open={isMoreOpen} onOpenChange={setIsMoreOpen}>
          <Dialog.Trigger asChild>
            <button type="button" aria-label="Plus" className={classesCase(isMoreActive)}>
              <MoreHorizontal aria-hidden="true" size={20} strokeWidth={TRAIT_ICONE} />
              <span className={`text-13 ${isMoreActive ? 'font-semibold' : 'font-medium'}`}>
                Plus
              </span>
            </button>
          </Dialog.Trigger>

          <Dialog.Portal>
            {/* data-theme requis ici : Radix portale vers document.body, hors du
                conteneur [data-theme="praticien"] posé par dashboard/layout.tsx —
                sans cet attribut, les tokens --rail- ne résolvent à rien (--foreground
                reste défini sur :root, donc pas affecté). */}
            <Dialog.Overlay data-theme="praticien" className="fixed inset-0 z-50 bg-foreground/35 md:hidden" />
            <Dialog.Content
              data-theme="praticien"
              className="fixed inset-x-0 bottom-0 z-50 w-full rounded-t-[1.5rem] border-t border-rail-border bg-rail p-4 shadow-pop focus:outline-none md:hidden"
            >
              <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-rail-border" aria-hidden="true" />
              <Dialog.Description className="sr-only">Menu de navigation supplémentaire</Dialog.Description>
              <div className="mb-2 flex items-center justify-between">
                <Dialog.Title className="text-sm font-semibold text-rail-foreground">Menu</Dialog.Title>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    aria-label="Fermer le menu"
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-rail-border text-rail-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rail-focus-ring"
                  >
                    <X aria-hidden="true" size={20} strokeWidth={TRAIT_ICONE} />
                  </button>
                </Dialog.Close>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                {GROUPES_NAVIGATION.map((groupe) => {
                  const destinations = destinationsDuGroupe(groupe.id, DESTINATIONS_FEUILLE_PLUS);
                  if (destinations.length === 0) return null;
                  return (
                    <div key={groupe.id}>
                      {/* Intertitres des groupes ([[D-481]] §5 ; T-01 à T-04). */}
                      <p className="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-[.08em] text-rail-muted-foreground">
                        {groupe.intertitre}
                      </p>
                      {destinations.map((destination) => {
                        const actif = estActive(destination, pathname);
                        const Icone = destination.icone;
                        // L'item actif porte sa couleur de texte : <body> n'en
                        // pose aucune, et le libellé héritait du noir par défaut
                        // sur le fond nuit du rail.
                        return (
                          <Dialog.Close asChild key={destination.href}>
                            <Link
                              href={destination.href}
                              aria-current={actif ? 'page' : undefined}
                              className={`mb-1 flex min-h-[44px] items-center gap-3 rounded-[11px] px-3 py-2.5 text-sm transition duration-fast ease-lien focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rail-focus-ring ${
                                actif
                                  ? 'bg-rail-surface font-semibold text-rail-foreground shadow-[inset_3px_0_0_var(--rail-accent)]'
                                  : 'font-medium text-rail-muted-foreground hover:bg-rail-surface hover:text-rail-foreground'
                              }`}
                            >
                              <Icone aria-hidden="true" size={20} strokeWidth={TRAIT_ICONE} className="shrink-0" />
                              {/* Passe à la ligne plutôt que d'être coupé (H43). */}
                              <span className="min-w-0 flex-1 break-words leading-snug">{destination.libelle}</span>
                            </Link>
                          </Dialog.Close>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </nav>
    </>
  );
}
