'use client';

import type { ScoreRange } from '@/lib/scoring/ranges';

/**
 * Point sur zones de seuil (A5-R1 « la Spirale ») : une piste dont le fond
 * est teinté selon les zones d'interprétation du référentiel, un point plein
 * posé à la valeur courante, un point creux optionnel à la valeur T0.
 * Les zones proviennent des bornes du catalogue (`lib/scoring/ranges.ts`) —
 * aucun seuil n'est encodé ici. La couleur n'est jamais seule : le statut
 * textuel est porté par l'appelant (badge d'interprétation) et par
 * l'aria-label.
 */
const FOND_ZONE: Record<string, string> = {
  danger: 'rgb(var(--color-status-danger-rgb) / 0.12)',
  warning: 'rgb(var(--color-status-warning-rgb) / 0.12)',
  success: 'rgb(var(--color-status-success-rgb) / 0.12)',
};

export function ScoreZones({
  value,
  max,
  ranges,
  previousValue,
  ariaLabel,
}: {
  value: number;
  max: number;
  ranges?: ScoreRange[] | null;
  previousValue?: number | null;
  ariaLabel: string;
}) {
  if (!(max > 0)) return null;
  const pct = (v: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;

  return (
    <span role="img" aria-label={ariaLabel} className="relative inline-block h-2.5 w-28 shrink-0 align-middle">
      <span className="absolute inset-0 overflow-hidden rounded-full bg-muted">
        {(ranges ?? []).map((r, i) => (
          <span
            key={i}
            className="absolute inset-y-0"
            style={{
              left: pct(r.min),
              width: `calc(${pct(Math.min(r.max, max))} - ${pct(r.min)})`,
              background: FOND_ZONE[r.color ?? ''] ?? 'transparent',
            }}
          />
        ))}
      </span>
      {typeof previousValue === 'number' && (
        <span
          aria-hidden
          className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-muted-foreground bg-surface"
          style={{ left: pct(previousValue) }}
        />
      )}
      <span
        aria-hidden
        className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-foreground shadow-sm"
        style={{ left: pct(value) }}
      />
    </span>
  );
}
