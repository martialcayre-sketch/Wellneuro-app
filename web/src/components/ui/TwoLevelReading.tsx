'use client';

import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

// Mécanisme générique de double niveau de lecture (résumé/détail). Ne connaît
// aucun contenu clinique — le contenu est fourni par l'appelant (cf.
// CONTRATS_UX_P1.md §2).
export function TwoLevelReading({
  summary,
  detail,
  defaultExpanded = false,
  label,
  className = '',
  onOuverture,
}: {
  summary: ReactNode;
  detail: ReactNode;
  defaultExpanded?: boolean;
  label: string;
  /** Classes additives sur la racine (ex. liseré de carte de décision 5.0). */
  className?: string;
  /**
   * Appelé à chaque DÉPLIEMENT, jamais au repli.
   *
   * POURQUOI PAS `onToggle`. Un repli n'est pas une mesure : on ne referme pas
   * un panneau qu'on n'a pas ouvert, et compter les deux ferait un nombre qui
   * ne se rapporte à rien. Ce composant ne sait toujours RIEN du contenu ni de
   * ce qui est compté — il signale un geste, l'appelant décide s'il l'intéresse.
   */
  onOuverture?: () => void;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const detailId = useId();

  return (
    <div className={`rounded-xl border border-border bg-surface ${className}`}>
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="text-sm text-foreground">{summary}</div>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={detailId}
          onClick={() => {
            // L'EFFET EST HORS DU `setState`, ET C'EST OBLIGATOIRE. Un updater
            // doit rester PUR : le mode strict de React les double-invoque en
            // développement, si bien qu'un appel placé dedans compterait deux
            // fois chaque ouverture. Un compteur qui double a l'air de
            // fonctionner, et c'est ce qui le rend dangereux.
            if (!expanded) onOuverture?.();
            setExpanded(prev => !prev);
          }}
          className="flex min-h-11 shrink-0 items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          {label}
          <ChevronDown aria-hidden="true" size={14} strokeWidth={2} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {expanded && (
        <div id={detailId} className="border-t border-border p-4 text-sm text-foreground">
          {detail}
        </div>
      )}
    </div>
  );
}
