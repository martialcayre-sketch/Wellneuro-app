import type { ReactNode } from 'react';

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'critical' | 'info';

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  neutral: 'bg-muted text-muted-foreground',
  success: 'bg-status-success/10 text-status-success',
  warning: 'bg-status-warning/10 text-status-warning',
  danger: 'bg-status-danger/10 text-status-danger',
  // Fond plein : la bande de gravité la plus haute doit se lire plus marquée
  // que `danger`, jamais moins (ticket #1368). Blanc sur #b91c1c : 6,5:1.
  critical: 'bg-status-danger text-white',
  info: 'bg-primary/10 text-primary',
};

/**
 * La variante d'un badge d'interprétation de score, d'après la couleur que
 * porte la grille (`success` < `info` < `warning` < `danger` < `dark`, échelle
 * de `lib/scoring/miniSynthese.ts`). `dark`, la bande la plus haute, tombait
 * en `neutral` — un gris moins marqué que la bande inférieure (ticket #1368).
 * `info` reste neutre : ce lot ne touche que la bande la plus haute.
 */
export function varianteInterpretation(color?: string): BadgeVariant {
  if (color === 'success' || color === 'warning' || color === 'danger') return color;
  if (color === 'dark') return 'critical';
  return 'neutral';
}

export function Badge({
  variant = 'neutral',
  children,
}: {
  variant?: BadgeVariant;
  children: ReactNode;
}) {
  return (
    <span
      // `data-variant` expose la COULEUR aux bancs. Sans lui, un badge ne
      // s'assère que par son texte — et un `variant="success"` codé en dur
      // rendrait « Scoring non vérifié » en vert sans qu'aucun test ne rougisse
      // (relevé en revue adversariale au LOT-02). L'alternative serait d'asserter
      // la classe Tailwind, qui lie les bancs à la feuille de style.
      data-variant={variant}
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${VARIANT_CLASSES[variant]}`}
    >
      {children}
    </span>
  );
}
