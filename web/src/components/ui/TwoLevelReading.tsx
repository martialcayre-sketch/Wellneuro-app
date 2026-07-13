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
}: {
  summary: ReactNode;
  detail: ReactNode;
  defaultExpanded?: boolean;
  label: string;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const detailId = useId();

  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="text-sm text-foreground">{summary}</div>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={detailId}
          onClick={() => setExpanded(prev => !prev)}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          {label}
          <ChevronDown size={14} strokeWidth={2} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
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
