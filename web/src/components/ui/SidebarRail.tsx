'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Sparkles, FileText, Settings, ShieldCheck, Compass, Mail, BookOpen, ClipboardCheck, CalendarDays, FlaskConical, type LucideIcon } from 'lucide-react';

// `tag` : marqueur discret façon maquette (.badge-soon) — code de campagne ou
// « différé » sur les écrans réservés. Jamais porteur seul : l'écran cible
// affiche la bannière détaillée.
type NavItem = { href: string; label: string; icon: LucideIcon; tag?: string };

/**
 * Rail regroupé (SP-FIL LOT-02, disposition 5.0) : « Le Fil » en tête, puis
 * des groupes étiquetés. Les écrans réservés (correspondance, bibliothèque,
 * agenda, biologie) pointent vers des pages statiques qui fixent l'intention
 * (maquettes 4.0/5.0) — routes réelles, contenu différé.
 */
const groupesNavigation: { etiquette: string | null; items: NavItem[] }[] = [
  { etiquette: null, items: [{ href: '/dashboard', label: 'Le Fil', icon: LayoutDashboard }] },
  {
    etiquette: 'Suivi',
    items: [
      // Wording maquette 5.0 : la fiche patient est une fiche-trajectoire.
      { href: '/dashboard/patients', label: 'Fiches-trajectoires', icon: Users },
      { href: '/dashboard/copilote', label: 'Consultation copilote', icon: Compass },
      { href: '/dashboard/correspondance', label: 'Correspondance', icon: Mail, tag: 'C3' },
    ],
  },
  {
    etiquette: 'Instruments',
    items: [
      { href: '/dashboard/synthese', label: 'Synthèse IA', icon: Sparkles },
      { href: '/dashboard/documents', label: 'Documents', icon: FileText },
      { href: '/dashboard/bibliotheque', label: 'Bibliothèque', icon: BookOpen, tag: 'C4' },
      { href: '/dashboard/corpus', label: 'Atelier corpus', icon: ClipboardCheck },
    ],
  },
  {
    etiquette: 'À venir',
    items: [
      { href: '/dashboard/agenda', label: 'Agenda & consultations', icon: CalendarDays, tag: 'différé' },
      { href: '/dashboard/biologie', label: 'Biologie fonctionnelle', icon: FlaskConical, tag: 'différé' },
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
  /** Affiche le bloc de marque en tête (maquette cible : le brand vit dans le
   * rail, pas dans le header). Le tiroir tablette garde son propre titre. */
  brand?: boolean;
}

export function SidebarRail({ collapsed, onNavigate, brand = false }: SidebarRailProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname?.startsWith(href);

  return (
    <nav className="space-y-1">
      {brand && (
        <div className={`flex items-center gap-3 pb-3 ${collapsed ? 'justify-center' : 'px-1'}`}>
          {/* Glyphe WN solaire (maquette : 34px, radius 9px, fond solaire .18). */}
          <span
            aria-hidden="true"
            className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] bg-solar-500/[.18] font-display text-sm font-extrabold text-rail-accent"
          >
            WN
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate font-display text-lg font-bold text-rail-foreground">WellNeuro</span>
              <span className="block truncate text-2xs text-rail-muted-foreground">Espace praticien</span>
            </span>
          )}
        </div>
      )}
      {groupesNavigation.map((groupe, indexGroupe) => (
        <div key={groupe.etiquette ?? 'principal'}>
          {indexGroupe > 0 &&
            (collapsed ? (
              <div className="my-2 border-t border-rail-border" aria-hidden="true" />
            ) : (
              <p className="px-3 pt-4 pb-1 text-xs font-semibold uppercase tracking-[.08em] text-rail-muted-foreground">
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
                className={`group flex min-h-11 items-center gap-3 rounded-[11px] px-3 py-2.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rail-focus-ring ${
                  collapsed ? 'justify-center' : ''
                } ${
                  active
                    ? 'bg-solar-500/[.12] font-semibold text-rail-foreground shadow-[inset_3px_0_0_var(--rail-accent)]'
                    : 'text-rail-muted-foreground hover:bg-rail-surface hover:text-rail-foreground'
                }`}
              >
                <Icon
                  aria-hidden="true"
                  size={19}
                  strokeWidth={2}
                  className={`shrink-0 ${active ? '' : 'opacity-85'}`}
                />
                {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                {!collapsed && item.tag && (
                  <span className="shrink-0 rounded-md border border-rail-border px-1.5 py-0.5 text-2xs text-rail-muted-foreground">
                    {item.tag}
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
