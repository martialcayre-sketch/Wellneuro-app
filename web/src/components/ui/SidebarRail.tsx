'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  ContactRound,
  Settings,
  ShieldCheck,
  Compass,
  Mail,
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  CalendarDays,
  FlaskConical,
  Lightbulb,
  Pill,
  Tally5,
  type LucideIcon,
} from 'lucide-react';
import type { FilApiResponse } from '@/app/api/praticien/fil/route';
import type { CorrespondanceCompteurApiResponse } from '@/app/api/praticien/correspondance-medecin/recentes/compteur/route';

// Rail en trois groupes depuis D-324 (2026-10-18) : La Spirale (le travail du
// jour), Bibliothèque (un rayon par entrée), Réglages. `badge: 'fil'` affiche
// le compteur RÉEL de cartes du Fil.
//
// Historique : de la maquette « WellNeuro 5.0 — La Spirale » (2026-07-22)
// jusqu'au 2026-10-18, un groupe « Héritage 4.0 — inchangé » rangeait cinq
// surfaces historiques sous l'étiquette « 4.0 », sans décision qui l'ait créé
// ni daté. D-324 l'a retiré : Documents et Synthèse IA quittent le menu
// (pages gardées, ouvertes depuis la fiche, le Fil, la minute d'après et la
// barre du téléphone), l'agenda et l'atelier restent sans étiquette, et
// Biologie fonctionnelle devient le rayon « Analyses biologiques ».
//
// `badge: 'correspondance'` désigne une TÂCHE, pas un historique : le nombre de
// dossiers dont le DERNIER échange consigné est un envoi remontant à plus de
// sept jours — on a écrit, rien n'est revenu ([[D-210]]). Il comptait jusqu'au
// 2026-09-16 les consignations des sept derniers jours, tous sens confondus,
// donc les gestes de son propre lecteur : transcrire une réponse le faisait
// MONTER. Il la fait maintenant descendre. Ce commentaire était resté sur
// l'ancien contrat — constat de revue de la PR #1148, retenu.
//
// Le délai n'est pas fixé ici : il vient du serveur, et l'écran le rapporte.
// Aucun chiffre inventé ; rien en cas d'erreur réseau.
type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  tag?: string;
  badge?: 'fil' | 'correspondance';
  /** 'exact' : actif seulement sur le chemin exact — c'est ce qui désambiguïse
   * « Patients » (la liste, /dashboard/patients) de « Fiche-trajectoire », qui
   * s'allume sur les fiches ouvertes sous ce même préfixe. */
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
      // LE RAYON PATIENTS — le dossier administratif, sorti de l'héritage 4.0
      // où il cohabitait avec l'assignation de questionnaires et les packs.
      // `matiere: 'exact'` : seule la LISTE allume cet item. Les fiches, sous
      // ce même préfixe, allument « Fiche-trajectoire » juste en dessous —
      // c'est la seule paire du rail qui partage un préfixe d'URL.
      { href: '/dashboard/patients', label: 'Patients', icon: ContactRound, matiere: 'exact' },
      // Porte d'entrée trajectoire (SP-TRAJ LOT-04) : la liste orientée
      // trajectoire. L'item reste actif sur les fiches ouvertes depuis elle ;
      // /dashboard/patients exact n'allume que « Patients ».
      {
        href: '/dashboard/trajectoires',
        label: 'Fiche-trajectoire',
        icon: Users,
        prefixesActifs: ['/dashboard/patients/'],
      },
      // Les comptes du cabinet ([[D-385]], J3-cabinet) : près de la porte
      // Trajectoires, même population. La page compte, elle n'ouvre aucun dossier.
      { href: '/dashboard/cabinet', label: 'Comptes du cabinet', icon: Tally5 },
      { href: '/dashboard/copilote', label: 'Consultation copilote', icon: Compass },
      // L'agenda reste une entrée du menu, sans encart à l'accueil (D-324 §2) :
      // aucun rendez-vous n'était saisi en production le 2026-10-18.
      { href: '/dashboard/agenda', label: 'Agenda & consultations', icon: CalendarDays },
      { href: '/dashboard/correspondance', label: 'Correspondance', icon: Mail, badge: 'correspondance' },
      // La file des signalements d'effets indésirables et des demandes de droits
      // est du travail du jour, pas un réglage (D-324 §3).
      { href: '/dashboard/droits', label: 'Confiance & droits', icon: ShieldCheck },
    ],
  },
  {
    // CHAQUE RAYON A SON ENTRÉE (D-324 §4) : la page unique empilait des
    // onglets en tête et des rayons plus bas, et se lisait mal. « Questionnaires »
    // garde le catalogue, l'aperçu, la file d'envoi ET les assignations et packs ;
    // « Connaissances » est la lecture du corpus (D-310 §2), et l'atelier qui le
    // signe vient juste après (D-310 §1).
    etiquette: 'Bibliothèque',
    items: [
      { href: '/dashboard/bibliotheque/questionnaires', label: 'Questionnaires', icon: ClipboardList },
      { href: '/dashboard/bibliotheque/fiches-conseils', label: 'Fiches conseils', icon: Lightbulb },
      { href: '/dashboard/bibliotheque/complements', label: 'Compléments alimentaires', icon: Pill },
      { href: '/dashboard/bibliotheque/biologie', label: 'Analyses biologiques', icon: FlaskConical },
      { href: '/dashboard/bibliotheque/connaissances', label: 'Connaissances', icon: BookOpen },
      { href: '/dashboard/corpus', label: 'Atelier corpus', icon: ClipboardCheck },
    ],
  },
  {
    etiquette: 'Réglages',
    items: [{ href: '/dashboard/parametres', label: 'Paramètres', icon: Settings }],
  },
];

