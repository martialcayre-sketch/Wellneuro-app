'use client';

import { signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Menu, ChevronDown, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { SidebarRail } from '@/components/ui/SidebarRail';
import { MobileBottomNav } from '@/components/ui/MobileBottomNav';

const RAIL_STORAGE_KEY = 'wn-rail-expanded';

interface NavBarProps {
  email: string;
  buildLabel: string;
  children: ReactNode;
}

export function NavBar({ email, buildLabel, children }: NavBarProps) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(RAIL_STORAGE_KEY);
    if (stored === 'true') setExpanded(true);
  }, []);

  useEffect(() => {
    setIsDrawerOpen(false);
  }, [pathname]);

  function toggleExpanded() {
    setExpanded((prev) => {
      const next = !prev;
      window.localStorage.setItem(RAIL_STORAGE_KEY, String(next));
      return next;
    });
  }

  return (
    <Dialog.Root open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
          <Dialog.Trigger asChild>
            <button
              type="button"
              aria-label="Ouvrir la navigation"
              className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring md:flex lg:hidden"
            >
              <Menu aria-hidden="true" size={20} strokeWidth={2} />
            </button>
          </Dialog.Trigger>

          <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-primary/10 text-sm font-semibold text-primary lg:flex">
            WN
          </span>

          <span className="hidden text-xs font-medium text-muted-foreground lg:inline">{buildLabel}</span>

          <details className="relative ml-auto">
            <summary className="flex h-11 cursor-pointer list-none items-center gap-1 rounded-full border border-border px-3 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring [&::-webkit-details-marker]:hidden">
              Profil
              <ChevronDown aria-hidden="true" size={16} strokeWidth={2} />
            </summary>
            <div className="absolute right-0 z-10 mt-2 w-56 rounded-xl border border-border bg-surface-elevated p-3 shadow-lg">
              <p className="truncate text-sm text-foreground">{email || 'Compte praticien'}</p>
              <p className="text-xs text-muted-foreground">Session active</p>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="mt-3 w-full rounded-lg border border-border px-3 py-2 text-left text-sm text-muted-foreground transition hover:border-primary/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                Déconnexion
              </button>
            </div>
          </details>
        </header>

        <div className="mx-auto flex w-full max-w-[1600px] flex-1 gap-6 px-4 py-4 sm:px-6 lg:py-6">
          <aside
            className={`hidden shrink-0 flex-col gap-4 transition-[width] duration-200 ease-in-out lg:flex lg:sticky lg:top-20 lg:self-start ${
              expanded ? 'lg:w-64' : 'lg:w-16'
            }`}
          >
            <div className="rounded-[1.5rem] border border-rail-border bg-rail-surface p-3 shadow-sm">
              <SidebarRail collapsed={!expanded} />
              <button
                type="button"
                onClick={toggleExpanded}
                aria-expanded={expanded}
                aria-label={expanded ? 'Réduire la navigation' : 'Étendre la navigation'}
                className="mt-2 flex h-11 w-11 items-center justify-center rounded-xl border border-rail-border text-rail-muted-foreground transition hover:text-rail-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rail-focus-ring"
              >
                {expanded ? (
                  <PanelLeftClose aria-hidden="true" size={20} strokeWidth={2} />
                ) : (
                  <PanelLeftOpen aria-hidden="true" size={20} strokeWidth={2} />
                )}
              </button>
            </div>
          </aside>

          <main className="min-w-0 flex-1 pb-24 md:pb-6 lg:pb-8">{children}</main>
        </div>

        <Dialog.Portal>
          {/* data-theme requis ici : Radix portale vers document.body, hors du
              conteneur [data-theme="praticien"] posé par dashboard/layout.tsx —
              sans cet attribut, les tokens --rail- ne résolvent à rien (--foreground
              reste défini sur :root, donc pas affecté). */}
          <Dialog.Overlay data-theme="praticien" className="fixed inset-0 z-50 hidden bg-foreground/35 md:block lg:hidden" />
          <Dialog.Content
            data-theme="praticien"
            className="fixed inset-y-0 left-0 z-50 hidden h-full w-72 max-w-[80vw] flex-col gap-4 border-r border-rail-border bg-rail-surface p-4 shadow-xl focus:outline-none md:flex lg:hidden"
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
                  <X aria-hidden="true" size={20} strokeWidth={2} />
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
