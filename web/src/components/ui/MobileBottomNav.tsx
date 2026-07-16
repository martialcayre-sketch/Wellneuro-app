'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { LayoutDashboard, Users, Sparkles, Settings, MoreHorizontal, X, type LucideIcon } from 'lucide-react';

const primaryItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/dashboard', label: 'Le Fil', icon: LayoutDashboard },
  { href: '/dashboard/patients', label: 'Patients', icon: Users },
  { href: '/dashboard/synthese', label: 'Synthèses', icon: Sparkles },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  useEffect(() => {
    setIsMoreOpen(false);
  }, [pathname]);

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
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className="flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rail-focus-ring"
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                  active ? 'bg-rail-primary text-rail-primary-foreground' : 'bg-rail-muted text-rail-foreground'
                }`}
              >
                <Icon aria-hidden="true" size={18} strokeWidth={2} />
              </span>
              <span className={`text-[11px] font-medium ${active ? 'text-rail-foreground' : 'text-rail-muted-foreground'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}

        <Dialog.Root open={isMoreOpen} onOpenChange={setIsMoreOpen}>
          <Dialog.Trigger asChild>
            <button
              type="button"
              aria-label="Plus"
              className="flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rail-focus-ring"
            >
              <span
                aria-hidden="true"
                className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                  isMoreActive ? 'bg-rail-primary text-rail-primary-foreground' : 'bg-rail-muted text-rail-foreground'
                }`}
              >
                <MoreHorizontal size={18} strokeWidth={2} />
              </span>
              <span className={`text-[11px] font-medium ${isMoreActive ? 'text-rail-foreground' : 'text-rail-muted-foreground'}`}>
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
              className="fixed inset-x-0 bottom-0 z-50 w-full rounded-t-[1.5rem] border-t border-rail-border bg-rail-surface p-4 shadow-xl focus:outline-none md:hidden"
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
                    <X aria-hidden="true" size={20} strokeWidth={2} />
                  </button>
                </Dialog.Close>
              </div>
              <Dialog.Close asChild>
                <Link
                  href="/dashboard/parametres"
                  aria-current={isMoreActive ? 'page' : undefined}
                  className={`group flex min-h-[44px] items-center gap-3 rounded-2xl border px-3 py-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rail-focus-ring ${
                    isMoreActive
                      ? 'border-rail-primary/20 bg-rail-primary/10'
                      : 'border-transparent text-rail-muted-foreground hover:border-rail-border hover:bg-rail hover:text-rail-foreground'
                  }`}
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      isMoreActive ? 'bg-rail-primary text-rail-primary-foreground' : 'bg-rail-muted text-rail-foreground'
                    }`}
                  >
                    <Settings aria-hidden="true" size={20} strokeWidth={2} />
                  </span>
                  <span className={`min-w-0 flex-1 truncate text-sm font-medium ${isMoreActive ? 'text-rail-foreground' : ''}`}>
                    Paramètres
                  </span>
                </Link>
              </Dialog.Close>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </nav>
    </>
  );
}
