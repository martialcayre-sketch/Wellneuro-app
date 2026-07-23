'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Sparkles,
  FileText,
  Settings,
  ShieldCheck,
  Compass,
  Mail,
  BookOpen,
  ClipboardCheck,
  CalendarDays,
  FlaskConical,
  Layers,
  type LucideIcon,
} from 'lucide-react';
import type { FilApiResponse } from '@/app/api/praticien/fil/route';

// Rail conforme à la maquette de référence « WellNeuro 5.0 — La Spirale »
// (artifact canonique, décision propriétaire 2026-07-22) : trois groupes —
// La Spirale (surfaces 5.0), Héritage 4.0 — inchangé (surfaces historiques,
// tag « 4.0 »), Réglages. `badge: 'fil'` affiche le compteur RÉEL de cartes
// du Fil (aucun chiffre inventé ; rien en cas d'erreur réseau).
type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  tag?: string;
  badge?: 'fil';
  /** 'exact' : actif seulement sur le chemin exact (désambiguïse
   * Fiche-trajectoire ↔ Questionnaires & packs). */
  matiere?: 'exact' | 'prefixe' | 'sous-pages';
  /** Préfixes SUPPLÉMENTAIRES qui activent l'item — ex. « Fiche-trajectoire »
   * reste allumée sur les fiches (/dashboard/patients/…) alors qu'elle pointe
   * vers /dashboard/trajectoires (SP-TRAJ LOT-04). */
  prefixesActifs?: string[];
};

const groupesNavigation: { etiquette: string | null; items: NavItem[] }[] = [
  {
    etiquette: 'La Spirale',
    items: [
      { href: '/dashboard', label: 'Le Fil du jour', icon: LayoutDashboard, matiere: 'exact', badge: 'fil' },
      // Porte d'entrée trajectoire (SP-TRAJ LOT-04) : la liste orientée
      // trajectoire. L'item reste actif sur les fiches ouvertes depuis elle ;
      // /dashboard/patients exact n'allume que « Questionnaires & packs ».
      {
        href: '/dashboard/trajectoires',
        label: 'Fiche-trajectoire',
        icon: Users,
        prefixesActifs: ['/dashboard/patients/'],
      },
      { href: '/dashboard/copilote', label: 'Consultation copilote', icon: Compass },
      { href: '/dashboard/correspondance', label: 'Correspondance', icon: Mail },
    ],
  },
  {
    etiquette: 'Héritage 4.0 — inchangé',
    items: [
      { href: '/dashboard/patients', label: 'Questionnaires & packs', icon: Layers, tag: '4.0', matiere: 'sous-pages' },
      { href: '/dashboard/bibliotheque', label: 'Bibliothèque', icon: BookOpen, tag: '4.0' },
      { href: '/dashboard/documents', label: 'Documents', icon: FileText, tag: '4.0' },
      { href: '/dashboard/synthese', label: 'Synthèse IA', icon: Sparkles, tag: '4.0' },
      { href: '/dashboard/corpus', label: 'Atelier corpus', icon: ClipboardCheck, tag: '4.0' },
      { href: '/dashboard/agenda', label: 'Agenda & consultations', icon: CalendarDays, tag: '4.0' },
      { href: '/dashboard/biologie', label: 'Biologie fonctionnelle', icon: FlaskConical, tag: '4.0' },
    ],
  },
  {
    etiquette: 'Réglages',
    items: [
      { href: '/dashboard/droits', label: 'Confiance & droits', icon: ShieldCheck },
      { href: '/dashboard/parametres', label: 'Paramètres', icon: Settings },
    ],
  },
];

interface SidebarRailProps {
  collapsed: boolean;
  onNavigate?: () => void;
  /** Affiche le bloc de marque en tête (maquette : le brand vit dans le
   * rail). Le tiroir tablette garde son propre titre. */
  brand?: boolean;
}

export function SidebarRail({ collapsed, onNavigate, brand = false }: SidebarRailProps) {
  const pathname = usePathname();
  // Compteur réel du Fil — même API que l'écran ; silence en cas d'échec.
  const [nbCartesFil, setNbCartesFil] = useState<number | null>(null);
  useEffect(() => {
    let vivant = true;
    fetch('/api/praticien/fil')
      .then(r => r.json())
      .then((d: FilApiResponse) => {
        if (vivant && !d.unavailable && Array.isArray(d.cartes)) setNbCartesFil(d.cartes.length);
      })
      .catch(() => {});
    return () => {
      vivant = false;
    };
  }, []);

  const isActive = (item: NavItem) => {
    if (item.prefixesActifs?.some((prefixe) => pathname?.startsWith(prefixe))) return true;
    if (item.matiere === 'exact') return pathname === item.href;
    if (item.matiere === 'sous-pages') return pathname === item.href;
    if (item.matiere === 'prefixe') return pathname?.startsWith(`${item.href}/`) ?? false;
    return pathname?.startsWith(item.href) ?? false;
  };

  return (
    <nav className="space-y-1">
      {brand && (
        <div className={`flex items-center gap-3 pb-3 ${collapsed ? 'justify-center' : 'px-1'}`}>
          <span
            aria-hidden="true"
            className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] bg-solar-500/[.18] font-display text-sm font-extrabold text-rail-accent"
          >
            WN
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate font-display text-lg font-bold text-rail-foreground">WellNeuro</span>
              <span className="block truncate text-2xs text-rail-muted-foreground">Horizon 5.0</span>
            </span>
          )}
        </div>
      )}
      {groupesNavigation.map((groupe, indexGroupe) => (
        <div key={groupe.etiquette ?? 'principal'}>
          {collapsed ? (
            indexGroupe > 0 && <div className="my-2 border-t border-rail-border" aria-hidden="true" />
          ) : (
            <p className="px-3 pt-4 pb-1 text-xs font-semibold uppercase tracking-[.08em] text-rail-muted-foreground">
              {groupe.etiquette}
            </p>
          )}
          {groupe.items.map(item => {
            const active = isActive(item);
            const Icon = item.icon;

            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                aria-label={collapsed ? item.label : undefined}
                className={`group flex min-h-11 items-center gap-3 rounded-[11px] px-3 py-2.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rail-focus-ring ${
                  collapsed ? 'justify-center' : ''
                } ${
                  active
                    ? 'bg-solar-500/[.12] font-semibold text-rail-foreground shadow-[inset_3px_0_0_var(--rail-accent)]'
                    : item.tag
                      ? 'text-rail-muted-foreground opacity-80 hover:bg-rail-surface hover:text-rail-foreground hover:opacity-100'
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
                {!collapsed && item.badge === 'fil' && nbCartesFil !== null && nbCartesFil > 0 && (
                  <span className="shrink-0 rounded-full bg-solar-500/[.18] px-2 py-0.5 font-mono text-2xs font-semibold text-rail-accent">
                    {nbCartesFil}
                  </span>
                )}
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
