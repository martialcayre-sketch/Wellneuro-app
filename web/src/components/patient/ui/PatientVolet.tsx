import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { TRAIT_ICONE } from '@/components/ui/icone';

// Volet du portail patient : le `<details>` natif reste dessous (clavier,
// restitution et dépliage sans JavaScript), habillé comme l'accordéon de la
// planche validée (prototypes PAT-3 à PAT-6) — cadre de 14 px, en-tête de
// 48 px en graisse 600, chevron à droite qui suit l'ouverture. C'est la forme
// du volet « Mon accompagnement » du hub, généralisée par PAT-7k (arbitrage
// F5 a du 2026-11-21, liste commune 20261121-1633-d) aux volets des
// conditions, des choix (U39) et des sections secondaires du hub (U10).
export function PatientVolet({
  titre,
  open,
  children,
  corpsClassName = 'px-4 pb-4',
}: {
  /** Contenu de l'en-tête ; le chevron s'ajoute à droite. */
  titre: ReactNode;
  /** Ouverture initiale (attribut natif, repris tel quel). */
  open?: boolean;
  children: ReactNode;
  corpsClassName?: string;
}) {
  return (
    <details open={open} className="group rounded border border-border bg-surface">
      <summary className="flex min-h-12 cursor-pointer select-none list-none items-center justify-between gap-4 rounded px-4 py-3 text-sm font-semibold text-foreground [overflow-wrap:anywhere] max-[319px]:hyphens-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 grow">{titre}</span>
        <ChevronDown
          aria-hidden="true"
          size={18}
          strokeWidth={TRAIT_ICONE}
          className="shrink-0 text-primary transition-transform duration-reveal ease-lien group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <div className={corpsClassName}>{children}</div>
    </details>
  );
}
