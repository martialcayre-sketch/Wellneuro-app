'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Bandeau d'onglets « Vues rapides » de la maquette Spirale (topbar de
 * l'Observatoire) : les quatre vues de travail du praticien, en accès direct
 * depuis le header. Le rail reste intégral — ces onglets sont un raccourci,
 * pas une navigation concurrente.
 */
const VUES: { href: string; label: string; exact?: boolean }[] = [
  { href: '/dashboard', label: 'Fil du jour', exact: true },
  { href: '/dashboard/patients', label: 'Trajectoire' },
  { href: '/dashboard/copilote', label: 'Consultation' },
  { href: '/dashboard/correspondance', label: 'Correspondance' },
];

export function VuesRapides() {
  const pathname = usePathname();
  const estActive = (vue: (typeof VUES)[number]) =>
    vue.exact ? pathname === vue.href : (pathname?.startsWith(vue.href) ?? false);

  return (
    <nav aria-label="Vues rapides" className="hidden items-center gap-1 lg:flex">
      {VUES.map(vue => {
        const active = estActive(vue);
        return (
          <Link
            key={vue.href}
            href={vue.href}
            aria-current={active ? 'page' : undefined}
            className={`inline-flex h-9 items-center rounded-full px-3.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
              active
                ? 'bg-primary/10 font-semibold text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {vue.label}
          </Link>
        );
      })}
    </nav>
  );
}