const LIBELLE_FIL_INCOMPLET = 'comptes rendus biologiques à lire non vérifiés';

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
  /**
   * Le Fil a été servi SANS ses comptes rendus biologiques à lire, dont le
   * calcul a échoué ([[D-268]] §6). Le rail le DIT — un rail sans compteur
   * ressemblerait à un Fil vide (contre-revue Codex, #1347).
   */
  const [filIncomplet, setFilIncomplet] = useState(false);
  // Dossiers où l'on a écrit au médecin et où rien n'est revenu — silence en
  // cas d'échec. Le délai vient du serveur : l'écran le dit, il ne le fixe pas.
  const [nbCorrespondance, setNbCorrespondance] = useState<number | null>(null);
  const [delaiAttente, setDelaiAttente] = useState<number | null>(null);
  useEffect(() => {
    let vivant = true;
    fetch('/api/praticien/fil')
      .then(r => r.json())
      .then((d: FilApiResponse) => {
        // Un Fil dont les comptes rendus à lire n'ont pas pu être calculés
        // ([[D-268]] §6) SOUS-COMPTERAIT : pas de compteur plutôt qu'un faux.
        if (!vivant || d.unavailable) return;
        if (d.lecturesBiologieIndisponibles) setFilIncomplet(true);
        else if (Array.isArray(d.cartes)) setNbCartesFil(d.cartes.length);
      })
      .catch(() => {});
    // Le COMPTEUR, pas la liste : le rail n'a jamais affiché les lignes, et les
    // demander faisait résoudre cinq noms de patients à chaque montage.
    fetch('/api/praticien/correspondance-medecin/recentes/compteur')
      .then(r => r.json())
      .then((d: CorrespondanceCompteurApiResponse) => {
        if (!vivant || d.unavailable) return;
        setNbCorrespondance(d.nbEnAttente);
        setDelaiAttente(d.delaiJours);
      })
      .catch(() => {});
    return () => {
      vivant = false;
    };
  }, []);

  const compteurBadge = (badge: NavItem['badge']): number | null =>
    badge === 'fil' ? nbCartesFil : badge === 'correspondance' ? nbCorrespondance : null;

  /**
   * UN NOMBRE NU N'EST PAS UN SIGNAL. La pastille ne portait aucun énoncé : ni
   * à l'œil, ni pour un lecteur d'écran, qui annonçait « Correspondance 2 ».
   * Ce libellé dit ce que le chiffre compte, et le délai vient du serveur —
   * l'écran le rapporte, il ne le fixe pas.
   */
  const libelleCompteur = (badge: NavItem['badge'], compteur: number): string => {
    if (badge === 'fil') return `${compteur} carte${compteur > 1 ? 's' : ''} au Fil du jour`;
    const dossiers = `${compteur} dossier${compteur > 1 ? 's' : ''}`;
    return delaiAttente === null
      ? `${dossiers} sans réponse du médecin`
      : `${dossiers} sans réponse du médecin depuis plus de ${delaiAttente} jours`;
  };

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
              <span className="block truncate font-display text-lg font-bold text-rail-foreground">Wellneuro</span>
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
                aria-label={
                  collapsed
                    ? item.badge === 'fil' && filIncomplet
                      ? `${item.label} — ${LIBELLE_FIL_INCOMPLET}`
                      : item.label
                    : undefined
                }
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
                {/* Le libellé passe à la ligne plutôt que d'être coupé : « Compléments
                    alimentaires » (D-324 §4) dépasse les 252 px du rail déplié, et
                    « Compléments aliment… » ne disait plus le rayon (H43). */}
                {!collapsed && <span className="min-w-0 flex-1 break-words leading-snug">{item.label}</span>}
                {item.badge === 'fil' && filIncomplet && (
                  // Le « ! » double le texte, jamais la couleur seule (A5-R1),
                  // et se voit rail réduit comme déplié.
                  <span
                    className="shrink-0 rounded-full border border-rail-accent px-1.5 py-0.5 font-mono text-2xs font-semibold text-rail-accent"
                    title={LIBELLE_FIL_INCOMPLET}
                    data-testid="fil-incomplet"
                  >
                    <span aria-hidden="true">!</span>
                    {!collapsed && <span className="sr-only">{LIBELLE_FIL_INCOMPLET}</span>}
                  </span>
                )}
                {(() => {
                  const compteur = compteurBadge(item.badge);
                  return !collapsed && compteur !== null && compteur > 0 ? (
                    <span
                      className="shrink-0 rounded-full bg-solar-500/[.18] px-2 py-0.5 font-mono text-2xs font-semibold text-rail-accent"
                      title={libelleCompteur(item.badge, compteur)}
                    >
                      <span aria-hidden="true">{compteur}</span>
                      <span className="sr-only">{libelleCompteur(item.badge, compteur)}</span>
                    </span>
                  ) : null;
                })()}
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
