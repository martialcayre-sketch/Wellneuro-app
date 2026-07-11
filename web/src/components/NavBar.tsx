'use client';

import { signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { SidebarRail } from '@/components/ui/SidebarRail';
import { MobileBottomNav } from '@/components/ui/MobileBottomNav';

const RAIL_STORAGE_KEY = 'wn-rail-expanded';

const demoPatients = [
  { name: 'Sophie Nicola' },
  { name: 'Jennifer Martin' },
  { name: 'Michel Dogné' },
] as const;

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2);
}

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
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          aria-expanded={isDrawerOpen}
          aria-controls="wn-rail-drawer"
          aria-label="Ouvrir la navigation"
          className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring md:flex lg:hidden"
        >
          <span aria-hidden="true">☰</span>
        </button>

        <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-primary/10 text-sm font-semibold text-primary lg:flex">
          WN
        </span>

        <span className="hidden text-xs font-medium text-muted-foreground lg:inline">{buildLabel}</span>

        <label className="relative ml-2 max-w-md flex-1">
          <span className="sr-only">Rechercher un patient</span>
          <input
            type="search"
            placeholder="Rechercher un patient…"
            className="w-full rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:border-focus-ring focus-visible:ring-2 focus-visible:ring-focus-ring"
          />
        </label>

        <span className="ml-auto text-lg" aria-hidden="true">
          🔔
        </span>
        <span className="sr-only">Notifications</span>

        <details className="relative">
          <summary className="flex h-11 cursor-pointer list-none items-center gap-1 rounded-full border border-border px-3 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring [&::-webkit-details-marker]:hidden">
            Profil ▾
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
          <div className="rounded-[1.5rem] border border-border bg-surface p-3 shadow-sm">
            <SidebarRail collapsed={!expanded} />
            <button
              type="button"
              onClick={toggleExpanded}
              aria-expanded={expanded}
              aria-label={expanded ? 'Réduire la navigation' : 'Étendre la navigation'}
              className="mt-2 flex h-11 w-11 items-center justify-center rounded-xl border border-border text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              <span aria-hidden="true">{expanded ? '‹' : '›'}</span>
            </button>
          </div>

          {expanded && (
            <section className="rounded-[1.5rem] border border-border bg-surface p-4 shadow-sm">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Patients de démonstration
              </p>
              <div className="space-y-2">
                {demoPatients.map((patient) => (
                  <div
                    key={patient.name}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-background px-3 py-3"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {initials(patient.name)}
                    </div>
                    <p className="truncate text-sm font-medium text-foreground">{patient.name}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </aside>

        <main className="min-w-0 flex-1 pb-24 md:pb-6 lg:pb-8">{children}</main>
      </div>

      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 hidden md:flex lg:hidden" role="presentation">
          <button
            type="button"
            aria-label="Fermer la navigation"
            className="absolute inset-0 bg-foreground/35"
            onClick={() => setIsDrawerOpen(false)}
          />
          <section
            id="wn-rail-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wn-rail-drawer-title"
            className="relative z-10 flex h-full w-72 max-w-[80vw] flex-col gap-4 border-r border-border bg-surface-elevated p-4 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h2 id="wn-rail-drawer-title" className="text-sm font-semibold text-foreground">
                Navigation
              </h2>
              <button
                type="button"
                aria-label="Fermer la navigation"
                onClick={() => setIsDrawerOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-border text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <span aria-hidden="true">✕</span>
              </button>
            </div>
            <SidebarRail collapsed={false} onNavigate={() => setIsDrawerOpen(false)} />
          </section>
        </div>
      )}

      <MobileBottomNav />
    </div>
  );
}
