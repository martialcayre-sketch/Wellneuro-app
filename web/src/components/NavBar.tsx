'use client';

import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/Badge';

const navigationItems = [
  {
    href: '/dashboard',
    label: 'Accueil',
    description: 'Priorités et activité du jour',
  },
  {
    href: '/dashboard/patients',
    label: 'Patients',
    description: 'Annuaire et fiches patients',
  },
  {
    href: '/dashboard/synthese',
    label: 'Synthèses IA',
    description: 'Bilan et relecture',
  },
  {
    href: '/dashboard/parametres',
    label: 'Paramètres',
    description: 'Compte et modèles',
  },
] as const;

const mobileNavigationItems = [
  {
    href: '/dashboard',
    label: 'Accueil',
  },
  {
    href: '/dashboard/patients',
    label: 'Patients',
  },
  {
    href: '/dashboard/synthese',
    label: 'Synthèses',
  },
] as const;

const moreItems = [
  {
    label: 'Packs',
    hint: 'Disponible dans un lot ultérieur',
  },
  {
    label: 'Équilibre',
    hint: 'Disponible dans un lot ultérieur',
  },
  {
    label: 'Biologie',
    hint: 'Disponible dans un lot ultérieur',
  },
  {
    label: 'Paramètres',
    href: '/dashboard/parametres',
    hint: 'Compte et modèles',
  },
] as const;

const demoPatients = [
  {
    name: 'Sophie Nicola',
    hint: 'Données de démonstration',
  },
  {
    name: 'Jennifer Martin',
    hint: 'Données de démonstration',
  },
  {
    name: 'Michel Dogné',
    hint: 'Données de démonstration',
  },
] as const;

interface NavBarProps {
  email: string;
  buildLabel: string;
  children: ReactNode;
}

