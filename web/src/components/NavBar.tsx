'use client';

import { signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Menu, ChevronDown, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { SidebarRail } from '@/components/ui/SidebarRail';
import { MobileBottomNav } from '@/components/ui/MobileBottomNav';
import { EmpreinteMarque } from '@/components/ui/EmpreinteMarque';
import { TRAIT_ICONE } from '@/components/ui/icone';
import { CLASSES_LIEN_EVITEMENT, ID_CONTENU, LIEN_EVITEMENT_PRATICIEN } from '@/lib/navigation/lienEvitementPraticien';

/** Déplié ou réduit ([[D-486]] §1) : clé inchangée. */
const RAIL_STORAGE_KEY = 'wn-rail-expanded';
/**
 * Escamoté ([[D-486]] §1) : mémorisé sur l'appareil, par rôle, sans donnée ni
 * identifiant patient — la clé ne porte que le rôle, la valeur que `true`.
 */
export const RAIL_ESCAMOTE_STORAGE_KEY = 'wn-rail-escamote-praticien';

function lireStockage(cle: string): string | null {
  try {
    return window.localStorage.getItem(cle);
  } catch {
    return null;
  }
}

function ecrireStockage(cle: string, valeur: string | null) {
  try {
    if (valeur === null) window.localStorage.removeItem(cle);
    else window.localStorage.setItem(cle, valeur);
  } catch {
    // Stockage refusé (navigation privée stricte) : le choix vaut pour la page.
  }
}

interface NavBarProps {
  email: string;
  buildLabel: string;
  children: ReactNode;
}

export function NavBar({ email, buildLabel, children }: NavBarProps) {
  const pathname = usePathname();
  // Étendu PAR DÉFAUT (maquette de référence : rail large avec textes,
  // décision propriétaire 2026-07-22) ; le repli reste un choix mémorisé.
  const [expanded, setExpanded] = useState(true);
  // Trois états du rail ([[D-486]]) : déplié, réduit en icônes, escamoté.
  const [escamote, setEscamote] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const boutonAfficher = useRef<HTMLButtonElement>(null);
  const boutonMasquer = useRef<HTMLButtonElement>(null);
  /** Où rendre le focus après un changement d'état, une fois le DOM à jour. */
  const focusAttendu = useRef<'afficher' | 'masquer' | null>(null);

  useEffect(() => {
    if (lireStockage(RAIL_STORAGE_KEY) === 'false') setExpanded(false);
    if (lireStockage(RAIL_ESCAMOTE_STORAGE_KEY) === 'true') setEscamote(true);
  }, []);

  useEffect(() => {
    setIsDrawerOpen(false);
  }, [pathname]);

  // Le focus était dans le rail (sur « Masquer la navigation ») : il passe à
  // « Afficher la navigation » ; au retour, il revient au pied du rail
  // ([[D-486]] ; artefact Lien, LienShell).
  useEffect(() => {
    if (focusAttendu.current === 'afficher') boutonAfficher.current?.focus();
    if (focusAttendu.current === 'masquer') boutonMasquer.current?.focus();
    focusAttendu.current = null;
  }, [escamote]);

  function toggleExpanded() {
    setExpanded((prev) => {
      const next = !prev;
      ecrireStockage(RAIL_STORAGE_KEY, String(next));
      return next;
    });
  }

  function masquerNavigation() {
    focusAttendu.current = 'afficher';
    ecrireStockage(RAIL_ESCAMOTE_STORAGE_KEY, 'true');
    setEscamote(true);
  }

  function afficherNavigation() {
    focusAttendu.current = 'masquer';
    ecrireStockage(RAIL_ESCAMOTE_STORAGE_KEY, null);
    setEscamote(false);
  }

  return (
    <Dialog.Root open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        {/* Premier arrêt de tabulation de chaque page du tableau de bord
            ([[D-488]] T-16) : il vise le <main id="contenu"> ci-dessous. */}
        <a href={`#${ID_CONTENU}`} className={CLASSES_LIEN_EVITEMENT}>
          {LIEN_EVITEMENT_PRATICIEN}
        </a>
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-surface px-4">
          <Dialog.Trigger asChild>
            <button
              type="button"
              aria-label="Ouvrir la navigation"
              className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-control-border text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring md:flex lg:hidden"
            >
              <Menu aria-hidden="true" size={20} strokeWidth={TRAIT_ICONE} />
            </button>
          </Dialog.Trigger>

          {/* La marque vit dans le rail ; elle ne paraît dans l'en-tête que sur
              tablette, où le rail est en tiroir. */}
          <span className="hidden md:flex lg:hidden">
            <EmpreinteMarque tone="light" size={36} compact />
          </span>

          {/* Rail escamoté : sa commande de réouverture vit dans l'en-tête
              ([[D-484]] §2, [[D-486]] §1 ; texte T-13 de [[D-488]]). */}
          {escamote && (
            <button
              ref={boutonAfficher}
              type="button"
              onClick={afficherNavigation}
              className="hidden h-11 shrink-0 items-center gap-2 rounded-xl border border-control-border px-3 text-sm font-medium text-foreground transition duration-fast ease-lien hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring lg:inline-flex"
            >
              <Menu aria-hidden="true" size={20} strokeWidth={TRAIT_ICONE} />
              Afficher la navigation
            </button>
          )}

          <span className="hidden text-xs font-medium text-muted-foreground lg:inline">{buildLabel}</span>

          {/* Les vues rapides de l'en-tête sont retirées, à toute largeur
              ([[D-484]] §1) : le rail, et au téléphone la barre basse et sa
              feuille, sont les seules navigations globales. */}

          <details className="relative ml-auto">
            <summary className="flex h-11 cursor-pointer list-none items-center gap-1 rounded-full border border-control-border px-3 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring [&::-webkit-details-marker]:hidden">
              Profil
              <ChevronDown aria-hidden="true" size={16} strokeWidth={TRAIT_ICONE} />
            </summary>
            <div className="absolute right-0 z-10 mt-2 w-56 rounded-xl border border-border bg-surface-elevated p-3 shadow-pop">
              <p className="truncate text-sm text-foreground">{email || 'Compte praticien'}</p>
              <p className="text-xs text-muted-foreground">Session active</p>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="mt-3 w-full rounded-lg border border-control-border px-3 py-2 text-left text-sm text-muted-foreground transition hover:border-primary/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                Déconnexion
              </button>
            </div>
          </details>
        </header>

        <div className="mx-auto flex w-full max-w-[1600px] flex-1 gap-6 px-4 py-4 sm:px-6 lg:py-6">
          {/* Escamoté, le rail quitte la page, le parcours clavier et l'arbre
              d'accessibilité (`hidden`) ; la colonne de contenu récupère sa
              place. Il reste monté : ses compteurs ne sont pas relus. */}
          <aside
            id="rail-praticien"
            hidden={escamote}
            className={`hidden shrink-0 flex-col gap-4 transition-[width] duration-panel ease-lien motion-reduce:transition-none lg:sticky lg:top-20 lg:z-30 lg:self-start ${
              escamote ? '' : 'lg:flex'
            } ${expanded ? 'lg:w-[252px]' : 'lg:w-16'}`}
          >
            {/* Nuit pétrole du rail (A5-R3), aplat uni, pleine hauteur sous
                l'en-tête. Déplié, il défile si sa hauteur ne suffit pas (zoom) ;
                réduit, il laisse déborder ses infobulles. */}
            <div
              className={`flex min-h-[calc(100vh-6.5rem)] flex-col rounded-xl border border-rail-border bg-rail ${
                expanded ? 'max-h-[calc(100vh-6.5rem)] overflow-y-auto px-3.5 py-5' : 'p-2.5'
              }`}
            >
              <SidebarRail
                collapsed={!expanded}
                brand
                commandes={[
                  {
                    // T-11 de [[D-488]], inchangé.
                    id: 'repli',
                    libelle: expanded ? 'Réduire la navigation' : 'Étendre la navigation',
                    icone: expanded ? PanelLeftClose : PanelLeftOpen,
                    onClick: toggleExpanded,
                    ariaExpanded: expanded,
                  },
                  {
                    // T-12 de [[D-488]].
                    id: 'escamotage',
                    libelle: 'Masquer la navigation',
                    icone: X,
                    onClick: masquerNavigation,
                    refBouton: boutonMasquer,
                  },
                ]}
              />
            </div>
          </aside>

          <main id={ID_CONTENU} tabIndex={-1} className="min-w-0 flex-1 pb-24 focus:outline-none md:pb-6 lg:pb-8">
            {children}
          </main>
        </div>

        <Dialog.Portal>
          {/* data-theme requis ici : Radix portale vers document.body, hors du
              conteneur [data-theme="praticien"] posé par dashboard/layout.tsx —
              sans cet attribut, les tokens --rail- ne résolvent à rien (--foreground
              reste défini sur :root, donc pas affecté). */}
          <Dialog.Overlay data-theme="praticien" className="fixed inset-0 z-50 hidden bg-foreground/35 md:block lg:hidden" />
          <Dialog.Content
            data-theme="praticien"
            className="fixed inset-y-0 left-0 z-50 hidden h-full w-72 max-w-[80vw] flex-col gap-4 overflow-y-auto border-r border-rail-border bg-rail p-4 shadow-pop focus:outline-none md:flex lg:hidden"
          >
            <Dialog.Description className="sr-only">Panneau de navigation praticien</Dialog.Description>
            <div className="flex items-center justify-between">
              <Dialog.Title className="text-sm font-semibold text-rail-foreground">Navigation</Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Fermer la navigation"
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-rail-border text-rail-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rail-focus-ring"
                >
                  <X aria-hidden="true" size={20} strokeWidth={TRAIT_ICONE} />
                </button>
              </Dialog.Close>
            </div>
            <SidebarRail collapsed={false} onNavigate={() => setIsDrawerOpen(false)} />
          </Dialog.Content>
        </Dialog.Portal>

        <MobileBottomNav />
      </div>
    </Dialog.Root>
  );
}
