'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Bandeau d'onglets « Vues rapides » de la maquette Spirale (topbar de
 * l'Observatoire) : les quatre vues de travail du praticien, en accès direct
 * depuis le header. Le rail reste intégral — ces onglets sont un raccourci,
 * pas une navigation concurrente.
 */
const VUES: { href: string; label: string; exact?: boolean; prefixesActifs?: string[] }[] = [
  { href: '/dashboard', label: 'Fil du jour', exact: true },
  // SP-TRAJ LOT-04 : même destination et même nom que l'entrée du rail — la
  // porte d'entrée trajectoire, plus la page héritage (constat de revue #308).
  // Comme dans le rail, une fiche ouverte (/dashboard/patients/…) reste
  // rattachée à la vue trajectoire.
  { href: '/dashboard/trajectoires', label: 'Fiche-trajectoire', prefixesActifs: ['/dashboard/patients/'] },
  { href: '/dashboard/copilote', label: 'Consultation' },
  { href: '/dashboard/correspondance', label: 'Correspondance' },
];

export function VuesRapides() {
  const pathname = usePathname();
  const estActive = (vue: (typeof VUES)[number]) => {
    if (vue.prefixesActifs?.some(prefixe => pathname?.startsWith(prefixe))) return true;
    return vue.exact ? pathname === vue.href : (pathname?.startsWith(vue.href) ?? false);
  };

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
