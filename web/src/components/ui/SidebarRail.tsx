'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigationItems = [
  { href: '/dashboard', label: 'Accueil' },
  { href: '/dashboard/patients', label: 'Patients' },
  { href: '/dashboard/synthese', label: 'Synthèse IA' },
  { href: '/dashboard/parametres', label: 'Paramètres' },
] as const;

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
      {navigationItems.map((item) => {
        const active = isActive(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            aria-label={collapsed ? item.label : undefined}
            className={`group flex items-center gap-3 rounded-2xl border px-3 py-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
              active
                ? 'border-primary/20 bg-primary/10'
                : 'border-transparent text-muted-foreground hover:border-border hover:bg-background hover:text-foreground'
            }`}
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ${
                active ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
              }`}
            >
              {item.label.slice(0, 2).toUpperCase()}
            </span>
            {!collapsed && (
              <span className={`min-w-0 flex-1 truncate text-sm font-medium ${active ? 'text-foreground' : ''}`}>
                {item.label}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
