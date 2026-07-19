'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Sparkles, FileText, Settings, ShieldCheck, type LucideIcon } from 'lucide-react';

type NavItem = { href: string; label: string; icon: LucideIcon };

/**
 * Rail regroupé (SP-FIL LOT-02, disposition 5.0) : « Le Fil » en tête, puis
 * des groupes étiquetés qui accueilleront les surfaces à venir
 * (correspondance, bibliothèques) sans nouveau remaniement. Routes inchangées.
 */
const groupesNavigation: { etiquette: string | null; items: NavItem[] }[] = [
  { etiquette: null, items: [{ href: '/dashboard', label: 'Le Fil', icon: LayoutDashboard }] },
  { etiquette: 'Suivi', items: [{ href: '/dashboard/patients', label: 'Patients', icon: Users }] },
  {
    etiquette: 'Instruments',
    items: [
      { href: '/dashboard/synthese', label: 'Synthèse IA', icon: Sparkles },
      { href: '/dashboard/documents', label: 'Documents', icon: FileText },
    ],
  },
  {
    etiquette: 'Cabinet',
    items: [
      { href: '/dashboard/droits', label: 'Confiance & droits', icon: ShieldCheck },
      { href: '/dashboard/parametres', label: 'Paramètres', icon: Settings },
    ],
  },
];

interface SidebarRailProps {
  collapsed: boolean;
  onNavigate?: () => void;
}

export function SidebarRail({ collapsed, onNavigate }: SidebarRailProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname?.startsWith(href);

  return (
    <nav className="space-y-1">
      {groupesNavigation.map((groupe, indexGroupe) => (
        <div key={groupe.etiquette ?? 'principal'}>
          {indexGroupe > 0 &&
            (collapsed ? (
              <div className="my-2 border-t border-rail-border" aria-hidden="true" />
            ) : (
              <p className="px-3 pt-4 pb-1 text-[13px] font-semibold uppercase tracking-wide text-rail-muted-foreground">
                {groupe.etiquette}
              </p>
            ))}
          {groupe.items.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                aria-label={collapsed ? item.label : undefined}
                className={`group flex items-center gap-3 rounded-2xl border px-3 py-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rail-focus-ring ${
                  active
                    ? 'border-rail-primary/20 bg-rail-primary/10'
                    : 'border-transparent text-rail-muted-foreground hover:border-rail-border hover:bg-rail hover:text-rail-foreground'
                }`}
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    active ? 'bg-rail-primary text-rail-primary-foreground' : 'bg-rail-muted text-rail-foreground'
                  }`}
                >
                  <Icon aria-hidden="true" size={20} strokeWidth={2} />
                </span>
                {!collapsed && (
                  <span className={`min-w-0 flex-1 truncate text-sm font-medium ${active ? 'text-rail-foreground' : ''}`}>
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
