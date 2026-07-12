'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const primaryItems = [
  { href: '/dashboard', label: 'Accueil', abbr: 'AC' },
  { href: '/dashboard/patients', label: 'Patients', abbr: 'PT' },
  { href: '/dashboard/synthese', label: 'Synthèses', abbr: 'SY' },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);
  const settingsLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    setIsMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isMoreOpen) settingsLinkRef.current?.focus();
  }, [isMoreOpen]);

  useEffect(() => {
    if (!isMoreOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeMore();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMoreOpen]);

  function closeMore() {
    setIsMoreOpen(false);
    moreTriggerRef.current?.focus();
  }

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname?.startsWith(href);
  const isMoreActive = pathname?.startsWith('/dashboard/parametres') ?? false;

  return (
    <>
      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-rail-border bg-rail-surface/95 backdrop-blur supports-[backdrop-filter]:bg-rail-surface/85 md:hidden"
      >
        {primaryItems.map((item) => {
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className="flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rail-focus-ring"
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-semibold ${
                  active ? 'bg-rail-primary text-rail-primary-foreground' : 'bg-rail-muted text-rail-foreground'
                }`}
              >
                {item.abbr}
              </span>
              <span className={`text-[11px] font-medium ${active ? 'text-rail-foreground' : 'text-rail-muted-foreground'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}

        <button
          type="button"
          ref={moreTriggerRef}
          onClick={() => setIsMoreOpen(true)}
          aria-expanded={isMoreOpen}
          aria-controls="wn-more-sheet"
          aria-label="Plus"
          className="flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rail-focus-ring"
        >
          <span
            aria-hidden="true"
            className={`flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-semibold ${
              isMoreActive ? 'bg-rail-primary text-rail-primary-foreground' : 'bg-rail-muted text-rail-foreground'
            }`}
          >
            •••
          </span>
          <span className={`text-[11px] font-medium ${isMoreActive ? 'text-rail-foreground' : 'text-rail-muted-foreground'}`}>
            Plus
          </span>
        </button>
      </nav>

      {isMoreOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:hidden" role="presentation">
          <button
            type="button"
            aria-label="Fermer le menu"
            className="absolute inset-0 bg-foreground/35"
            onClick={closeMore}
          />
          <section
            id="wn-more-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wn-more-sheet-title"
            className="relative z-10 w-full rounded-t-[1.5rem] border-t border-rail-border bg-rail-surface p-4 shadow-xl"
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-rail-border" aria-hidden="true" />
            <div className="mb-2 flex items-center justify-between">
              <h2 id="wn-more-sheet-title" className="text-sm font-semibold text-rail-foreground">
                Menu
              </h2>
              <button
                type="button"
                aria-label="Fermer le menu"
                onClick={closeMore}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-rail-border text-rail-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rail-focus-ring"
              >
                <span aria-hidden="true">✕</span>
              </button>
            </div>
            <Link
              ref={settingsLinkRef}
              href="/dashboard/parametres"
              onClick={closeMore}
              aria-current={isMoreActive ? 'page' : undefined}
              className={`group flex min-h-[44px] items-center gap-3 rounded-2xl border px-3 py-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rail-focus-ring ${
                isMoreActive
                  ? 'border-rail-primary/20 bg-rail-primary/10'
                  : 'border-transparent text-rail-muted-foreground hover:border-rail-border hover:bg-rail hover:text-rail-foreground'
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ${
                  isMoreActive ? 'bg-rail-primary text-rail-primary-foreground' : 'bg-rail-muted text-rail-foreground'
                }`}
              >
                PM
              </span>
              <span className={`min-w-0 flex-1 truncate text-sm font-medium ${isMoreActive ? 'text-rail-foreground' : ''}`}>
                Paramètres
              </span>
            </Link>
          </section>
        </div>
      )}
    </>
  );
}
