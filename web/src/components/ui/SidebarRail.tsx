'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Sparkles, Settings, type LucideIcon } from 'lucide-react';

const navigationItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/dashboard', label: 'Accueil', icon: LayoutDashboard },
  { href: '/dashboard/patients', label: 'Patients', icon: Users },
  { href: '/dashboard/synthese', label: 'Synthèse IA', icon: Sparkles },
  { href: '/dashboard/parametres', label: 'Paramètres', icon: Settings },
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
      {navigationItems.map((item) => {
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
    </nav>
  );
}