export function NavBar({ email, buildLabel, children }: NavBarProps) {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname?.startsWith(href);

  useEffect(() => {
    setIsMoreOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-primary/10 text-sm font-semibold text-primary shadow-sm">
              WN
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-semibold tracking-tight text-foreground">
                  Wellneuro
                </span>
                <Badge variant="neutral">Espace praticien — 3.0</Badge>
                <Badge variant="warning">{buildLabel}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Rail gauche desktop/tablette, commande rapide et accès direct aux priorités du jour.
              </p>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-3 lg:max-w-3xl">
            <label className="relative block">
              <span className="sr-only">Recherche globale</span>
              <input
                type="search"
                placeholder="Rechercher un patient, une synthèse ou un questionnaire"
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 pr-28 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 hidden items-center gap-2 text-xs text-muted-foreground md:flex">
                <Badge variant="neutral">Cmd K</Badge>
              </span>
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
              >
                Priorités
              </Link>
              <Link
                href="/dashboard/patients"
                className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
              >
                Patients
              </Link>
              <Link
                href="/dashboard/synthese"
                className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
              >
                Synthèses IA
              </Link>
              <span className="inline-flex items-center rounded-full border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground">
                {email || 'Compte praticien'}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {demoPatients.map((patient) => (
                <span
                  key={patient.name}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-foreground shadow-sm"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-[11px] font-semibold text-accent">
                    {patient.name
                      .split(' ')
                      .map((part) => part[0])
                      .join('')
                      .slice(0, 2)}
                  </span>
                  <span>{patient.name}</span>
                  <span className="text-xs text-muted-foreground">{patient.hint}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 lg:flex-col lg:items-end lg:justify-start">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{email || 'Compte praticien'}</p>
              <p className="text-xs text-muted-foreground">Session active</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-background px-4 text-sm font-medium text-muted-foreground transition hover:border-primary/30 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1600px] flex-1 gap-6 px-4 py-4 sm:px-6 lg:py-6">
        <aside className="hidden w-72 shrink-0 md:flex md:flex-col md:gap-4 lg:sticky lg:top-28 lg:self-start">
          <nav className="rounded-[1.5rem] border border-border bg-surface p-3 shadow-sm">
            <div className="mb-3 flex items-center justify-between px-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Navigation
              </p>
              <Badge variant="neutral">Rail</Badge>
            </div>
            <div className="space-y-1">
              {navigationItems.map((item) => {
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`group flex items-center gap-3 rounded-2xl border px-3 py-3 transition focus:outline-none focus:ring-2 focus:ring-primary/20 ${active
                      ? 'border-primary/20 bg-primary/10 text-primary'
                      : 'border-transparent text-muted-foreground hover:border-border hover:bg-background hover:text-foreground'
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold ${active
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                      }`}
                    >
                      {item.label.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">{item.label}</span>
                      <span className="block text-xs text-muted-foreground">{item.description}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </nav>

          <section className="rounded-[1.5rem] border border-border bg-surface p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Patients de démonstration
              </p>
              <Badge variant="info">3</Badge>
            </div>
            <div className="space-y-2">
              {demoPatients.map((patient) => (
                <div
                  key={patient.name}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-background px-3 py-3"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {patient.name
                      .split(' ')
                      .map((part) => part[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{patient.name}</p>
                    <p className="text-xs text-muted-foreground">{patient.hint}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <main className="min-w-0 flex-1 pb-28 lg:pb-8">
          {children}
        </main>
      </div>

      <nav className="sticky bottom-0 z-40 border-t border-border bg-surface/98 px-3 py-2 shadow-[0_-12px_36px_rgba(0,0,0,0.12)] md:hidden">
        <div className="mx-auto grid max-w-[720px] grid-cols-4 gap-2">
          {mobileNavigationItems.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-2 text-[11px] font-medium transition focus:outline-none focus:ring-2 focus:ring-primary/20 ${active
                  ? 'border-primary/20 bg-primary/10 text-primary'
                  : 'border-transparent text-muted-foreground'
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-xl text-[10px] font-semibold ${active
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                  }`}
                >
                  {item.label.slice(0, 2).toUpperCase()}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setIsMoreOpen(true)}
            aria-expanded={isMoreOpen}
            aria-controls="mobile-more-sheet"
            className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl border border-transparent px-2 py-2 text-[11px] font-medium text-muted-foreground transition focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-[10px] font-semibold text-foreground">
              PL
            </span>
            <span>Plus</span>
          </button>
        </div>
      </nav>

      {isMoreOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-foreground/35 md:hidden" role="presentation">
          <button
            type="button"
            aria-label="Fermer le menu Plus"
            className="absolute inset-0"
            onClick={() => setIsMoreOpen(false)}
          />
          <section
            id="mobile-more-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-more-title"
            className="relative z-10 w-full rounded-t-[1.75rem] border-t border-border bg-background px-4 pb-6 pt-4 shadow-[0_-20px_48px_rgba(0,0,0,0.2)]"
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted" />
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 id="mobile-more-title" className="text-base font-semibold text-foreground">
                  Plus
                </h2>
                <p className="text-sm text-muted-foreground">
                  Accès rapide aux modules complémentaires.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                className="inline-flex h-10 items-center justify-center rounded-full border border-border bg-surface px-4 text-sm font-medium text-muted-foreground transition hover:text-foreground"
              >
                Fermer
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {moreItems.map((item) => {
                if (!item.href) {
                  return (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.hint}</p>
                      </div>
                      <Badge variant="neutral">À venir</Badge>
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setIsMoreOpen(false)}
                    className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 transition hover:border-primary/30 hover:bg-background"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.hint}</p>
                    </div>
                    <Badge variant="info">Ouvrir</Badge>
                  </Link>
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-surface px-4 text-sm font-medium text-muted-foreground transition hover:text-foreground"
              >
                Déconnexion
              </button>
              <span className="inline-flex h-11 items-center justify-center rounded-2xl border border-dashed border-border px-4 text-center text-xs text-muted-foreground">
                {email || 'Compte praticien'}
              </span>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
